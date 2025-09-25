# RBAC Phase 1 Discovery Toolkit

Phase 1 of the [RBAC architecture plan](./rbac-architecture-plan.md) focuses on cataloguing existing role, permission, menu, and license data while documenting how metadata overlays reference RBAC tokens. The `rbac:phase1` automation included in this repository extracts the relevant datasets and generates inventory reports that highlight potential gaps.

## Prerequisites

The export script connects directly to Supabase using a service role key so that tenant-scoped tables can be read without running into row-level security. Set the following environment variables before running the tool. The script will attempt to hydrate them automatically from `.env.local`, `.env`, `supabase/.env.local`, or `supabase/.env` if those files exist, so you can also store the credentials in one of those files instead of exporting them in your shell:

- `SUPABASE_URL` – The Supabase project URL (e.g., `https://example.supabase.co`).
- `SUPABASE_SERVICE_ROLE_KEY` – The service role key that bypasses row-level security for read access.

> **Note:** The script never mutates data; it issues read-only `select` queries and writes results to local JSON files under `reports/rbac/phase1/`.

## Running the inventory export

```bash
npm run rbac:phase1
```

The command performs three steps:

1. **Dataset export** – Pulls the contents of RBAC and adjacent tables (`roles`, `permissions`, `role_permissions`, `role_menu_items`, `menu_items`, `menu_permissions`, `licenses`, and `license_features`) and saves them to `dataset.json`.
2. **Orphan detection** – Checks that mapping tables reference valid role, permission, and menu item IDs, reporting any missing links in `orphaned-references.json`.
3. **Metadata catalogue** – Scans the XML metadata overlays for `<RBAC>` directives, lists every token encountered, and flags tokens that do not match a role `name` or `code` in `metadata-rbac-usage.json`.

All outputs are ignored by Git (`reports/rbac/.gitignore`) so the inventory can be regenerated frequently without polluting commits.

## Reviewing the results

The three JSON files created by the script provide an immediate snapshot of the current state:

- `dataset.json` – Raw table exports grouped by table name, useful for deeper SQL analysis or spreadsheet inspection.
- `orphaned-references.json` – Arrays of suspect mappings organised by table so engineers can triage missing roles, permissions, or menu items per tenant.
- `metadata-rbac-usage.json` – A per-file breakdown of RBAC directives alongside aggregate token counts and a list of tokens that are not yet backed by database roles.

These exports form the foundation for Phase 2 by clarifying where tenant-specific variations exist and which metadata bindings require normalisation before introducing scoped permissions and surface bindings.
