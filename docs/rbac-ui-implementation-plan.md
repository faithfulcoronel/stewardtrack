# RBAC UI Module Implementation Plan (Metadata-Driven)

## 1. Market & Persona Insights
- StewardTrack targets congregations of varying sizes, so the RBAC UI must accommodate small churches that need simplified forms, midsize churches pursuing automation and collaboration, and large multi-site churches demanding cross-campus analytics and delegated access controls.
- Implementation specialists expect self-service guides for metadata layouts, RBAC configuration, and automation templates, implying that the UI must expose clear configuration journeys and contextual help for non-technical church staff.
- The platform already emphasizes a prebuilt metadata-authored membership workspace, meaning any RBAC UI should seamlessly align with metadata-defined components and overlays that congregations can tailor without shipping React changes.

## 2. Design Principles for the RBAC UI
- Keep RBAC controls metadata-first: all pages, dialogs, and wizards should be defined in XML blueprints/overlays so multi-tenant variations and delegated experiences ship through the existing compiler and registry pipeline.
- Support role/bundle registries and multi-role context so `<RBAC>` directives can evaluate deterministic arrays instead of the single-role limitation in today’s runtime, enabling campus-level delegation patterns highlighted in the target architecture plan.
- Maintain visual parity with the admin workspace: leverage existing metadata component IDs so navigation bindings can transition from `role_menu_items` to the planned `rbac_surface_bindings` without UI rewrites.

## 3. UI Capability Breakdown
1. **Role & Bundle Explorer**
   - Metadata blueprint delivering a grid of roles, permission bundles, scope tags, and linked surface bindings.
   - Overlay support for tenant-specific bundles to reflect licensed features once the `rbac_surface_bindings` table is live.
2. **Permission Bundle Composer**
   - Guided wizard (metadata overlay) to assemble `permission_actions` into reusable bundles, capturing system/tenant/delegated scopes introduced in the database plan.
3. **Surface Binding Manager**
   - Metadata-defined detail pane showing linked menu items, metadata overlay IDs, and feature codes so administrators confirm UI exposure respects license gating.
4. **Delegated Access Console**
   - Tenant overlays for campus pastors or ministry leads, surfacing filtered member lists and RBAC assignments tailored to their scope (drawn from the adoption strategy across church sizes).
5. **Audit & Publishing Dashboard**
   - Metadata-driven timeline summarizing recent RBAC changes, pending compilations, and materialized view refresh status to reinforce operational rigor.

## 4. Phased Implementation Approach

| Phase | Objectives | Key Metadata Deliverables |
| --- | --- | --- |
| **Phase A – Foundation Alignment** | Catalogue current `<RBAC>` usage and component IDs, define blueprint skeletons, and document role/bundle vocabulary mappings for the upcoming registry. | - `admin-security/rbac-dashboard.xml` blueprint with placeholder regions for explorer, composer, bindings, audit.<br>- Registry metadata to map existing roles to canonical keys for future bundle registry. |
| **Phase B – Role & Bundle Management** | Publish role explorer and bundle composer experiences with metadata overlays for small vs. large congregations, ensuring self-service documentation is embedded via metadata tooltips. | - Static data sources for mock bundle scopes, later wired to Supabase services.<br>- Overlay templates for tenant-specific scope filters. |
| **Phase C – Surface Binding Integration** | Replace role-menu dependencies with `rbac_surface_bindings` UI, exposing linked menu items and metadata overlays, and simulate license-aware gating signals in metadata props to prepare for backend enforcement. | - New metadata data sources referencing binding registry.<br>- Conditional components tied to feature codes to mirror license checks. |
| **Phase D – Delegated Consoles & Multi-Role Runtime** | Update metadata evaluation context to support role arrays, then author overlays granting campus-specific RBAC pages for delegated personas. | - Metadata schema updates to accept multi-role arrays once runtime is extended.<br>- Overlays for campus pastor dashboards showing scoped RBAC assignments. |
| **Phase E – Operational Dashboards & Automation** | Deliver audit widgets tied to materialized view refresh status and compile triggers, aligning UI feedback with backend automation goals. | - Metadata actions invoking service handlers that surface refresh health, recent changes, and pending publishing tasks. |

## 5. Risks & Mitigations
- **Runtime gaps for multi-role evaluation**: Extend `MetadataEvaluationContext` to accept arrays before shipping multi-role overlays; coordinate with backend registry updates to avoid inconsistent tokens.
- **License mismatch visibility**: Surface feature entitlements directly in the UI and warn administrators when a bundle references unlicensed capabilities, anticipating the upcoming license-aware gating in Supabase.
- **Authoring complexity for non-technical staff**: Provide metadata starter kits and inline help within the RBAC UI to uphold the self-service goal expressed in user stories.
