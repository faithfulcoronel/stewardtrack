import 'server-only';

/**
 * Feature Onboarding Plugin System
 *
 * This module defines the plugin architecture for feature-specific onboarding.
 * Each feature (membership, finance, events, etc.) can register a plugin that
 * seeds default/preset data when a tenant is created with that feature licensed.
 *
 * Flow:
 * 1. Tenant registers and selects a product offering
 * 2. License features are provisioned based on the offering
 * 3. FeatureOnboardingOrchestrator checks which features are granted
 * 4. For each granted feature with a registered plugin, execute the plugin
 * 5. Each plugin seeds its own preset data (e.g., membership types, stages)
 *
 * Benefits:
 * - Decoupled: Each feature owns its onboarding logic
 * - Extensible: New features just register a new plugin
 * - License-aware: Only runs for features the tenant has access to
 * - Idempotent: Plugins should be safe to run multiple times
 */

/**
 * Context provided to each onboarding plugin during execution
 */
export interface FeatureOnboardingContext {
  /** The tenant ID being onboarded */
  tenantId: string;

  /** The user ID of the person creating the tenant (typically the admin) */
  userId: string;

  /** The subscription tier (Essential, Professional, Enterprise, Premium) */
  subscriptionTier: string;

  /** The product offering ID selected during registration */
  offeringId: string;

  /** List of feature codes granted to this tenant */
  grantedFeatures: string[];
}

/**
 * Result returned by a plugin after execution
 */
export interface FeatureOnboardingResult {
  /** Whether the plugin executed successfully */
  success: boolean;

  /** Human-readable message about what was done */
  message: string;

  /** Number of records created */
  recordsCreated?: number;

  /** Any error that occurred */
  error?: Error;

  /** Additional metadata about the onboarding */
  metadata?: Record<string, unknown>;
}

/**
 * Interface that all feature onboarding plugins must implement
 */
export interface IFeatureOnboardingPlugin {
  /**
   * Unique identifier for this plugin (e.g., 'membership', 'finance', 'events')
   */
  readonly featureCode: string;

  /**
   * Human-readable name for logging and UI
   */
  readonly name: string;

  /**
   * Description of what this plugin does
   */
  readonly description: string;

  /**
   * Priority for execution order (lower = runs first)
   * Default is 100. Use lower numbers for dependencies.
   */
  readonly priority: number;

  /**
   * List of feature codes this plugin depends on
   * These plugins will be executed first
   */
  readonly dependencies: string[];

  /**
   * Check if this plugin should run for the given context
   * By default, checks if featureCode is in grantedFeatures
   *
   * @param context The onboarding context
   * @returns true if the plugin should execute
   */
  shouldExecute(context: FeatureOnboardingContext): Promise<boolean>;

  /**
   * Execute the onboarding logic for this feature
   * Should be idempotent - safe to run multiple times
   *
   * @param context The onboarding context
   * @returns Result of the execution
   */
  execute(context: FeatureOnboardingContext): Promise<FeatureOnboardingResult>;
}

/**
 * Summary of all plugins executed during onboarding
 */
export interface FeatureOnboardingSummary {
  /** Total number of plugins that were executed */
  totalPluginsExecuted: number;

  /** Number of plugins that succeeded */
  successfulPlugins: number;

  /** Number of plugins that failed */
  failedPlugins: number;

  /** Total records created across all plugins */
  totalRecordsCreated: number;

  /** Individual results from each plugin */
  results: Array<{
    featureCode: string;
    name: string;
    result: FeatureOnboardingResult;
  }>;

  /** Plugins that were skipped (feature not licensed) */
  skippedPlugins: string[];
}
