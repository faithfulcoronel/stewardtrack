# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

StewardTrack is a Next.js 15 church management SaaS application with a **metadata-driven architecture** where pages are authored in XML and interpreted at runtime. The system supports multi-tenant operations with sophisticated RBAC (Role-Based Access Control), licensing, and onboarding flows.

**Core Domain:** Church operations (membership management, donations, finances, events)
**Key Innovation:** XML-based page definitions compiled to JSON, resolved through a layered registry, and rendered via React interpreter

## Essential Commands

### Development
```bash
npm run dev                    # Start Next.js dev server with Turbopack
npm run build                  # Production build (runs metadata:compile prebuild)
npm run lint                   # Run ESLint
```

### Metadata Pipeline
```bash
npm run metadata:compile       # Validate XML, compile to JSON, update registry
npm run metadata:watch         # Watch authoring files for changes
npm run metadata:types         # Regenerate TypeScript types after schema updates
```

### Supabase (Local)
```bash
npx supabase start            # Start local Supabase stack
npx supabase db push          # Apply migrations to local database
npx supabase db reset         # Reset database and rerun migrations
npx supabase stop             # Stop local Supabase stack
```

## Architecture

### Metadata System (Core Feature)

The metadata system allows pages to be defined in XML and rendered dynamically without writing React code:

**1. Authoring (XML)** → **2. Compilation (JSON)** → **3. Registry** → **4. Resolution (Layering)** → **5. Interpretation (React)**

#### Key Files & Flow
- **Authoring:** `metadata/authoring/blueprints/` and `metadata/authoring/overlays/`
- **Schema:** `metadata/xsd/page-definition.xsd`
- **Compiler:** `tools/metadata/compile.ts` → validates XML against XSD, transforms to canonical JSON
- **Compiled Output:** `metadata/compiled/` (versioned JSON artifacts)
- **Registry:** `metadata/registry/manifest.json` (maps module/route → artifact paths)
- **Resolver:** `src/lib/metadata/resolver.ts` (merges base + overlays based on tenant/role/variant)
- **Interpreter:** `src/lib/metadata/interpreter.tsx` (renders React components from canonical JSON)
- **Component Registry:** `src/lib/metadata/component-registry.ts` (maps type strings → React components)

#### Metadata Pipeline Workflow
1. Author XML in `metadata/authoring/blueprints/` (base definitions) or `overlays/` (tenant/role customizations)
2. Run `npm run metadata:compile` to:
   - Validate XML against schema
   - Transform to canonical JSON with checksums
   - Publish to `metadata/compiled/` with content versioning
   - Update `manifest.json` with registry entries
3. At runtime, `resolver.ts` resolves layers (base → overlays) based on context (tenant, role, variant)
4. `interpreter.tsx` walks the merged definition and renders React components via component registry
5. RBAC rules in metadata control component visibility per role

**When adding/modifying metadata pages:** Always run `npm run metadata:compile` before testing. The dev server does not auto-recompile metadata.

### Multi-Tenancy

**Tenant Resolution:**
- `src/lib/tenant/tenant-resolver.ts` → queries `tenant_users` table by authenticated user
- Each request resolves tenant context via `src/lib/server/context.ts`
- Metadata overlays support tenant-specific customizations

**Tenant Isolation:**
- Row-Level Security (RLS) policies in Supabase enforce data isolation
- All queries filter by `tenant_id` (via repository pattern)

### RBAC System

**Architecture:** Multi-layered permission system with roles, permissions, bundles, delegation, and feature flags.

**Core Entities:**
- **Roles** (`roles` table): Tenant-scoped or system-scoped roles (e.g., `tenant_admin`, `staff`, `volunteer`, `member`)
- **Permissions** (`permissions` table): Granular access rights (e.g., `members:read`, `finance:write`)
- **Permission Bundles** (`permission_bundles`, `permission_bundle_permissions`): Reusable permission groups
- **User Roles** (`user_roles`): Many-to-many (user ↔ role)
- **Delegation** (`delegations`, `delegation_permissions`): Temporary role assignments with scoped permissions

**Key Services:**
- `src/services/RbacCoreService.ts` → Core role/permission operations
- `src/services/RbacFeatureService.ts` → Feature flag grants and license feature management
- `src/services/RbacDelegationService.ts` → Delegation workflows
- `src/services/RbacPublishingService.ts` → Compile/publish RBAC state changes

