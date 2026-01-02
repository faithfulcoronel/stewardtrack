/**
 * Licensing Enums
 *
 * Centralized enum definitions for licensing system to ensure consistency
 * across the application (components, API routes, services, etc.)
 */

/**
 * License Tier levels for product offerings and features
 * Hierarchy: Essential → Premium → Professional → Enterprise
 *
 * Note: Custom product offerings can be created by super-admins through the
 * Product Offerings management UI with any combination of features.
 */
export enum LicenseTier {
  ESSENTIAL = 'essential',
  PREMIUM = 'premium',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

/**
 * Display labels for license tiers
 */
export const LicenseTierLabels: Record<LicenseTier, string> = {
  [LicenseTier.ESSENTIAL]: 'Essential',
  [LicenseTier.PREMIUM]: 'Premium',
  [LicenseTier.PROFESSIONAL]: 'Professional',
  [LicenseTier.ENTERPRISE]: 'Enterprise',
};

/**
 * Color schemes for license tier badges
 */
export const LicenseTierColors: Record<LicenseTier, string> = {
  [LicenseTier.ESSENTIAL]: 'bg-gray-100 text-gray-800',
  [LicenseTier.PREMIUM]: 'bg-amber-100 text-amber-800',
  [LicenseTier.PROFESSIONAL]: 'bg-blue-100 text-blue-800',
  [LicenseTier.ENTERPRISE]: 'bg-purple-100 text-purple-800',
};

/**
 * License tier order (for comparison and sorting)
 * Lower number = more basic tier
 */
export const LicenseTierOrder: Record<LicenseTier, number> = {
  [LicenseTier.ESSENTIAL]: 1,
  [LicenseTier.PREMIUM]: 2,
  [LicenseTier.PROFESSIONAL]: 3,
  [LicenseTier.ENTERPRISE]: 4,
};

/**
 * License tier descriptions
 */
export const LicenseTierDescriptions: Record<LicenseTier, string> = {
  [LicenseTier.ESSENTIAL]: 'Basic features for small churches (<100 members)',
  [LicenseTier.PREMIUM]: 'Extended features for growing churches (100-300 members)',
  [LicenseTier.PROFESSIONAL]: 'Full features for medium churches (300-500 members)',
  [LicenseTier.ENTERPRISE]: 'Advanced features for large churches (500+ members)',
};

/**
 * Product offering types
 * Defines the kind of product being offered
 */
export enum ProductOfferingType {
  SUBSCRIPTION = 'subscription',
  ONE_TIME = 'one_time',
  USAGE_BASED = 'usage_based',
  TIERED = 'tiered',
  CUSTOM = 'custom',
}

/**
 * Display labels for product offering types
 */
export const ProductOfferingTypeLabels: Record<ProductOfferingType, string> = {
  [ProductOfferingType.SUBSCRIPTION]: 'Subscription',
  [ProductOfferingType.ONE_TIME]: 'One-Time Purchase',
  [ProductOfferingType.USAGE_BASED]: 'Usage-Based',
  [ProductOfferingType.TIERED]: 'Tiered Pricing',
  [ProductOfferingType.CUSTOM]: 'Custom',
};

/**
 * Feature categories for grouping related features
 */
export enum FeatureCategory {
  CORE = 'core',
  ANALYTICS = 'analytics',
  REPORTING = 'reporting',
  COMMUNICATION = 'communication',
  NOTIFICATION = 'notification',
  INTEGRATION = 'integration',
  AUTOMATION = 'automation',
  SECURITY = 'security',
  CUSTOMIZATION = 'customization',
  COLLABORATION = 'collaboration',
  MANAGEMENT = 'management',
}

/**
 * Display labels for feature categories
 */
export const FeatureCategoryLabels: Record<FeatureCategory, string> = {
  [FeatureCategory.CORE]: 'Core',
  [FeatureCategory.ANALYTICS]: 'Analytics',
  [FeatureCategory.REPORTING]: 'Reporting',
  [FeatureCategory.COMMUNICATION]: 'Communication',
  [FeatureCategory.NOTIFICATION]: 'Notifications',
  [FeatureCategory.INTEGRATION]: 'Integration',
  [FeatureCategory.AUTOMATION]: 'Automation',
  [FeatureCategory.SECURITY]: 'Security',
  [FeatureCategory.CUSTOMIZATION]: 'Customization',
  [FeatureCategory.COLLABORATION]: 'Collaboration',
  [FeatureCategory.MANAGEMENT]: 'Management',
};

/**
 * Alias mapping for category values that may exist in the database
 * Maps alternative/legacy values to canonical enum values
 */
export const FeatureCategoryAliases: Record<string, FeatureCategory> = {
  'notifications': FeatureCategory.NOTIFICATION,
  'notify': FeatureCategory.NOTIFICATION,
  'communications': FeatureCategory.COMMUNICATION,
  'integrations': FeatureCategory.INTEGRATION,
  'report': FeatureCategory.REPORTING,
  'reports': FeatureCategory.REPORTING,
  'manage': FeatureCategory.MANAGEMENT,
  'admin': FeatureCategory.MANAGEMENT,
  'custom': FeatureCategory.CUSTOMIZATION,
  'collaborate': FeatureCategory.COLLABORATION,
  'secure': FeatureCategory.SECURITY,
  'automate': FeatureCategory.AUTOMATION,
};

/**
 * Normalize a category value to a valid FeatureCategory enum value
 * Handles case-insensitivity and common aliases
 */
export const normalizeFeatureCategory = (category: string | null | undefined): string => {
  if (!category) return '';

  const normalized = category.trim().toLowerCase();

  // Check if it's already a valid enum value
  const enumValues = Object.values(FeatureCategory) as string[];
  if (enumValues.includes(normalized)) {
    return normalized;
  }

  // Check aliases
  if (normalized in FeatureCategoryAliases) {
    return FeatureCategoryAliases[normalized];
  }

  // Return as-is (will show as unknown in dropdown but won't break)
  return normalized;
};

/**
 * Feature modules - main application modules
 */
export enum FeatureModule {
  MEMBERS = 'members',
  FINANCE = 'finance',
  DONATIONS = 'donations',
  EVENTS = 'events',
  GROUPS = 'groups',
  VOLUNTEERS = 'volunteers',
  COMMUNICATIONS = 'communications',
  FACILITIES = 'facilities',
  RESOURCES = 'resources',
  ADMIN = 'admin',
  REPORTS = 'reports',
  DASHBOARD = 'dashboard',
}

/**
 * Display labels for feature modules
 */
export const FeatureModuleLabels: Record<FeatureModule, string> = {
  [FeatureModule.MEMBERS]: 'Members',
  [FeatureModule.FINANCE]: 'Finance',
  [FeatureModule.DONATIONS]: 'Donations',
  [FeatureModule.EVENTS]: 'Events',
  [FeatureModule.GROUPS]: 'Groups',
  [FeatureModule.VOLUNTEERS]: 'Volunteers',
  [FeatureModule.COMMUNICATIONS]: 'Communications',
  [FeatureModule.FACILITIES]: 'Facilities',
  [FeatureModule.RESOURCES]: 'Resources',
  [FeatureModule.ADMIN]: 'Admin',
  [FeatureModule.REPORTS]: 'Reports',
  [FeatureModule.DASHBOARD]: 'Dashboard',
};

/**
 * Bundle type for license feature bundles
 * Matches the database check constraint: bundle_type IN ('core', 'add-on', 'module', 'custom')
 *
 * @see supabase/migrations/20251218001009_create_license_feature_bundles.sql
 */
export enum BundleType {
  CORE = 'core',
  ADD_ON = 'add-on',
  MODULE = 'module',
  CUSTOM = 'custom',
}

/**
 * Display labels for bundle types
 */
export const BundleTypeLabels: Record<BundleType, string> = {
  [BundleType.CORE]: 'Core',
  [BundleType.ADD_ON]: 'Add-On',
  [BundleType.MODULE]: 'Module',
  [BundleType.CUSTOM]: 'Custom',
};

/**
 * Bundle type descriptions
 */
export const BundleTypeDescriptions: Record<BundleType, string> = {
  [BundleType.CORE]: 'Essential platform features required for all deployments',
  [BundleType.ADD_ON]: 'Optional enhancement features that extend functionality',
  [BundleType.MODULE]: 'Functional area groupings for specific domains',
  [BundleType.CUSTOM]: 'Tenant-specific custom feature bundles',
};

/**
 * Surface types - UI component types for metadata system
 */
export enum SurfaceType {
  PAGE = 'page',
  DASHBOARD = 'dashboard',
  WIZARD = 'wizard',
  DIALOG = 'dialog',
  PANEL = 'panel',
  WIDGET = 'widget',
  REPORT = 'report',
  FORM = 'form',
  LIST = 'list',
  DETAIL = 'detail',
}

/**
 * Display labels for surface types
 */
export const SurfaceTypeLabels: Record<SurfaceType, string> = {
  [SurfaceType.PAGE]: 'Page',
  [SurfaceType.DASHBOARD]: 'Dashboard',
  [SurfaceType.WIZARD]: 'Wizard',
  [SurfaceType.DIALOG]: 'Dialog',
  [SurfaceType.PANEL]: 'Panel',
  [SurfaceType.WIDGET]: 'Widget',
  [SurfaceType.REPORT]: 'Report',
  [SurfaceType.FORM]: 'Form',
  [SurfaceType.LIST]: 'List',
  [SurfaceType.DETAIL]: 'Detail',
};
