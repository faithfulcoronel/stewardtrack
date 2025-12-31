import 'server-only';

import type { IFeatureOnboardingPlugin } from './types';

/**
 * Registry for feature onboarding plugins
 *
 * This is a singleton that holds all registered plugins.
 * Plugins register themselves when their module is loaded.
 *
 * The registry is responsible for:
 * - Storing plugin instances by feature code
 * - Providing access to plugins for the orchestrator
 * - Handling plugin dependencies and ordering
 */
class FeatureOnboardingRegistryClass {
  private plugins: Map<string, IFeatureOnboardingPlugin> = new Map();

  /**
   * Register a plugin with the registry
   *
   * @param plugin The plugin to register
   * @throws Error if a plugin with the same featureCode is already registered
   */
  register(plugin: IFeatureOnboardingPlugin): void {
    if (this.plugins.has(plugin.featureCode)) {
      console.warn(
        `[FeatureOnboardingRegistry] Plugin already registered for feature: ${plugin.featureCode}. Replacing...`
      );
    }

    this.plugins.set(plugin.featureCode, plugin);
    console.log(
      `[FeatureOnboardingRegistry] Registered plugin: ${plugin.name} (${plugin.featureCode})`
    );
  }

  /**
   * Unregister a plugin (useful for testing)
   */
  unregister(featureCode: string): boolean {
    return this.plugins.delete(featureCode);
  }

  /**
   * Get a plugin by feature code
   */
  get(featureCode: string): IFeatureOnboardingPlugin | undefined {
    return this.plugins.get(featureCode);
  }

  /**
   * Check if a plugin is registered for a feature
   */
  has(featureCode: string): boolean {
    return this.plugins.has(featureCode);
  }

  /**
   * Get all registered plugins
   */
  getAll(): IFeatureOnboardingPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get all plugins sorted by priority (lower priority first)
   * Also handles dependencies - plugins with dependencies come after their dependencies
   */
  getAllSorted(): IFeatureOnboardingPlugin[] {
    const plugins = this.getAll();

    // First, sort by priority
    const sortedByPriority = plugins.sort((a, b) => a.priority - b.priority);

    // Then, do a topological sort to handle dependencies
    return this.topologicalSort(sortedByPriority);
  }

  /**
   * Get plugins that match the given feature codes
   * Returns them in dependency-respecting order
   */
  getPluginsForFeatures(featureCodes: string[]): IFeatureOnboardingPlugin[] {
    const matchingPlugins = this.getAllSorted().filter((plugin) =>
      featureCodes.includes(plugin.featureCode)
    );

    return matchingPlugins;
  }

  /**
   * Clear all registered plugins (useful for testing)
   */
  clear(): void {
    this.plugins.clear();
  }

  /**
   * Get list of all registered feature codes
   */
  getRegisteredFeatureCodes(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Topological sort to respect dependencies
   * Plugins with dependencies will come after their dependencies
   */
  private topologicalSort(plugins: IFeatureOnboardingPlugin[]): IFeatureOnboardingPlugin[] {
    const result: IFeatureOnboardingPlugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>(); // For cycle detection

    const pluginMap = new Map(plugins.map((p) => [p.featureCode, p]));

    const visit = (plugin: IFeatureOnboardingPlugin) => {
      if (visited.has(plugin.featureCode)) {
        return;
      }

      if (visiting.has(plugin.featureCode)) {
        console.warn(
          `[FeatureOnboardingRegistry] Circular dependency detected for: ${plugin.featureCode}`
        );
        return;
      }

      visiting.add(plugin.featureCode);

      // Visit dependencies first
      for (const depCode of plugin.dependencies) {
        const depPlugin = pluginMap.get(depCode);
        if (depPlugin) {
          visit(depPlugin);
        }
      }

      visiting.delete(plugin.featureCode);
      visited.add(plugin.featureCode);
      result.push(plugin);
    };

    for (const plugin of plugins) {
      visit(plugin);
    }

    return result;
  }
}

/**
 * Singleton instance of the registry
 */
export const FeatureOnboardingRegistry = new FeatureOnboardingRegistryClass();

/**
 * Decorator to automatically register a plugin when the class is defined
 *
 * @example
 * ```typescript
 * @RegisterFeaturePlugin
 * @injectable()
 * export class MembershipOnboardingPlugin extends BaseFeatureOnboardingPlugin {
 *   // ...
 * }
 * ```
 */
export function RegisterFeaturePlugin<T extends new (...args: never[]) => IFeatureOnboardingPlugin>(
  constructor: T
): T {
  // Create an instance and register it
  // Note: This works for classes with no constructor args
  // For DI-managed plugins, use explicit registration
  const instance = new constructor();
  FeatureOnboardingRegistry.register(instance);
  return constructor;
}