**Dependency Injection:** InversifyJS container in `src/lib/container.ts` (use `inRequestScope()` for all services)

### Licensing System

**Purpose:** Feature gating via license tiers (Essential, Professional, Enterprise, Premium)

**Key Entities:**
- **Product Offerings** (`product_offerings`): Pricing plans with feature bundles
- **Licenses** (`licenses`): Tenant license assignments
- **License Features** (`license_features`): Available features catalog
- **License Feature Bundles** (`license_feature_bundles`): Features grouped by plan
- **Tenant Feature Grants** (`tenant_feature_grants`): Active feature access per tenant
- **Surface License Bindings** (`surface_license_bindings`): UI surfaces requiring specific licenses

**Key Services:**
- `src/services/LicensingService.ts` → License management
- `src/services/LicenseFeatureService.ts` → Feature grant operations
- `src/services/LicenseValidationService.ts` → Compliance checking
- `src/services/LicenseMonitoringService.ts` → Health monitoring

**Feature Flag Checks:**
```typescript
// In metadata evaluation.ts or component code
if (!context.featureFlags?.['advanced_reporting']) {
  return null; // Hide component if feature not granted
}
```

### Onboarding Flow

**Route:** `/signup` → `/signup/register` → `/onboarding` → `/admin`

**Registration (`src/app/api/auth/register/route.ts`):**
1. Creates Supabase auth user
2. Creates tenant record with subdomain
3. Seeds 4 default RBAC roles (admin, staff, volunteer, member)
4. Assigns user to `tenant_admin` role
5. Grants license features based on selected plan
6. Creates `onboarding_progress` record

**Onboarding Wizard (`src/app/(protected)/onboarding/page.tsx`):**
- Multi-step wizard (Welcome → Church Details → RBAC Setup → Feature Tour → Complete)
- Progress saved to `onboarding_progress` table (JSONB columns per step)
- API endpoints: `/api/onboarding/save-progress`, `/api/onboarding/complete`

### Key Architecture Patterns

**Dependency Injection:** InversifyJS container (`src/lib/container.ts`)
- All services/repositories bound in request scope
- Use `@injectable()` decorator on classes
- Inject via constructor with `@inject(TYPES.ServiceName)`

**Repository Pattern:**
- Adapters (`src/adapters/*.adapter.ts`) → Convert domain models ↔ database rows
- Repositories (`src/repositories/*.repository.ts`) → Data access layer with Supabase client
- Services (`src/services/*.ts`) → Business logic, injected with repositories

**Server Context Resolution:**
- `src/lib/server/context.ts` → Resolves tenant, user, roles per request
- Used in API routes and server components
- Caches session data to minimize Supabase queries

**Path Aliases:** `@/*` maps to `src/*` (configured in `tsconfig.json`)

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Marketing pages, login, signup
│   ├── (protected)/       # Onboarding wizard
│   ├── admin/             # Authenticated admin pages
│   └── api/               # Next.js API routes
├── lib/
│   ├── metadata/          # Metadata system (resolver, interpreter, registry)
│   ├── supabase/          # Supabase client/server helpers
│   ├── tenant/            # Tenant resolution, session cache, RBAC seeding
│   ├── rbac/              # RBAC utilities
│   └── container.ts       # DI container
├── services/              # Business logic services (70+ services)
├── repositories/          # Data access layer
├── adapters/              # Domain ↔ database conversion
├── components/            # React components (UI library + domain)
└── types/                 # TypeScript type definitions

metadata/
├── authoring/
│   ├── blueprints/        # Base XML page definitions
│   └── overlays/          # Tenant/role/variant customizations
├── compiled/              # Generated canonical JSON artifacts
├── registry/              # Manifest + latest symlinks
└── xsd/                   # XML schema definition

supabase/
├── config.toml            # Local Supabase configuration
├── migrations/            # Database migrations (100+ files)
└── functions/             # Edge functions (e.g., email-service)

