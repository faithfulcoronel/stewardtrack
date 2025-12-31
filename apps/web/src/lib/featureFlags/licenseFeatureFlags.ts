import 'server-only';

/**
 * Feature Flag System for Licensing & RBAC Rollout
 *
 * Controls the gradual rollout of licensing and RBAC features.
 * Allows enabling/disabling features per environment or tenant.
 */

export interface FeatureFlags {
  LICENSING_ENFORCEMENT_ENABLED: boolean;
  ONBOARDING_WIZARD_ENABLED: boolean;
  AUTO_PROVISION_ENABLED: boolean;
  MATERIALIZED_VIEW_REFRESH_ENABLED: boolean;
  LICENSE_VALIDATION_ENABLED: boolean;
  PERFORMANCE_METRICS_ENABLED: boolean;
  CACHE_ENABLED: boolean;
  REDIS_CACHE_ENABLED: boolean;
  MONITORING_ALERTS_ENABLED: boolean;
  SELF_HEALING_ENABLED: boolean;
}

export interface TenantFeatureOverrides {
  [tenantId: string]: Partial<FeatureFlags>;
}

/**
 * Get feature flags from environment variables
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1';
}

/**
 * Default feature flags (can be overridden by environment variables)
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // Core licensing enforcement
  LICENSING_ENFORCEMENT_ENABLED: getEnvBoolean('LICENSING_ENFORCEMENT_ENABLED', true),

  // Onboarding wizard for new tenants
  ONBOARDING_WIZARD_ENABLED: getEnvBoolean('ONBOARDING_WIZARD_ENABLED', true),

  // Auto-provision licenses on signup
  AUTO_PROVISION_ENABLED: getEnvBoolean('AUTO_PROVISION_ENABLED', true),

  // Materialized view auto-refresh
  MATERIALIZED_VIEW_REFRESH_ENABLED: getEnvBoolean('MATERIALIZED_VIEW_REFRESH_ENABLED', true),

  // License validation checks
  LICENSE_VALIDATION_ENABLED: getEnvBoolean('LICENSE_VALIDATION_ENABLED', true),

  // Performance metrics collection
  PERFORMANCE_METRICS_ENABLED: getEnvBoolean('PERFORMANCE_METRICS_ENABLED', true),

  // In-memory caching
  CACHE_ENABLED: getEnvBoolean('CACHE_ENABLED', true),

  // Redis distributed cache
  REDIS_CACHE_ENABLED: getEnvBoolean('REDIS_CACHE_ENABLED', false),

  // Monitoring and alerting
  MONITORING_ALERTS_ENABLED: getEnvBoolean('MONITORING_ALERTS_ENABLED', true),

  // Self-healing automation
  SELF_HEALING_ENABLED: getEnvBoolean('SELF_HEALING_ENABLED', false),
};

/**
 * Tenant-specific overrides (for gradual rollout)
 * Can be loaded from database or configuration
 */
let TENANT_OVERRIDES: TenantFeatureOverrides = {};

/**
 * Load tenant overrides from database (if available)
 */
async function loadTenantOverrides(): Promise<TenantFeatureOverrides> {
  try {
    // In production, this would load from a database table
    // For now, return empty overrides
    return {};
  } catch (error) {
    console.error('Error loading tenant overrides:', error);
    return {};
  }
}

/**
 * Get feature flags for a specific tenant
 */
export async function getFeatureFlags(tenantId?: string): Promise<FeatureFlags> {
  if (!tenantId) {
    return DEFAULT_FLAGS;
  }

  // Lazy load tenant overrides
  if (Object.keys(TENANT_OVERRIDES).length === 0) {
    TENANT_OVERRIDES = await loadTenantOverrides();
  }

  const overrides = TENANT_OVERRIDES[tenantId] || {};

  return {
    ...DEFAULT_FLAGS,
    ...overrides,
  };
}

/**
 * Check if a specific feature is enabled
 */
export async function isFeatureEnabled(
  featureName: keyof FeatureFlags,
  tenantId?: string
): Promise<boolean> {
  const flags = await getFeatureFlags(tenantId);
  return flags[featureName];
}

/**
 * Set tenant-specific feature flag override
 */
export function setTenantFeatureOverride(
  tenantId: string,
  featureName: keyof FeatureFlags,
  enabled: boolean
): void {
  if (!TENANT_OVERRIDES[tenantId]) {
    TENANT_OVERRIDES[tenantId] = {};
  }

  TENANT_OVERRIDES[tenantId][featureName] = enabled;
}

