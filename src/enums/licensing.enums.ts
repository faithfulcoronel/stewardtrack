/**
 * Licensing Enums
 *
 * Centralized enum definitions for licensing system to ensure consistency
 * across the application (components, API routes, services, etc.)
 */

/**
 * License Tier levels for product offerings and features
 * Determines the pricing and feature access level
 */
export enum LicenseTier {
  ESSENTIAL = 'essential',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
  PREMIUM = 'premium',
}

/**
 * Display labels for license tiers
 */
export const LicenseTierLabels: Record<LicenseTier, string> = {
  [LicenseTier.ESSENTIAL]: 'Essential',
  [LicenseTier.PROFESSIONAL]: 'Professional',
  [LicenseTier.ENTERPRISE]: 'Enterprise',
  [LicenseTier.PREMIUM]: 'Premium',
};

/**
 * Color schemes for license tier badges
 */
export const LicenseTierColors: Record<LicenseTier, string> = {
  [LicenseTier.ESSENTIAL]: 'bg-gray-100 text-gray-800',
  [LicenseTier.PROFESSIONAL]: 'bg-blue-100 text-blue-800',
  [LicenseTier.ENTERPRISE]: 'bg-purple-100 text-purple-800',
  [LicenseTier.PREMIUM]: 'bg-amber-100 text-amber-800',
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
  [FeatureCategory.INTEGRATION]: 'Integration',
  [FeatureCategory.AUTOMATION]: 'Automation',
  [FeatureCategory.SECURITY]: 'Security',
  [FeatureCategory.CUSTOMIZATION]: 'Customization',
  [FeatureCategory.COLLABORATION]: 'Collaboration',
  [FeatureCategory.MANAGEMENT]: 'Management',
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

/**
 * Helper function to get all enum values as array
 */
export function getEnumValues<T extends Record<string, string>>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj);
}

/**
 * Helper function to validate if a value is a valid enum member
 */
export function isValidEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObj).includes(value as T[keyof T]);
}
