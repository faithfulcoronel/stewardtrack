import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { LicensingService } from '@/services/LicensingService';
import type { FeatureOnboardingOrchestratorService } from '@/services/FeatureOnboardingOrchestratorService';
import type { TenantService } from '@/services/TenantService';
import type { SettingService } from '@/services/SettingService';
import type { XenPlatformService } from '@/services/XenPlatformService';
import type { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';
import { seedDefaultRBAC, assignTenantAdminRole } from '@/lib/tenant/seedDefaultRBAC';
import { initializeFeaturePlugins } from '@/lib/onboarding/plugins';
import { renderTenantSubscriptionWelcomeEmail } from '@/emails/service/EmailTemplateService';

// Re-export types for convenience
export type { PublicProductOffering } from '@/repositories/tenant.repository';

export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  churchName: string;
  firstName: string;
  lastName: string;
  offeringId: string;
  denomination?: string;
  contactNumber?: string;
  address?: string;
}

export interface RegistrationResult {
  success: true;
  userId: string;
  tenantId: string;
  subdomain: string;
  message: string;
}

export interface RegistrationError {
  success: false;
  error: string;
}

/**
 * RegistrationService
 *
 * Orchestrates the complete tenant and user registration flow:
 * 1. Validates input data
 * 2. Creates Supabase auth user
 * 3. Creates tenant record with subscription details
 * 4. Generates encryption key for tenant
 * 5. Creates tenant-user relationship
 * 6. Seeds default RBAC roles
 * 7. Assigns tenant admin role
 * 8. Syncs subscription features (grants features, deploys permissions, creates role assignments)
 * 9. Executes feature onboarding plugins (seeds preset data)
 *
 * Handles rollback/cleanup on errors.
 */
@injectable()
export class RegistrationService {
  constructor(
    @inject(TYPES.IAuthRepository) private authRepository: IAuthRepository,
    @inject(TYPES.ITenantRepository) private tenantRepository: ITenantRepository,
    @inject(TYPES.LicensingService) private licensingService: LicensingService,
    @inject(TYPES.EncryptionKeyManager) private encryptionKeyManager: EncryptionKeyManager,
    @inject(TYPES.FeatureOnboardingOrchestratorService) private featureOnboardingOrchestrator: FeatureOnboardingOrchestratorService,
    @inject(TYPES.TenantService) private tenantService: TenantService,
    @inject(TYPES.SettingService) private settingService: SettingService,
    @inject(TYPES.XenPlatformService) private xenPlatformService: XenPlatformService
  ) {
    // Initialize feature onboarding plugins on first use
    initializeFeaturePlugins();
  }

  /**
   * Validate registration data
   */
  private validateRegistrationData(data: RegistrationData): { valid: true } | { valid: false; error: string } {
    const { email, password, confirmPassword, churchName, firstName, lastName, offeringId } = data;

    // Check required fields
    if (!email || !password || !churchName || !firstName || !lastName || !offeringId) {
      return { valid: false, error: 'Missing required fields' };
    }

    // Validate password match
    if (password !== confirmPassword) {
      return { valid: false, error: 'Passwords do not match' };
    }

    return { valid: true };
  }

  /**
   * Generate unique subdomain from church name
   */
  private async generateUniqueSubdomain(churchName: string): Promise<string> {
    // Generate base subdomain from church name
    const baseSubdomain = churchName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);

    // Check if subdomain exists
    const exists = await this.tenantRepository.checkSubdomainExists(baseSubdomain);

    if (!exists) {
      return baseSubdomain;
    }