/**
 * Remove tenant-specific override
 */
export function removeTenantFeatureOverride(
  tenantId: string,
  featureName: keyof FeatureFlags
): void {
  if (TENANT_OVERRIDES[tenantId]) {
    delete TENANT_OVERRIDES[tenantId][featureName];
  }
}

/**
 * Get all tenant overrides
 */
export function getTenantOverrides(): TenantFeatureOverrides {
  return { ...TENANT_OVERRIDES };
}

/**
 * Rollout stages for gradual deployment
 */
export enum RolloutStage {
  DISABLED = 'disabled',
  INTERNAL_TESTING = 'internal_testing',
  PILOT = 'pilot',
  EARLY_ADOPTERS = 'early_adopters',
  GENERAL_AVAILABILITY = 'general_availability',
}

/**
 * Get current rollout stage from environment
 */
export function getCurrentRolloutStage(): RolloutStage {
  const stage = process.env.LICENSING_ROLLOUT_STAGE || 'general_availability';

  switch (stage.toLowerCase()) {
    case 'disabled':
      return RolloutStage.DISABLED;
    case 'internal_testing':
    case 'internal':
      return RolloutStage.INTERNAL_TESTING;
    case 'pilot':
      return RolloutStage.PILOT;
    case 'early_adopters':
    case 'early':
      return RolloutStage.EARLY_ADOPTERS;
    case 'general_availability':
    case 'ga':
    default:
      return RolloutStage.GENERAL_AVAILABILITY;
  }
}

/**
 * Check if licensing features should be enabled based on rollout stage
 */
export function shouldEnableLicensingForStage(stage: RolloutStage): boolean {
  switch (stage) {
    case RolloutStage.DISABLED:
      return false;
    case RolloutStage.INTERNAL_TESTING:
    case RolloutStage.PILOT:
    case RolloutStage.EARLY_ADOPTERS:
    case RolloutStage.GENERAL_AVAILABILITY:
      return true;
    default:
      return false;
  }
}

/**
 * Get feature flags based on rollout stage
 */
export function getFeatureFlagsForStage(stage: RolloutStage): Partial<FeatureFlags> {
  switch (stage) {
    case RolloutStage.DISABLED:
      return {
        LICENSING_ENFORCEMENT_ENABLED: false,
        ONBOARDING_WIZARD_ENABLED: false,
        AUTO_PROVISION_ENABLED: false,
        LICENSE_VALIDATION_ENABLED: false,
        MONITORING_ALERTS_ENABLED: false,
      };

    case RolloutStage.INTERNAL_TESTING:
      return {
        LICENSING_ENFORCEMENT_ENABLED: true,
        ONBOARDING_WIZARD_ENABLED: true,
        AUTO_PROVISION_ENABLED: false, // Manual provisioning only
        LICENSE_VALIDATION_ENABLED: true,
        MONITORING_ALERTS_ENABLED: true,
        SELF_HEALING_ENABLED: false, // Not enabled in testing
      };

    case RolloutStage.PILOT:
      return {
        LICENSING_ENFORCEMENT_ENABLED: true,
        ONBOARDING_WIZARD_ENABLED: true,
        AUTO_PROVISION_ENABLED: true,
        LICENSE_VALIDATION_ENABLED: true,
        MONITORING_ALERTS_ENABLED: true,
        SELF_HEALING_ENABLED: false, // Still manual intervention
      };

    case RolloutStage.EARLY_ADOPTERS:
      return {
        LICENSING_ENFORCEMENT_ENABLED: true,
        ONBOARDING_WIZARD_ENABLED: true,
        AUTO_PROVISION_ENABLED: true,
        LICENSE_VALIDATION_ENABLED: true,
        MONITORING_ALERTS_ENABLED: true,
        SELF_HEALING_ENABLED: true, // Enable self-healing
      };

    case RolloutStage.GENERAL_AVAILABILITY:
      return {
        LICENSING_ENFORCEMENT_ENABLED: true,
        ONBOARDING_WIZARD_ENABLED: true,
        AUTO_PROVISION_ENABLED: true,
        LICENSE_VALIDATION_ENABLED: true,
        MONITORING_ALERTS_ENABLED: true,
        SELF_HEALING_ENABLED: true,
      };

    default:
      return {};
  }
}

/**
 * Export default flags for direct access
 */
export const featureFlags = DEFAULT_FLAGS;
