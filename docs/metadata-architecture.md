# StewardTrack Metadata Architecture Guide

## 1. Purpose and Scope
This document equips developers with a shared understanding of StewardTrack's metadata-driven page runtime and provides hands-on guidance for creating new XML definitions that comply with our plug-and-play design principles.

## 2. High-Level Architecture
StewardTrack treats every page as the composition of layered metadata authored in XML and executed at runtime. The lifecycle consists of four stages:

1. **Authoring** – Page blueprints and overlays are written as XML files under `metadata/authoring`. The XML structure captures layout, component trees, data sources, and actions without requiring React changes.
2. **Compilation** – The `MetadataCompiler` walks the authoring tree, validates each XML file against the XSD, normalizes it into a canonical JSON structure, and enforces authoring rules before publishing compiled artifacts and manifest entries.【F:tools/metadata/pipeline/compiler.ts†L15-L74】【F:tools/metadata/pipeline/publisher.ts†L8-L88】
3. **Registry resolution** – At runtime, the `FileSystemMetadataRegistry` loads the manifest, resolves the applicable blueprint plus overlays for the active tenant/role/variant/locale, and returns the ordered layer list.【F:src/lib/metadata/registry.ts†L39-L151】
4. **Rendering** – The metadata resolver merges layers into a single page definition, evaluates data sources, binds props, and renders React components from the registry, producing the final UI without per-page code.【F:src/lib/metadata/resolver.ts†L17-L132】【F:src/lib/metadata/interpreter.tsx†L1-L67】【F:src/lib/metadata/evaluation.ts†L24-L119】

This pipeline isolates authoring, validation, and execution concerns, enabling SOLID-compliant modularity and reuse.

## 3. Key Concepts
- **Blueprint** – A canonical base page definition that sets the full layout, component IDs, and shared data contracts. Each blueprint targets a module/route and must include a `page id` for downstream overlays to patch.【F:tools/metadata/pipeline/transformer.ts†L53-L118】【F:tools/metadata/pipeline/validators.ts†L26-L61】
- **Overlay** – A partial page definition that applies targeted `merge`, `replace`, or `remove` operations to blueprint regions/components/data without duplicating the base file.【F:tools/metadata/pipeline/transformer.ts†L119-L181】【F:src/lib/metadata/resolver.ts†L46-L129】
- **Layer addressing** – Every definition is keyed by `(tenant, module, route, role, variant, locale)` so the registry can resolve tailored experiences while falling back to the global blueprint.【F:tools/metadata/pipeline/types.ts†L2-L63】【F:src/lib/metadata/registry.ts†L65-L151】
- **Manifest and pointers** – Compiled artifacts are stored under `metadata/compiled`, while the registry writes stable pointers under `metadata/registry/latest` and the manifest catalog to enable cache busting and dependency tracking.【F:tools/metadata/pipeline/publisher.ts†L20-L113】

## 4. Authoring Workflow
Follow these steps whenever you introduce a new page or customization:

1. **Plan the contract**
   - Identify the target `module` and `route`, the required tenant/role/variant/locale scopes, and the shared data needed across components. Blueprint IDs and data source IDs are global within a page, so design them intentionally for reuse and overrides.【F:tools/metadata/pipeline/transformer.ts†L63-L118】【F:tools/metadata/pipeline/validators.ts†L34-L104】

2. **Create the XML blueprint**
   - Start from the `PageDefinition` root with attributes `kind="blueprint"`, `schemaVersion`, `contentVersion`, `module`, and `route`. Blueprints must set a `<Page id="…">` and may declare `<Regions>`, `<DataSources>`, and `<Actions>` sections.【F:tools/metadata/pipeline/transformer.ts†L53-L118】
   - Within `<Regions>`, author `<Region id="…">` nodes. Nest `<Component>` children, assigning stable `id`, `type`, `namespace`, and optional `version` for component resolution.【F:tools/metadata/pipeline/transformer.ts†L136-L181】
  - Use `<Props>` with `<Prop name="…" kind="static|binding|expression|action">` entries to connect data and behaviors. Binding props can reference declarative aliases via `contract="dataSource.field"`, falling back to explicit `source`/`path` pairs when a contract is not present; expression props embed evaluated JavaScript expressions.【F:tools/metadata/pipeline/transformer.ts†L182-L236】【F:src/lib/metadata/evaluation.ts†L70-L118】
  - Register shared data under `<DataSources>`. Declare reusable field aliases inside `<Contract>` and populate static payloads with the XML-first `<Data>` vocabulary (`<Object>`, `<Array>`, `<Field>`, `<Value>`). Legacy `<Json>` and `<Config>` elements remain supported for backwards compatibility. Actions are defined similarly under `<Actions>` with `kind`-specific configs.【F:tools/metadata/pipeline/transformer.ts†L118-L236】
   - Optional `<RBAC allow="role1,role2" deny="…">` attributes can be applied on components, data sources, or actions to restrict runtime visibility.【F:tools/metadata/pipeline/transformer.ts†L166-L224】【F:src/lib/metadata/evaluation.ts†L40-L118】

