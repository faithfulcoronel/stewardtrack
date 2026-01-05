import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IAuthRepository } from '@/repositories/auth.repository';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { LicensingService } from '@/services/LicensingService';
import type { PermissionDeploymentService } from '@/services/PermissionDeploymentService';
import type { FeatureOnboardingOrchestratorService } from '@/services/FeatureOnboardingOrchestratorService';
import type { EncryptionKeyManager } from '@/lib/encryption/EncryptionKeyManager';
import { seedDefaultRBAC, assignTenantAdminRole } from '@/lib/tenant/seedDefaultRBAC';
import { initializeFeaturePlugins } from '@/lib/onboarding/plugins';

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
 * 6. Provisions license features
 * 7. Seeds default RBAC roles
 * 8. Assigns tenant admin role
 * 9. Deploys permissions from licensed features
 * 10. Executes feature onboarding plugins (seeds preset data)
 *
 * Handles rollback/cleanup on errors.
 */
@injectable()
export class RegistrationService {
  constructor(
    @inject(TYPES.IAuthRepository) private authRepository: IAuthRepository,
    @inject(TYPES.ITenantRepository) private tenantRepository: ITenantRepository,
    @inject(TYPES.LicensingService) private licensingService: LicensingService,
    @inject(TYPES.PermissionDeploymentService) private permissionDeploymentService: PermissionDeploymentService,
    @inject(TYPES.EncryptionKeyManager) private encryptionKeyManager: EncryptionKeyManager,
    @inject(TYPES.FeatureOnboardingOrchestratorService) private featureOnboardingOrchestrator: FeatureOnboardingOrchestratorService
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

      const { email, password, churchName, firstName, lastName, offeringId } = data;

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

      // ===== STEP 8: Provision license features =====
      try {
        await this.licensingService.provisionTenantLicense(tenantId, offeringId);
      } catch (error) {
        console.error('Failed to provision license features:', error);
        // Non-fatal - continue with registration
      }

      // ===== STEP 9: Seed default RBAC roles =====
      try {
        await seedDefaultRBAC(tenantId, offering.tier);
      } catch (error) {
        console.error('Failed to seed default RBAC:', error);
        // Non-fatal - continue
      }

      // ===== STEP 10: Assign tenant admin role =====
      try {
        await assignTenantAdminRole(userId, tenantId);
      } catch (error) {
        console.error('Failed to assign tenant admin role:', error);
        // Non-fatal - continue
      }

      // ===== STEP 11: Deploy permissions from licensed features =====
      // OPTIMIZATION: Run permission deployment asynchronously to speed up registration
      // The user can start using the app immediately while permissions are being set up
      // The tenant admin role already has full access, so permissions are not blocking
      this.deployPermissionsAsync(tenantId, offering.tier, offeringId, userId);

      // NOTE: Steps 11 & 12 now run in background. User gets immediate access.
      // - Permission deployment: Runs async, takes 10-30 seconds
      // - Feature onboarding plugins: Runs async, takes 5-15 seconds
      // Both are non-blocking and non-fatal to registration success.

      // ===== STEP 13: Return success =====
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
   * Deploy permissions and run feature onboarding asynchronously
   * This runs after registration completes to avoid blocking the user
   */
  private deployPermissionsAsync(
    tenantId: string,
    tier: string,
    offeringId: string,
    userId: string
  ): void {
    // Use setImmediate to ensure this runs after the current event loop
    // This allows the registration response to return immediately
    setImmediate(async () => {
      console.log(`[ASYNC] Starting background permission deployment for tenant ${tenantId}`);
      const startTime = Date.now();

      try {
        // Deploy permissions from licensed features
        const deploymentSummary = await this.permissionDeploymentService.deployAllFeaturePermissions(tenantId);

        console.log(`[ASYNC] Permission deployment completed for tenant ${tenantId}:`, {
          totalFeatures: deploymentSummary.totalFeatures,
          successfulDeployments: deploymentSummary.successfulDeployments,
          permissionsDeployed: deploymentSummary.totalPermissionsDeployed,
          roleAssignments: deploymentSummary.totalRoleAssignments,
          durationMs: Date.now() - startTime,
        });

        if (deploymentSummary.errors.length > 0) {
          console.warn('[ASYNC] Permission deployment errors:', deploymentSummary.errors);
        }
      } catch (error) {
        console.error('[ASYNC] Failed to deploy permissions:', error);
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
        }
      } catch (error) {
        console.error('[ASYNC] Failed to execute feature onboarding plugins:', error);
        // Non-fatal - tenant still operational
      }

      console.log(`[ASYNC] Background tasks completed for tenant ${tenantId} in ${Date.now() - startTime}ms`);
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
