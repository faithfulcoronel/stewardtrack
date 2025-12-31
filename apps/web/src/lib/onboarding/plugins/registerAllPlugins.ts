import 'server-only';

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { FeatureOnboardingRegistry } from './FeatureOnboardingRegistry';
import { MembershipOnboardingPlugin } from './features/MembershipOnboardingPlugin';

/**
 * Flag to track if plugins have been initialized
 */
let pluginsInitialized = false;

/**
 * Initialize and register all feature onboarding plugins
 *
 * This function should be called once at application startup.
 * It resolves plugin instances from the DI container and registers
 * them with the FeatureOnboardingRegistry.
 *
 * Plugins are resolved from DI to ensure they have their dependencies
 * properly injected (repositories, services, etc.).
 *
 * @example
 * ```typescript
 * // In app initialization or RegistrationService
 * import { initializeFeaturePlugins } from '@/lib/onboarding/plugins';
 * initializeFeaturePlugins();
 * ```
 */
export function initializeFeaturePlugins(): void {
  if (pluginsInitialized) {
    console.log('[FeatureOnboarding] Plugins already initialized, skipping');
    return;
  }

  console.log('[FeatureOnboarding] Initializing feature onboarding plugins...');

  try {
    // Register MembershipOnboardingPlugin
    registerPluginFromContainer(TYPES.MembershipOnboardingPlugin, 'MembershipOnboardingPlugin');

    // === Add more plugins here as they are created ===
    // registerPluginFromContainer(TYPES.FinanceOnboardingPlugin, 'FinanceOnboardingPlugin');
    // registerPluginFromContainer(TYPES.EventsOnboardingPlugin, 'EventsOnboardingPlugin');
    // registerPluginFromContainer(TYPES.GroupsOnboardingPlugin, 'GroupsOnboardingPlugin');

    pluginsInitialized = true;

    console.log(
      `[FeatureOnboarding] Initialized ${FeatureOnboardingRegistry.getRegisteredFeatureCodes().length} plugins:`,
      FeatureOnboardingRegistry.getRegisteredFeatureCodes()
    );
  } catch (error) {
    console.error('[FeatureOnboarding] Failed to initialize plugins:', error);
    // Don't throw - allow registration to continue without plugins
  }
}

/**
 * Helper to register a plugin from the DI container
 */
function registerPluginFromContainer(typeSymbol: symbol, pluginName: string): void {
  try {
    if (!container.isBound(typeSymbol)) {
      console.warn(
        `[FeatureOnboarding] Plugin ${pluginName} not bound in container, skipping`
      );
      return;
    }

    const plugin = container.get<MembershipOnboardingPlugin>(typeSymbol);
    FeatureOnboardingRegistry.register(plugin);
  } catch (error) {
    console.error(`[FeatureOnboarding] Failed to register ${pluginName}:`, error);
  }
}

/**
 * Reset plugin initialization (for testing)
 */
export function resetPluginInitialization(): void {
  pluginsInitialized = false;
  FeatureOnboardingRegistry.clear();
}
