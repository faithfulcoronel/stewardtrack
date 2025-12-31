import 'server-only';

import type {
  IFeatureOnboardingPlugin,
  FeatureOnboardingContext,
  FeatureOnboardingResult,
} from './types';

/**
 * Base class for feature onboarding plugins
 *
 * Provides common functionality and sensible defaults.
 * Extend this class to create a new feature onboarding plugin.
 *
 * @example
 * ```typescript
 * @injectable()
 * export class MembershipOnboardingPlugin extends BaseFeatureOnboardingPlugin {
 *   readonly featureCode = 'membership';
 *   readonly name = 'Membership Feature';
 *   readonly description = 'Seeds default membership types and stages';
 *
 *   protected async executeInternal(
 *     context: FeatureOnboardingContext
 *   ): Promise<FeatureOnboardingResult> {
 *     // Create membership types and stages...
 *     return { success: true, message: 'Created defaults', recordsCreated: 10 };
 *   }
 * }
 * ```
 */
export abstract class BaseFeatureOnboardingPlugin implements IFeatureOnboardingPlugin {
  /**
   * Unique feature code that maps to license_features
   */
  abstract readonly featureCode: string;

  /**
   * Human-readable name
   */
  abstract readonly name: string;

  /**
   * Description of what this plugin does
   */
  abstract readonly description: string;

  /**
   * Execution priority (lower = runs first)
   * Override in subclass to change ordering
   */
  readonly priority: number = 100;

  /**
   * Feature codes this plugin depends on
   * Override in subclass if there are dependencies
   */
  readonly dependencies: string[] = [];

  /**
   * Check if this plugin should execute
   * Default: runs if featureCode is in grantedFeatures
   *
   * Override for custom logic (e.g., tier-based checks)
   */
  async shouldExecute(context: FeatureOnboardingContext): Promise<boolean> {
    return context.grantedFeatures.includes(this.featureCode);
  }

  /**
   * Execute the plugin with error handling wrapper
   */
  async execute(context: FeatureOnboardingContext): Promise<FeatureOnboardingResult> {
    try {
      console.log(`[FeatureOnboarding] Executing plugin: ${this.name} (${this.featureCode})`);
      console.log(`[FeatureOnboarding] Tenant: ${context.tenantId}, Tier: ${context.subscriptionTier}`);

      const result = await this.executeInternal(context);

      console.log(`[FeatureOnboarding] Plugin ${this.featureCode} completed:`, {
        success: result.success,
        recordsCreated: result.recordsCreated,
        message: result.message,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[FeatureOnboarding] Plugin ${this.featureCode} failed:`, error);

      return {
        success: false,
        message: `Plugin failed: ${errorMessage}`,
        error: error instanceof Error ? error : new Error(errorMessage),
        recordsCreated: 0,
      };
    }
  }

  /**
   * Internal execution method to be implemented by subclasses
   * This is where the actual onboarding logic goes
   */
  protected abstract executeInternal(
    context: FeatureOnboardingContext
  ): Promise<FeatureOnboardingResult>;

  /**
   * Helper method to create a success result
   */
  protected successResult(
    message: string,
    recordsCreated: number = 0,
    metadata?: Record<string, unknown>
  ): FeatureOnboardingResult {
    return {
      success: true,
      message,
      recordsCreated,
      metadata,
    };
  }

  /**
   * Helper method to create a failure result
   */
  protected failureResult(
    message: string,
    error?: Error
  ): FeatureOnboardingResult {
    return {
      success: false,
      message,
      error,
      recordsCreated: 0,
    };
  }
}