3. **Add overlays when needed**
   - For tenant/role/variant/locale-specific tweaks, author a second XML file with `kind="overlay"` and the scoped attributes set (e.g., `tenant="acme"`). Overlay payloads live inside an `<Overlay>` element and may target regions, supply loose `<Components>` patches by ID, or adjust data sources/actions using the `operation` attribute (`merge`, `replace`, or `remove`).【F:tools/metadata/pipeline/transformer.ts†L119-L181】【F:src/lib/metadata/resolver.ts†L46-L129】
   - Overlays must reference component/data/action IDs already declared in the blueprint. The validator catches unresolved bindings and ensures overlays actually target a scoped layer.【F:tools/metadata/pipeline/validators.ts†L26-L104】

4. **Compile locally**
   - Run `npm run metadata:compile` to invoke the compiler. It validates XML against the XSD, converts it to canonical JSON, calculates checksums, and updates the manifest/pointer files so the runtime can pick up your changes.【F:package.json†L6-L16】【F:tools/metadata/pipeline/compiler.ts†L26-L74】【F:tools/metadata/pipeline/publisher.ts†L20-L88】
   - For iterative authoring, use `npm run metadata:watch` to recompile on file changes.【F:package.json†L6-L16】
   - If you change the JSON schema, regenerate TypeScript contracts with `npm run metadata:types` before compiling.【F:package.json†L6-L16】【F:src/lib/metadata/generated/canonical.ts†L1-L200】

5. **Verify at runtime**
   - When the Next.js server resolves a page, it calls `resolvePageMetadata` with the current layer request. The resolver loads blueprint+overlays, merges them, computes a cache key, and exposes fingerprints for cache invalidation.【F:src/lib/metadata/resolver.ts†L17-L107】
   - The interpreter evaluates data sources (static, HTTP, or service-backed), materializes action configs, processes bindings/expressions, and renders registered React components. Use tenant/role/locale toggles to verify RBAC logic.【F:src/lib/metadata/interpreter.tsx†L1-L67】【F:src/lib/metadata/evaluation.ts†L24-L119】

## 5. Authoring Best Practices
- **Design for reuse** – Treat each component ID as a reusable anchor point so overlays can surgically extend or replace behavior without forking the entire layout.
- **Keep blueprints canonical** – Avoid tenant-specific logic in blueprints; isolate specialization to overlays so new tenants plug in without touching the base file.
- **Use semantic versions** – `schemaVersion`, `contentVersion`, and component versions must follow semver so the registry can order and compare artifacts deterministically.【F:tools/metadata/pipeline/validators.ts†L14-L43】【F:tools/metadata/pipeline/publisher.ts†L60-L82】
- **Validate bindings** – Prefer contract aliases so typos are caught when the compiler expands them. When you must use raw bindings, ensure every `binding` prop references a declared data source. The validator fails fast on unresolved IDs to maintain contract integrity.【F:tools/metadata/pipeline/validators.ts†L62-L104】
- **Secure with RBAC** – Prefer RBAC scoping over conditional expressions to keep authorization decisions declarative and centralized.【F:src/lib/metadata/evaluation.ts†L40-L118】
- **Document modules** – Keep blueprint directories grouped by module (e.g., `metadata/authoring/blueprints/<module>/…`) so new developers can discover reusable building blocks quickly.

Following this guide ensures each module can be composed via XML first, with backend services and React components layered in only when necessary. The result is a plug-and-play experience where adding a new page is primarily an authoring exercise rather than bespoke application code.
