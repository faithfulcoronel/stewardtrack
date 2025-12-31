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
      const tenant = await this.tenantRepository.createTenantForRegistration({
        name: churchName,
        subdomain,
        subscription_tier: offering.tier,
        subscription_status: 'active',
        subscription_offering_id: offeringId,
        subscription_end_date: offering.offering_type === 'trial'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
          : null,
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
      try {
        const deploymentSummary = await this.permissionDeploymentService.deployAllFeaturePermissions(tenantId);

        console.log(`Permission deployment for tenant ${tenantId}:`, {
          totalFeatures: deploymentSummary.totalFeatures,
          successfulDeployments: deploymentSummary.successfulDeployments,
          permissionsDeployed: deploymentSummary.totalPermissionsDeployed,
          roleAssignments: deploymentSummary.totalRoleAssignments,
        });

        if (deploymentSummary.errors.length > 0) {
          console.warn('Permission deployment errors:', deploymentSummary.errors);
        }
      } catch (error) {
        console.error('Failed to deploy permissions:', error);
        // Non-fatal - tenant still created successfully
      }

      // ===== STEP 12: Execute feature onboarding plugins =====
      // Each licensed feature can register a plugin to seed preset data
      // (e.g., membership types, stages, financial categories, etc.)
      try {
        const onboardingSummary = await this.featureOnboardingOrchestrator.executePlugins({
          tenantId,
          userId,
          subscriptionTier: offering.tier,
          offeringId,
        });

        console.log(`Feature onboarding for tenant ${tenantId}:`, {
          pluginsExecuted: onboardingSummary.totalPluginsExecuted,
          successful: onboardingSummary.successfulPlugins,
          failed: onboardingSummary.failedPlugins,
          recordsCreated: onboardingSummary.totalRecordsCreated,
          skipped: onboardingSummary.skippedPlugins,
        });

        if (onboardingSummary.failedPlugins > 0) {
          console.warn('Feature onboarding plugin errors:',
            onboardingSummary.results
              .filter(r => !r.result.success)
              .map(r => ({ feature: r.featureCode, error: r.result.message }))
          );
        }
      } catch (error) {
        console.error('Failed to execute feature onboarding plugins:', error);
        // Non-fatal - tenant still created successfully
      }

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
   * Cleanup tenant and user records on registration failure
   */
  private async cleanup(userId: string | null, tenantId: string | null): Promise<void> {
    const cleanupResults: string[] = [];

    try {
      // Clean up tenant and related records
      if (tenantId) {
        try {
          await this.tenantRepository.deleteTenantForCleanup(tenantId);
          cleanupResults.push(`Deleted tenant ${tenantId}`);
        } catch (error) {
          cleanupResults.push(`Failed to delete tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Clean up auth user
      if (userId) {
        const { error: authDeleteError } = await this.authRepository.deleteUser(userId);

        if (authDeleteError) {
          cleanupResults.push(`Failed to delete auth user: ${authDeleteError.message}`);
        } else {
          cleanupResults.push(`Deleted auth user ${userId}`);
        }
      }

      // Log cleanup results
      if (cleanupResults.length > 0) {
        console.log(`Cleanup completed: ${cleanupResults.join(', ')}`);
      }
    } catch (cleanupError) {
      console.error('Failed to cleanup after error:', cleanupError);
      console.error('Partial cleanup results:', cleanupResults);
    }
  }
}
