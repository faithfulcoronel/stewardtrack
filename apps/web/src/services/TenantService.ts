import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { LicensingService } from '@/services/LicensingService';
import type { FeatureOnboardingOrchestratorService } from '@/services/FeatureOnboardingOrchestratorService';
import type { Tenant } from '@/models/tenant.model';
import { TenantValidator } from '@/validators/tenant.validator';
import { validateOrThrow } from '@/utils/validation';

export type SetupStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface SetupCheckResult {
  isComplete: boolean;
  status: SetupStatus;
  completedAt: string | null;
  error: string | null;
}

export interface SetupCompletionResult {
  success: boolean;
  status: SetupStatus;
  featuresAdded: number;
  permissionsDeployed: number;
  roleAssignmentsCreated: number;
  pluginsExecuted: number;
  error?: string;
}

@injectable()
export class TenantService {
  constructor(
    @inject(TYPES.ITenantRepository)
    private repo: ITenantRepository,
    @inject(TYPES.LicensingService)
    private licensingService: LicensingService,
    @inject(TYPES.FeatureOnboardingOrchestratorService)
    private featureOnboardingOrchestrator: FeatureOnboardingOrchestratorService,
  ) {}

  getCurrentTenant(): Promise<Tenant | null> {
    return this.repo.getCurrentTenant();
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findById(id);
  }

  updateTenant(id: string, data: Partial<Tenant>) {
    validateOrThrow(TenantValidator, data);
    return this.repo.update(id, data);
  }

  uploadLogo(tenantId: string, file: File) {
    return this.repo.uploadLogo(tenantId, file);
  }

  getTenantDataCounts(tenantId: string) {
    return this.repo.getTenantDataCounts(tenantId);
  }

  resetTenantData(tenantId: string) {
    return this.repo.resetTenantData(tenantId);
  }

  previewResetTenantData(tenantId: string) {
    // Use existing counts RPC for preview to improve compatibility
    return this.repo.getTenantDataCounts(tenantId);
  }

  // ==================== SETUP STATUS METHODS ====================

  /**
   * Check if tenant setup is complete
   */
  async checkSetupStatus(tenantId: string): Promise<SetupCheckResult> {
    const tenant = await this.repo.findById(tenantId);

    if (!tenant) {
      return {
        isComplete: false,
        status: 'pending',
        completedAt: null,
        error: 'Tenant not found',
      };
    }

    const status = (tenant.setup_status as SetupStatus) ?? 'pending';

    return {
      isComplete: status === 'completed',
      status,
      completedAt: tenant.setup_completed_at ?? null,
      error: tenant.setup_error ?? null,
    };
  }

  /**
   * Update the setup status
   */
  async updateSetupStatus(
    tenantId: string,
    status: SetupStatus,
    error?: string
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      setup_status: status,
      setup_error: error ?? null,
    };

    if (status === 'completed') {
      updateData.setup_completed_at = new Date().toISOString();
    }

