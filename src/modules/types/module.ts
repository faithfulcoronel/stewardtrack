export interface ModuleMetadata {
  /**
   * Unique module identifier.
   */
  id?: string;
  /**
   * Optional human readable name for the module.
   */
  name?: string;
  /**
   * Optional description shown in admin tooling.
   */
  description?: string | null;
  /**
   * Arbitrary configuration payload supplied by the authoring tool.
   */
  config?: Record<string, unknown> | null;
  /**
   * Region/component definitions used to render the module on the client.
   */
  layout?: Record<string, unknown> | null;
  /**
   * Data source configuration for the module.
   */
  dataSources?: Array<Record<string, unknown>> | null;
  /**
   * Additional metadata written by editors.
   */
  extra?: Record<string, unknown> | null;
  [key: string]: unknown;
}
