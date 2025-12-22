import 'server-only';

import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ITenantFeatureGrantRepository } from '@/repositories/tenantFeatureGrant.repository';
import { FeatureOnboardingRegistry } from '@/lib/onboarding/plugins/FeatureOnboardingRegistry';
import type {
  FeatureOnboardingContext,
  FeatureOnboardingSummary,
  IFeatureOnboardingPlugin,
} from '@/lib/onboarding/plugins/types';

/**
 * FeatureOnboardingOrchestratorService
 *
 * Orchestrates the execution of feature onboarding plugins during tenant registration.
 * This service:
 * 1. Retrieves the tenant's granted features
 * 2. Finds all plugins registered for those features
 * 3. Executes them in dependency order
 * 4. Returns a summary of all executed plugins
 *
 * Called from RegistrationService after license features are provisioned.
 *
 * @example
 * ```typescript
 * // In RegistrationService after provisionTenantLicense:
 * const summary = await this.featureOnboardingOrchestrator.executePlugins({
 *   tenantId,
 *   userId,
 *   subscriptionTier: offering.tier,
 *   offeringId,
 *   grantedFeatures: [], // Will be fetched internally
 * });
 * ```
 */
@injectable()
export class FeatureOnboardingOrchestratorService {
  constructor(
    @inject(TYPES.ITenantFeatureGrantRepository)
    private tenantFeatureGrantRepository: ITenantFeatureGrantRepository
  ) {}

  /**
   * Execute all applicable onboarding plugins for a tenant
   *
   * @param context Partial context - grantedFeatures will be fetched if not provided
   * @returns Summary of all plugin executions
   */
  async executePlugins(
    context: Omit<FeatureOnboardingContext, 'grantedFeatures'> & {
      grantedFeatures?: string[];
    }
  ): Promise<FeatureOnboardingSummary> {
    const startTime = Date.now();

    console.log(
      `[FeatureOnboardingOrchestrator] Starting feature onboarding for tenant ${context.tenantId}`
    );

    // Fetch granted features if not provided
    let grantedFeatures = context.grantedFeatures;
    if (!grantedFeatures || grantedFeatures.length === 0) {
      grantedFeatures = await this.getGrantedFeatureCodes(context.tenantId);
    }

    console.log(
      `[FeatureOnboardingOrchestrator] Tenant has ${grantedFeatures.length} granted features:`,
      grantedFeatures
    );

    const fullContext: FeatureOnboardingContext = {
      ...context,
      grantedFeatures,
    };

    // Get all registered plugins in dependency order
    const allPlugins = FeatureOnboardingRegistry.getAllSorted();
    console.log(
      `[FeatureOnboardingOrchestrator] ${allPlugins.length} plugins registered:`,
      allPlugins.map((p) => p.featureCode)
    );

    const summary: FeatureOnboardingSummary = {
      totalPluginsExecuted: 0,
      successfulPlugins: 0,
      failedPlugins: 0,
      totalRecordsCreated: 0,
      results: [],
      skippedPlugins: [],
    };

    // Execute each plugin that should run
    for (const plugin of allPlugins) {
      const shouldExecute = await plugin.shouldExecute(fullContext);

      if (!shouldExecute) {
        console.log(
          `[FeatureOnboardingOrchestrator] Skipping plugin ${plugin.featureCode} (not applicable)`
        );
        summary.skippedPlugins.push(plugin.featureCode);
        continue;
      }

      // Execute the plugin
      const result = await plugin.execute(fullContext);

      summary.totalPluginsExecuted++;
      summary.results.push({
        featureCode: plugin.featureCode,
        name: plugin.name,
        result,
      });

      if (result.success) {
        summary.successfulPlugins++;
        summary.totalRecordsCreated += result.recordsCreated ?? 0;
      } else {
        summary.failedPlugins++;
        console.error(
          `[FeatureOnboardingOrchestrator] Plugin ${plugin.featureCode} failed:`,
          result.error?.message ?? result.message
        );
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[FeatureOnboardingOrchestrator] Completed in ${duration}ms:`,
      {
        executed: summary.totalPluginsExecuted,
        successful: summary.successfulPlugins,
        failed: summary.failedPlugins,
        recordsCreated: summary.totalRecordsCreated,
        skipped: summary.skippedPlugins.length,
      }
    );

    return summary;
  }

  /**
   * Execute a single plugin by feature code
   * Useful for manual triggering or retry scenarios
   */
  async executePlugin(
    featureCode: string,
    context: FeatureOnboardingContext
  ): Promise<{
    success: boolean;
    result?: FeatureOnboardingSummary['results'][0];
    error?: string;
  }> {
    const plugin = FeatureOnboardingRegistry.get(featureCode);

    if (!plugin) {
      return {
        success: false,
        error: `No plugin registered for feature: ${featureCode}`,
      };
    }

    const shouldExecute = await plugin.shouldExecute(context);
    if (!shouldExecute) {
      return {
        success: false,
        error: `Plugin ${featureCode} should not execute for this context`,
      };
    }

    const result = await plugin.execute(context);

    return {
      success: result.success,
      result: {
        featureCode: plugin.featureCode,
        name: plugin.name,
        result,
      },
    };
  }

  /**
   * Get list of plugins that would execute for the given features
   * Useful for previewing what will happen during onboarding
   */
  getApplicablePlugins(featureCodes: string[]): IFeatureOnboardingPlugin[] {
    return FeatureOnboardingRegistry.getPluginsForFeatures(featureCodes);
  }

  /**
   * Check if onboarding plugins are available for a feature
   */
  hasPluginForFeature(featureCode: string): boolean {
    return FeatureOnboardingRegistry.has(featureCode);
  }

  /**
   * Get all registered feature codes that have onboarding plugins
   */
  getRegisteredFeatureCodes(): string[] {
    return FeatureOnboardingRegistry.getRegisteredFeatureCodes();
  }

  /**
   * Fetch the granted feature codes for a tenant
   */
  private async getGrantedFeatureCodes(tenantId: string): Promise<string[]> {
    try {
      // Get feature grants for the tenant
      const grants = await this.tenantFeatureGrantRepository.getTenantFeatureGrants(tenantId);

      // Filter to only active grants (check dates)
      const today = new Date();
      const activeGrants = grants.filter((grant) => {
        // Check start date
        if (grant.starts_at) {
          const startDate = new Date(grant.starts_at);
          if (startDate > today) return false;
        }
        // Check expiration
        if (grant.expires_at) {
          const expiresDate = new Date(grant.expires_at);
          if (expiresDate < today) return false;
        }
        return true;
      });

      // Extract unique feature codes
      // The adapter returns grants with a nested feature relation from the join
      // Since the model doesn't include the runtime join, we use type assertion
      type GrantWithFeature = typeof activeGrants[number] & {
        feature?: { code?: string; name?: string };
      };

      const featureCodes = (activeGrants as GrantWithFeature[])
        .map((grant) => {
          // Try to get feature code from the nested feature relation
          if (grant.feature && typeof grant.feature === 'object' && grant.feature.code) {
            return grant.feature.code;
          }
          return null;
        })
        .filter((code): code is string => code !== null);

      return [...new Set(featureCodes)]; // Deduplicate
    } catch (error) {
      console.error(
        `[FeatureOnboardingOrchestrator] Failed to fetch granted features for tenant ${tenantId}:`,
        error
      );
      return [];
    }
  }
}
