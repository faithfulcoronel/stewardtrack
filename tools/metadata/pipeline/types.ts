export interface CanonicalLayer {
  module: string;
  route: string;
  tenant: string | null;
  role: string | null;
  variant: string | null;
  locale: string | null;
}

export const OPERATION_VALUES = ['merge', 'replace', 'remove'] as const;
export type Operation = (typeof OPERATION_VALUES)[number];

export type PropValue =
  | { kind: 'static'; value: unknown }
  | { kind: 'binding'; source: string; path?: string | null; fallback?: unknown }
  | { kind: 'expression'; expression: string; fallback?: unknown }
  | { kind: 'action'; actionId: string };

export interface CanonicalDataContractField {
  name: string;
  path: string | null;
  description?: string;
}

export interface CanonicalDataContract {
  fields: Record<string, CanonicalDataContractField>;
}

export interface CanonicalRBAC {
  allow?: string[];
  deny?: string[];
}

export interface CanonicalComponent {
  id: string;
  type?: string;
  namespace?: string;
  version?: string;
  operation?: Operation;
  props?: Record<string, PropValue>;
  children?: CanonicalComponent[];
  rbac?: CanonicalRBAC;
}

export interface CanonicalRegion {
  id: string;
  operation?: Operation;
  components?: CanonicalComponent[];
}

export interface CanonicalDataSource {
  id: string;
  kind: 'static' | 'supabase' | 'http' | 'service';
  operation?: Operation;
  config?: Record<string, unknown>;
  contract?: CanonicalDataContract;
  rbac?: CanonicalRBAC;
}

export interface CanonicalAction {
  id: string;
  kind: string;
  operation?: Operation;
  config?: Record<string, unknown>;
  rbac?: CanonicalRBAC;
}

export interface CanonicalPage {
  id?: string;
  title?: string;
  regions?: CanonicalRegion[];
  components?: CanonicalComponent[];
  dataSources?: CanonicalDataSource[];
  actions?: CanonicalAction[];
}

export interface CanonicalDefinition {
  schemaVersion: string;
  contentVersion: string;
  checksum: string;
  kind: 'blueprint' | 'overlay';
  layer: CanonicalLayer;
  page: CanonicalPage;
  sourcePath: string;
  featureCode?: string | null;
  requiredPermissions?: string | null;
}

export interface ManifestEntry {
  key: string;
  kind: 'blueprint' | 'overlay';
  schemaVersion: string;
  contentVersion: string;
  checksum: string;
  layer: CanonicalLayer;
  sourcePath: string;
  compiledPath: string;
  featureCode?: string | null;
  requiredPermissions?: string | null;
  dependsOn?: string[];
}

export interface ManifestFile {
  generatedAt: string;
  entries: Record<string, ManifestEntry>;
}

export interface CompilationPaths {
  rootDir: string;
  authoringDir: string;
  xsdPath: string;
  compiledDir: string;
  latestDir: string;
  manifestPath: string;
}

export type XmlElement = Record<string, unknown>;

export interface CompilationDiagnostics {
  info(message: string): void;
  warn(message: string): void;
}

export interface CompileTimeContext {
  paths: CompilationPaths;
  diagnostics?: CompilationDiagnostics;
}