tools/
└── metadata/              # Compiler, type generator, validators
```

## Database

**Provider:** Supabase (Postgres + Auth + RLS)

**Major Tables:**
- `tenants` → Church organizations
- `tenant_users` → User ↔ tenant assignments
- `profiles` → User profile data
- `members` → Church membership records
- `roles`, `permissions`, `user_roles`, `permission_bundles` → RBAC
- `licenses`, `license_features`, `tenant_feature_grants` → Licensing
- `product_offerings` → Pricing plans
- `onboarding_progress` → Signup wizard state
- `feature_catalog`, `feature_permissions` → Feature-to-permission mappings
- `delegations`, `delegation_permissions` → Temporary access

**Migrations:** 100+ files in `supabase/migrations/` (applied sequentially by timestamp)

**RLS Policies:** Enforce tenant isolation and role-based access

## Environment Variables

**Required:**
```env
NEXT_PUBLIC_SUPABASE_URL          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     # Supabase anonymous key (client-side)
SUPABASE_SERVICE_ROLE_KEY         # Service role key (server-side only)
```

**Optional:**
```env
NEXT_PUBLIC_ENABLE_DYNAMIC_MENU=false  # Disable metadata-driven sidebars
RESEND_API_KEY                         # For email edge function
RESEND_FROM_EMAIL                      # Sender email address
```

## Common Tasks

### Adding a New Metadata Page
1. Create XML in `metadata/authoring/blueprints/<module>/<route>.xml`
2. Define regions, components, dataSources, actions
3. Register components in `src/lib/metadata/component-registry.ts` if new
4. Run `npm run metadata:compile`
5. Access at `/pages/<tenant>/<module>/<route>` or `/admin/<module>/<route>`

### Adding a New Service
1. Create service class in `src/services/MyService.ts`
2. Decorate with `@injectable()`
3. Inject dependencies via constructor with `@inject(TYPES.Dependency)`
4. Add type symbol to `src/lib/types.ts`
5. Bind in `src/lib/container.ts`: `container.bind<MyService>(TYPES.MyService).to(MyService).inRequestScope()`

### Adding a Database Migration
1. Create migration: `npx supabase migration new <description>`
2. Write SQL in `supabase/migrations/<timestamp>_<name>.sql`
3. Apply locally: `npx supabase db push`
4. Test thoroughly before deploying

### Modifying RBAC
- Roles/permissions are seeded in `src/lib/tenant/seedDefaultRBAC.ts` during registration
- Permission bundles defined in database (manageable via admin UI)
- Features mapped to permissions via `feature_permissions` table for fine-grained access control

## Testing

**No dedicated test framework configured.** Manual testing workflow:
1. Start local Supabase: `npx supabase start`
2. Apply migrations: `npx supabase db push`
3. Start dev server: `npm run dev`
4. Test flows end-to-end in browser

**Manual Test Checklist (Onboarding):**
- `/signup` → pricing plans display
- `/signup/register` → form submission creates account
- `/onboarding` → wizard steps save progress
- `/admin` → dashboard loads after completion

## Troubleshooting

**"No tenant context available"** → User session expired or `tenant_users` record missing
**"Failed to save progress"** → Check RLS policies and user tenant access
**"Module not found: @/*"** → Verify `tsconfig.json` paths configuration
**Metadata changes not reflected** → Run `npm run metadata:compile`
**Supabase connection errors** → Ensure `npx supabase start` is running and env vars set

## Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint configured but currently disabled (`ignores: ['**/*']` in `eslint.config.mjs`)
- **Unused vars:** Allowed with `_` prefix
- **Formatting:** No automated formatter configured

## Key Concepts

**Metadata Overlays:** Tenant/role/variant-specific XML patches applied on top of base blueprints (merged by ID)
**Feature Permissions:** Features mapped to specific permissions for fine-grained access control (e.g., "advanced_reporting" feature requires `reports:advanced` permission)
**Delegation:** Temporary role assignments with subset of delegator's permissions
**Feature Flags:** License-based feature gating (checked in metadata evaluation)
**Request Scope:** DI container creates new service instances per request (stateless)
**Server Context:** Resolves tenant/user/roles once per request, cached for reuse
**Content Versioning:** Metadata artifacts versioned by checksum to support safe caching

## References

- **Phase 4 Quick Reference:** `docs/phase4-developer-quick-reference.md` (onboarding implementation details)
- **README:** `README.md` (overview, tech stack, project structure)
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