    // Append random suffix if subdomain exists
    return `${baseSubdomain}-${Math.floor(Math.random() * 10000)}`;
  }

  /**
   * Register new tenant and user
   */
  async register(data: RegistrationData): Promise<RegistrationResult | RegistrationError> {
    let userId: string | null = null;
    let tenantId: string | null = null;

    try {
      // ===== STEP 1: Validate input =====
      const validation = this.validateRegistrationData(data);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      const { email, password, churchName, firstName, lastName, offeringId, denomination, contactNumber, address } = data;

      // ===== STEP 2: Create auth user =====
      const authResponse = await this.authRepository.signUp(email, password, {
        first_name: firstName,
        last_name: lastName,
      });

      if (authResponse.error) {
        throw new Error(`Authentication error: ${authResponse.error.message}`);
      }

      if (!authResponse.data.user) {
        throw new Error('Failed to create user');
      }

      userId = authResponse.data.user.id;

      // ===== STEP 3: Get offering details =====
      const offering = await this.tenantRepository.getPublicProductOffering(offeringId);

      if (!offering) {
        throw new Error('Selected product offering not found');
      }

      // ===== STEP 4: Generate unique subdomain =====
      const subdomain = await this.generateUniqueSubdomain(churchName);

      // ===== STEP 5: Create tenant =====
      // For trial offerings, get trial duration from metadata (default 14 days)
      const isTrial = offering.offering_type === 'trial';
      const trialDays: number = isTrial
        ? (typeof offering.metadata?.trial_days === 'number' ? offering.metadata.trial_days : 14)
        : 0;
      const trialEndDate = isTrial
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const tenant = await this.tenantRepository.createTenantForRegistration({
        name: churchName,
        subdomain,
        subscription_tier: offering.tier,
        subscription_status: isTrial ? 'trial' : 'active',
        subscription_offering_id: offeringId,
        subscription_end_date: trialEndDate,
        status: 'active',
        created_by: userId,
        denomination: denomination || null,
        contact_number: contactNumber || null,
        address: address || null,
        email: email, // Store the admin's email as the tenant contact email
      });

      tenantId = tenant.id;

      // ===== STEP 6: Generate encryption key for tenant =====
      try {
        if (!tenantId) {
          throw new Error('Tenant ID is required for encryption key generation');
        }

        await this.encryptionKeyManager.generateTenantKey(tenantId);
        console.log(`Generated encryption key for tenant ${tenantId}`);
      } catch (error) {
        console.error('Failed to generate encryption key:', error);
        // Critical error - tenant won't be able to encrypt PII
        throw new Error('Failed to initialize tenant encryption');
      }

      // ===== STEP 7: Create tenant-user relationship =====
      try {
        await this.tenantRepository.createTenantUserRelationship({
          tenant_id: tenantId,
          user_id: userId,
          role: 'admin',
          admin_role: 'tenant_admin',
          created_by: userId,
        });
      } catch (error) {
        console.error('Failed to create tenant_users record:', error);
        // Non-fatal - continue but log error
      }

      // ===== STEP 8: Seed default RBAC roles =====
      try {
        await seedDefaultRBAC(tenantId, offering.tier);
      } catch (error) {
        console.error('Failed to seed default RBAC:', error);
        // Non-fatal - continue
      }

      // ===== STEP 9: Assign tenant admin role =====
      try {
        await assignTenantAdminRole(userId, tenantId);
      } catch (error) {
        console.error('Failed to assign tenant admin role:', error);
        // Non-fatal - continue
      }

      // ===== STEP 10: Sync subscription features (async) =====
      // Uses syncTenantSubscriptionFeatures which handles:
      // - Feature grants from the product offering
      // - Permission deployment from licensed features
      // - Role creation and role assignments
      // OPTIMIZATION: Run asynchronously to speed up registration
      // The user can start using the app immediately while features are being synced
      // The tenant admin role already has full access, so this is not blocking
      // NOTE: Member profile creation is handled in admin layout on first access
      // XENPLATFORM: Also provisions Xendit sub-account for donation collection
      this.syncFeaturesAsync(tenantId, offering.tier, offeringId, userId, churchName, email);

      // NOTE: Steps 10 & 11 now run in background. User gets immediate access.
      // - Feature sync: Runs async, handles features + permissions + role assignments
      // - Feature onboarding plugins: Runs async, takes 5-15 seconds
      // Both are non-blocking and non-fatal to registration success.

      // ===== STEP 11: Send welcome email (async) =====
      this.sendWelcomeEmailAsync({
        email,
        firstName,
        tenantName: churchName,
        subscriptionTier: offering.tier,
        isTrial,
        trialDays,
      });

      // ===== STEP 12: Return success =====
      return {
        success: true,
        userId,
        tenantId,
        subdomain,
        message: 'Registration successful',
      };

    } catch (error) {
      console.error('Registration error:', error);

      // Attempt cleanup if we created records
      await this.cleanup(userId, tenantId);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Sync subscription features and run feature onboarding asynchronously
   * This runs after registration completes to avoid blocking the user
   *
   * Uses syncTenantSubscriptionFeatures which is a comprehensive, idempotent operation that:
   * - Grants features from the product offering
   * - Deploys permissions from licensed features
   * - Creates role assignments
   * - Handles any missing features or permissions
   *
   * Marks setup as complete in the tenants table when finished.
   * NOTE: Member profile creation is handled in admin layout on first access.
   */
  private syncFeaturesAsync(
    tenantId: string,
    tier: string,
    offeringId: string,
    userId: string,
    churchName?: string,
    email?: string
  ): void {
    // Use setImmediate to ensure this runs after the current event loop
    // This allows the registration response to return immediately
    setImmediate(async () => {
      console.log(`[ASYNC] Starting background feature sync for tenant ${tenantId}`);

      // ===== PROVISION XENPLATFORM SUB-ACCOUNT =====
      // Create Xendit sub-account for donation collection (runs in background)
      // This is non-blocking and will retry if it fails
      if (churchName && email) {
        try {
          await this.xenPlatformService.provisionTenantSubAccount(
            tenantId,
            churchName,
            email
          );
          console.log(`[ASYNC] Provisioned Xendit sub-account for tenant ${tenantId}`);
        } catch (error) {
          // Non-fatal - tenant can still use the app, sub-account can be created later
          console.error(`[ASYNC] Failed to provision Xendit sub-account for tenant ${tenantId}:`, error);
        }
      }
      const startTime = Date.now();
      let hasErrors = false;
      let lastError = '';

      try {
        // Sync subscription features (handles feature grants + permission deployment + role assignments)
        const syncResult = await this.licensingService.syncTenantSubscriptionFeatures(tenantId);

        if (syncResult.success) {
          console.log(`[ASYNC] Feature sync completed for tenant ${tenantId}:`, {
            offeringId: syncResult.offering_id,
            offeringTier: syncResult.offering_tier,
            featuresAdded: syncResult.features_added,
            featuresAlreadyGranted: syncResult.features_already_granted,
            permissionsDeployed: syncResult.permissions_deployed,
            permissionsAlreadyExist: syncResult.permissions_already_exist,
            rolesCreated: syncResult.roles_created,
            roleAssignmentsCreated: syncResult.role_assignments_created,
            durationMs: Date.now() - startTime,
          });
        } else {
          console.error(`[ASYNC] Feature sync failed for tenant ${tenantId}:`, syncResult.error);
          hasErrors = true;
          lastError = syncResult.error ?? 'Feature sync failed';
        }
      } catch (error) {
        console.error('[ASYNC] Failed to sync subscription features:', error);
        hasErrors = true;
        lastError = error instanceof Error ? error.message : 'Feature sync error';
        // Non-fatal - tenant still operational
      }

      try {
        // Execute feature onboarding plugins
        const onboardingSummary = await this.featureOnboardingOrchestrator.executePlugins({
          tenantId,
          userId,
          subscriptionTier: tier,
          offeringId,
        });

        console.log(`[ASYNC] Feature onboarding completed for tenant ${tenantId}:`, {
          pluginsExecuted: onboardingSummary.totalPluginsExecuted,
          successful: onboardingSummary.successfulPlugins,
          failed: onboardingSummary.failedPlugins,
          recordsCreated: onboardingSummary.totalRecordsCreated,
          skipped: onboardingSummary.skippedPlugins,
          totalDurationMs: Date.now() - startTime,
        });

        if (onboardingSummary.failedPlugins > 0) {
          console.warn('[ASYNC] Feature onboarding plugin errors:',
            onboardingSummary.results
              .filter(r => !r.result.success)
              .map(r => ({ feature: r.featureCode, error: r.result.message }))
          );
          // Don't mark as error - some plugin failures are acceptable
        }
      } catch (error) {
        console.error('[ASYNC] Failed to execute feature onboarding plugins:', error);
        hasErrors = true;
        lastError = error instanceof Error ? error.message : 'Feature onboarding error';
        // Non-fatal - tenant still operational
      }

      // Mark setup as complete or failed
      try {
        if (hasErrors) {
          await this.tenantService.markSetupFailed(tenantId, lastError);
          console.log(`[ASYNC] Marked setup as failed for tenant ${tenantId}: ${lastError}`);
        } else {
          await this.tenantService.markSetupComplete(tenantId);
          console.log(`[ASYNC] Marked setup as complete for tenant ${tenantId}`);
        }
      } catch (statusError) {
        console.error('[ASYNC] Failed to update setup status:', statusError);
        // Non-fatal - setup still ran
      }

      console.log(`[ASYNC] Background tasks completed for tenant ${tenantId} in ${Date.now() - startTime}ms`);
    });
  }

  /**
   * Get email configuration from system-level settings (tenant_id = NULL).
   * Used for registration emails which do not have tenant context.
   */
  private async getEmailConfiguration(): Promise<{ apiKey: string; fromEmail: string; fromName?: string; replyTo?: string | null } | null> {
    try {
      // Get configuration from system-level settings (tenant_id = NULL)
      const systemConfig = await this.settingService.getSystemEmailConfig();

      if (systemConfig && systemConfig.apiKey && systemConfig.fromEmail) {
        return {
          apiKey: systemConfig.apiKey,
          fromEmail: systemConfig.fromEmail,
          fromName: systemConfig.fromName || undefined,
          replyTo: systemConfig.replyTo,
        };
      }
    } catch (error) {
      console.error('[RegistrationService] Failed to get system email config:', error);
    }

    return null;
  }

  /**
   * Send welcome email to new tenant admin asynchronously.
   * Uses system-level email configuration (tenant_id = NULL) from settings table.
   */
  private sendWelcomeEmailAsync(params: {
    email: string;
    firstName: string;
    tenantName: string;
    subscriptionTier: string;
    isTrial: boolean;
    trialDays: number;
  }): void {
    setImmediate(async () => {
      const { email, firstName, tenantName, subscriptionTier, isTrial, trialDays } = params;

      try {
        const config = await this.getEmailConfiguration();

        if (!config) {
          console.warn('[ASYNC] Email service not configured, skipping welcome email. Super admin must configure integration.email.* settings with tenant_id = NULL.');
          return;
        }

        const { apiKey, fromEmail, fromName, replyTo } = config;

        // Render the email template
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://stewardtrack.com'}/admin`;
        const htmlBody = await renderTenantSubscriptionWelcomeEmail({
          adminName: firstName,
          tenantName,
          subscriptionTier,
          isTrial,
          trialDays: isTrial ? trialDays : undefined,
          dashboardUrl,
        });

        // Build the "from" field with optional display name
        const fromField = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

        // Build email payload
        const emailPayload: Record<string, unknown> = {
          from: fromField,
          to: email,
          subject: `Welcome to StewardTrack, ${tenantName}!`,
          html: htmlBody,
        };

        // Add reply-to if configured
        if (replyTo) {
          emailPayload.reply_to = replyTo;
        }

        // Send via Resend API
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[ASYNC] Failed to send welcome email: ${errorText}`);
          return;
        }

        const result = await response.json();
        console.log(`[ASYNC] Welcome email sent successfully to ${email}, messageId: ${result.id}`);
      } catch (error) {
        console.error('[ASYNC] Error sending welcome email:', error);
        // Non-fatal - registration already succeeded
      }
    });
  }

  /**
   * Cleanup tenant and user records on registration failure.
   *
   * Performs comprehensive rollback of all registration artifacts via the tenant repository:
   * 1. User roles (user_roles table)
   * 2. Role permissions (role_permissions table for tenant-scoped roles)
   * 3. Roles (roles table for tenant-scoped roles)
   * 4. Permissions (permissions table for tenant-scoped permissions)
   * 5. Feature grants (tenant_feature_grants table)
   * 6. Encryption keys (tenant_encryption_keys table)
   * 7. Tenant-user relationships (tenant_users table)
   * 8. Tenant record (tenants table)
   * 9. Auth user (Supabase auth.users)
   */
  private async cleanup(userId: string | null, tenantId: string | null): Promise<void> {
    console.log(`[Registration Cleanup] Starting cleanup for userId=${userId}, tenantId=${tenantId}`);

    try {
      // Clean up all tenant-related records via repository
      if (tenantId) {
        const cleanupResult = await this.tenantRepository.deleteAllTenantDataForCleanup(tenantId);

        console.log(`[Registration Cleanup] Tenant data cleanup:`, {
          success: cleanupResult.success,
          deletedRecords: cleanupResult.deletedRecords,
          errors: cleanupResult.errors,
        });
      }

      // Clean up auth user (do this last as it's in a separate system)
      if (userId) {
        const { error: authDeleteError } = await this.authRepository.deleteUser(userId);

        if (authDeleteError) {
          console.error(`[Registration Cleanup] Failed to delete auth user: ${authDeleteError.message}`);
        } else {
          console.log(`[Registration Cleanup] Deleted auth user ${userId}`);
        }
      }

    } catch (cleanupError) {
      console.error('[Registration Cleanup] Critical error during cleanup:', cleanupError);
    }
  }
}
