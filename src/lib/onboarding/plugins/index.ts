/**
 * Feature Onboarding Plugin System
 *
 * This module exports the plugin infrastructure for feature-specific onboarding.
 *
 * Usage:
 * 1. Import and call initializeFeaturePlugins() at app startup
 * 2. The orchestrator service will automatically execute applicable plugins during registration
 *
 * Creating a new plugin:
 * 1. Create a class extending BaseFeatureOnboardingPlugin
 * 2. Implement executeInternal() with your seeding logic
 * 3. Register the plugin in registerAllPlugins.ts
 * 4. Bind the plugin in the DI container
 */

// Types
export type {
  IFeatureOnboardingPlugin,
  FeatureOnboardingContext,
  FeatureOnboardingResult,
  FeatureOnboardingSummary,
} from './types';

// Base class
export { BaseFeatureOnboardingPlugin } from './BaseFeatureOnboardingPlugin';

// Registry
export {
  FeatureOnboardingRegistry,
  RegisterFeaturePlugin,
} from './FeatureOnboardingRegistry';

// Feature plugins
export { MembershipOnboardingPlugin } from './features/MembershipOnboardingPlugin';

// Initialization
export { initializeFeaturePlugins } from './registerAllPlugins';