    await this.repo.update(tenantId, updateData as Partial<Tenant>);
  }

  /**
   * Mark setup as complete
   */
  async markSetupComplete(tenantId: string): Promise<void> {
    await this.updateSetupStatus(tenantId, 'completed');
    console.log(`[TenantService] Marked setup as complete for tenant ${tenantId}`);
  }

  /**
   * Mark setup as failed with error message
   */
  async markSetupFailed(tenantId: string, error: string): Promise<void> {
    await this.updateSetupStatus(tenantId, 'failed', error);
    console.log(`[TenantService] Marked setup as failed for tenant ${tenantId}: ${error}`);
  }

  /**
   * Complete the tenant setup process (idempotent)
   *
   * Runs the same tasks as the registration async process:
   * 1. Sync subscription features (grants, permissions, role assignments)
   * 2. Execute feature onboarding plugins
   */
  async completeSetup(tenantId: string, userId?: string): Promise<SetupCompletionResult> {
    console.log(`[TenantService] Starting setup completion for tenant ${tenantId}`);
    const startTime = Date.now();

    try {
      await this.updateSetupStatus(tenantId, 'in_progress');

      let featuresAdded = 0;
      let permissionsDeployed = 0;
      let roleAssignmentsCreated = 0;
      let pluginsExecuted = 0;

      // Step 1: Sync subscription features
      try {
        const syncResult = await this.licensingService.syncTenantSubscriptionFeatures(tenantId);

        if (syncResult.success) {
          featuresAdded = syncResult.features_added ?? 0;
          permissionsDeployed = syncResult.permissions_deployed ?? 0;
          roleAssignmentsCreated = syncResult.role_assignments_created ?? 0;

          console.log(`[TenantService] Feature sync completed:`, {
            featuresAdded,
            permissionsDeployed,
            roleAssignmentsCreated,
          });
        } else {
          console.warn(`[TenantService] Feature sync returned errors:`, syncResult.error);
        }
      } catch (error) {
        console.error('[TenantService] Feature sync failed:', error);
      }

      // Step 2: Execute feature onboarding plugins (if userId provided)
      if (userId) {
        try {
          const tenant = await this.repo.findById(tenantId);

          if (tenant) {
            const onboardingSummary = await this.featureOnboardingOrchestrator.executePlugins({
              tenantId,
              userId,
              subscriptionTier: tenant.subscription_tier ?? 'essential',
              offeringId: tenant.subscription_offering_id ?? '',
            });

            pluginsExecuted = onboardingSummary.totalPluginsExecuted ?? 0;

            console.log(`[TenantService] Feature onboarding completed:`, {
              pluginsExecuted,
              successful: onboardingSummary.successfulPlugins,
              failed: onboardingSummary.failedPlugins,
            });
          }
        } catch (error) {
          console.error('[TenantService] Feature onboarding failed:', error);
        }
      }

      await this.updateSetupStatus(tenantId, 'completed');

      const duration = Date.now() - startTime;
      console.log(`[TenantService] Setup completed for tenant ${tenantId} in ${duration}ms`);

      return {
        success: true,
        status: 'completed',
        featuresAdded,
        permissionsDeployed,
        roleAssignmentsCreated,
        pluginsExecuted,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[TenantService] Setup failed for tenant ${tenantId}:`, error);

      try {
        await this.updateSetupStatus(tenantId, 'failed', errorMessage);
      } catch {
        // Ignore update errors
      }

      return {
        success: false,
        status: 'failed',
        featuresAdded: 0,
        permissionsDeployed: 0,
        roleAssignmentsCreated: 0,
        pluginsExecuted: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Check setup status and complete if not done
   *
   * Main method to call from admin layout for auto-recovery.
   */
  async ensureSetupComplete(tenantId: string, userId?: string): Promise<SetupCompletionResult> {
    const status = await this.checkSetupStatus(tenantId);

    if (status.isComplete) {
      return {
        success: true,
        status: 'completed',
        featuresAdded: 0,
        permissionsDeployed: 0,
        roleAssignmentsCreated: 0,
        pluginsExecuted: 0,
      };
    }

    console.log(`[TenantService] Setup not complete (status: ${status.status}), running setup...`);
    return this.completeSetup(tenantId, userId);
  }

  // ==================== ADMIN MEMBER METHODS ====================

  /**
   * Check if the admin member profile has been created for this tenant
   */
  async isAdminMemberCreated(tenantId: string): Promise<boolean> {
    const tenant = await this.repo.findById(tenantId);
    return tenant?.admin_member_created ?? false;
  }

  /**
   * Mark the admin member profile as created
   */
  async markAdminMemberCreated(tenantId: string): Promise<void> {
    await this.repo.update(tenantId, { admin_member_created: true } as Partial<Tenant>);
    console.log(`[TenantService] Marked admin member as created for tenant ${tenantId}`);
  }
}

export type { Tenant };
