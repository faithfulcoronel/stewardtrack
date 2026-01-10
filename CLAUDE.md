# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Project Overview

StewardTrack is a **multi-platform church management SaaS application** built as a **Turborepo monorepo**. It features a metadata-driven architecture where pages are authored in XML and interpreted at runtime. The system supports multi-tenant operations with sophisticated RBAC (Role-Based Access Control), licensing, and onboarding flows.

**Core Domain:** Church operations (membership management, donations, finances, events)
**Key Innovation:** XML-based page definitions compiled to JSON, resolved through a layered registry, and rendered via React interpreter
**Platforms:** Web (Next.js), iOS (Capacitor), Android (Capacitor)

## Monorepo Structure

```
stewardtrack/
├── apps/
│   ├── web/                    # Next.js 16 web application
│   │   ├── src/                # Application source code
│   │   ├── public/             # Static assets
│   │   ├── metadata/           # XML page definitions
│   │   ├── tools/              # Build tools (metadata compiler)
│   │   └── e2e/                # Playwright tests
│   └── mobile/                 # Capacitor mobile app (iOS/Android)
├── packages/
│   ├── shared-types/           # Shared TypeScript types
│   ├── api-client/             # Supabase client wrapper
│   ├── native-bridge/          # Native platform APIs
│   └── config/                 # Shared configurations
├── supabase/                   # Database migrations & functions
├── docs/                       # Documentation
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace definition
└── package.json                # Root package.json
```

## Essential Commands

### Development
```bash
pnpm dev                       # Start all apps in dev mode
pnpm dev:web                   # Start web app only (Next.js with Turbopack)
pnpm build                     # Build all packages and apps
pnpm build:web                 # Build web app only
pnpm lint                      # Run ESLint across monorepo
```

### Metadata Pipeline
```bash
pnpm metadata:compile          # Validate XML, compile to JSON, update registry
pnpm --filter @stewardtrack/web metadata:watch    # Watch authoring files for changes
pnpm --filter @stewardtrack/web metadata:types    # Regenerate TypeScript types
```

### Mobile (Phase 3+)
```bash
pnpm mobile:sync               # Sync web build to native projects
pnpm mobile:ios                # Open iOS project in Xcode
pnpm mobile:android            # Open Android project in Android Studio
pnpm mobile:run:ios            # Run on iOS simulator
pnpm mobile:run:android        # Run on Android emulator
```

### Supabase (Local)
```bash
npx supabase start             # Start local Supabase stack
npx supabase db push           # Apply migrations to local database
npx supabase db reset          # Reset database and rerun migrations
npx supabase stop              # Stop local Supabase stack
```

## Architecture

### Metadata System (Core Feature)

The metadata system allows pages to be defined in XML and rendered dynamically without writing React code:

**1. Authoring (XML)** → **2. Compilation (JSON)** → **3. Registry** → **4. Resolution (Layering)** → **5. Interpretation (React)**

#### Key Files & Flow
- **Authoring:** `apps/web/metadata/authoring/blueprints/` and `apps/web/metadata/authoring/overlays/`
- **Schema:** `apps/web/metadata/xsd/page-definition.xsd`
- **Compiler:** `apps/web/tools/metadata/compile.ts` → validates XML against XSD, transforms to canonical JSON
- **Compiled Output:** `apps/web/metadata/compiled/` (versioned JSON artifacts)
- **Registry:** `apps/web/metadata/registry/manifest.json` (maps module/route → artifact paths)
- **Resolver:** `apps/web/src/lib/metadata/resolver.ts` (merges base + overlays based on tenant/role/variant)
- **Interpreter:** `apps/web/src/lib/metadata/interpreter.tsx` (renders React components from canonical JSON)
- **Component Registry:** `apps/web/src/lib/metadata/component-registry.ts` (maps type strings → React components)

#### Metadata Pipeline Workflow
1. Author XML in `apps/web/metadata/authoring/blueprints/` (base definitions) or `overlays/` (tenant/role customizations)
2. Run `pnpm metadata:compile` to:
   - Validate XML against schema
   - Transform to canonical JSON with checksums
   - Publish to `apps/web/metadata/compiled/` with content versioning
   - Update `manifest.json` with registry entries
3. At runtime, `resolver.ts` resolves layers (base → overlays) based on context (tenant, role, variant)
4. `interpreter.tsx` walks the merged definition and renders React components via component registry
5. RBAC rules in metadata control component visibility per role

#### IMPORTANT: Follow the Metadata XML Framework

**All new admin pages MUST follow the Metadata XML framework.** This is a core architectural decision that enables:
- Tenant-specific page customizations via overlays
- Role-based component visibility
- Dynamic page configuration without code changes
- Consistent page structure across the application

**Required steps for new pages:**
1. Create XML blueprint in `apps/web/metadata/authoring/blueprints/<module>/<page>.xml`
2. Define regions, components, dataSources, and actions in XML
3. Register any new components in `src/lib/metadata/component-registry.ts`
4. Create page route in `apps/web/src/app/admin/<module>/<page>/page.tsx` that uses `renderPage()` or similar resolver
5. Run `pnpm metadata:compile` to compile and register the page
6. Test the page at the appropriate route

**Do NOT create pages that bypass the metadata system** by directly importing and rendering React components without an XML blueprint. This breaks the tenant customization and overlay system.

**When adding/modifying metadata pages:** Always run `pnpm metadata:compile` before testing. The dev server does not auto-recompile metadata.

#### Service-Based Data Binding (CRITICAL)

**All XML-driven pages MUST use service-based data binding.** Do NOT create self-contained components that fetch their own data within XML blueprints. The metadata framework requires data to flow through service handlers.

**Pattern:**
```xml
<Component id="hero" type="HeroSection">
  <Props>
    <Prop name="eyebrow" kind="binding" contract="heroData.eyebrow"/>
    <Prop name="headline" kind="binding" contract="heroData.headline"/>
    <Prop name="metrics" kind="binding" contract="heroData.metrics"/>
  </Props>
</Component>

<DataSources>
  <DataSource id="heroData" kind="service">
    <Contract>
      <Field name="eyebrow" path="eyebrow"/>
      <Field name="headline" path="headline"/>
      <Field name="metrics" path="metrics"/>
    </Contract>
    <Config>
      <Handler>admin-community.module.page.section</Handler>
    </Config>
  </DataSource>
</DataSources>
```

**Service Handler Requirements:**
1. Create handlers in `apps/web/src/lib/metadata/services/admin-<module>.ts`
2. Handler naming convention: `admin-community.<module>.<page>.<section>`
   - Example: `admin-community.scheduler.ministries.list.hero`
   - Example: `admin-community.planning.goals.list.table`
3. Export handlers via `apps/web/src/lib/metadata/services/admin-community.ts`
4. Handlers use InversifyJS container for tenant-aware data access

**Key Service Handler Files:**
- `apps/web/src/lib/metadata/services/admin-community.ts` → Main export aggregator
- `apps/web/src/lib/metadata/services/admin-community-planning.ts` → Planning module handlers
- `apps/web/src/lib/metadata/services/admin-community-scheduler.ts` → Scheduler module handlers

**Common Component Patterns:**
- `HeroSection` (variant: stats-panel) → eyebrow, headline, description, metrics
- `AdminDataGridSection` → rows, columns, filters, actions, emptyState
- `QuickLinks` → links array with title, description, href, icon
- `Timeline` → events array for dashboards

**Reference Implementations:**
- Planning Goals: `metadata/authoring/blueprints/admin-community/planning-goals.xml`
- Service handlers: `src/lib/metadata/services/admin-community-planning.ts`

**Do NOT:**
- Create components that call Supabase/APIs directly from XML blueprints
- Use `kind="static"` for data that should come from the database
- Bypass the service handler pattern with self-contained list/view components

### Multi-Tenancy

**Tenant Resolution:**
- `apps/web/src/lib/tenant/tenant-resolver.ts` → queries `tenant_users` table by authenticated user
- Each request resolves tenant context via `apps/web/src/lib/server/context.ts`
- Metadata overlays support tenant-specific customizations

**Tenant Isolation:**
- Row-Level Security (RLS) policies in Supabase enforce data isolation
- All queries filter by `tenant_id` (via repository pattern)

### RBAC System

**Architecture:** Simplified 2-layer permission system (Roles → Permissions) with feature flags, delegation, and multi-role support.

**Core Entities:**
- **Roles** (`roles` table): Tenant-scoped or system-scoped roles (e.g., `tenant_admin`, `staff`, `volunteer`, `member`)
- **Permissions** (`permissions` table): Granular access rights (e.g., `members:view`, `finance:write`)
- **Role Permissions** (`role_permissions`): Direct mapping of permissions to roles (no bundles)
- **User Roles** (`user_roles`): Many-to-many (user ↔ role) - supports multiple roles per user
- **Delegations** (`delegations`): Simplified role-based delegation with scope (Campus/Ministry) and time limits

**Key Services:**
- `apps/web/src/services/RbacCoreService.ts` → Core role/permission operations
- `apps/web/src/services/RbacFeatureService.ts` → Feature flag grants and license feature management
- `apps/web/src/services/RbacDelegationService.ts` → Simplified delegation workflows
- `apps/web/src/services/RbacPublishingService.ts` → Compile/publish RBAC state changes

**Dependency Injection:** InversifyJS container in `apps/web/src/lib/container.ts` (use `inRequestScope()` for all services)

### Licensing System

**Purpose:** Feature gating via license tiers (Essential, Professional, Enterprise, Premium)

**Key Entities:**
- **Product Offerings** (`product_offerings`): Pricing plans with feature bundles
- **Licenses** (`licenses`): Tenant license assignments
- **License Features** (`license_features`): Available features catalog
- **Tenant Feature Grants** (`tenant_feature_grants`): Active feature access per tenant

**Key Services:**
- `apps/web/src/services/LicensingService.ts` → License management
- `apps/web/src/services/LicenseFeatureService.ts` → Feature grant operations
- `apps/web/src/services/LicenseValidationService.ts` → Compliance checking

### Shared Packages

**@stewardtrack/shared-types** (`packages/shared-types/`)
- Platform types (Platform, DeviceInfo, PlatformCapabilities)
- API types (ApiResponse, PaginationMeta, AuthTokens)
- Shared across web and mobile apps

**@stewardtrack/api-client** (`packages/api-client/`)
- Supabase client wrapper with custom storage adapters
- React hooks (useSession, useUser, useAuth, useQuery)
- Cross-platform authentication support

**@stewardtrack/native-bridge** (`packages/native-bridge/`)
- Platform detection utilities
- Native API abstractions (camera, biometrics, push, storage)
- Capacitor plugin wrappers (Phase 3-4)

### Key Architecture Patterns

**Dependency Injection:** InversifyJS container (`apps/web/src/lib/container.ts`)
- All services/repositories bound in request scope
- Use `@injectable()` decorator on classes
- Inject via constructor with `@inject(TYPES.ServiceName)`

**Repository Pattern:**
- Adapters (`apps/web/src/adapters/*.adapter.ts`) → Convert domain models ↔ database rows
- Repositories (`apps/web/src/repositories/*.repository.ts`) → Data access layer with Supabase client
- Services (`apps/web/src/services/*.ts`) → Business logic, injected with repositories

**Path Aliases:**
- `@/*` maps to `apps/web/src/*` (configured in `apps/web/tsconfig.json`)
- `@stewardtrack/*` for shared packages

## Database

**Provider:** Supabase (Postgres + Auth + RLS)

**Major Tables:**
- `tenants` → Church organizations
- `tenant_users` → User ↔ tenant assignments
- `profiles` → User profile data
- `members` → Church membership records
- `roles`, `permissions`, `user_roles`, `role_permissions` → RBAC
- `licenses`, `license_features`, `tenant_feature_grants` → Licensing
- `product_offerings` → Pricing plans
- `onboarding_progress` → Signup wizard state

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
CAPACITOR_BUILD=true                   # Enable static export for mobile
```

## Common Tasks

### Adding a New Metadata Page
1. Create XML in `apps/web/metadata/authoring/blueprints/<module>/<route>.xml`
2. Define regions, components, dataSources, actions
3. Register components in `apps/web/src/lib/metadata/component-registry.ts` if new
4. Run `pnpm metadata:compile`
5. Access at `/pages/<tenant>/<module>/<route>` or `/admin/<module>/<route>`

### Adding a New Service
1. Create service class in `apps/web/src/services/MyService.ts`
2. Decorate with `@injectable()`
3. Inject dependencies via constructor with `@inject(TYPES.Dependency)`
4. Add type symbol to `apps/web/src/lib/types.ts`
5. Bind in `apps/web/src/lib/container.ts`: `container.bind<MyService>(TYPES.MyService).to(MyService).inRequestScope()`

### Adding a Database Migration
1. Create migration: `npx supabase migration new <description>`
2. Write SQL in `supabase/migrations/<timestamp>_<name>.sql`
3. Apply locally: `npx supabase db push`
4. Test thoroughly before deploying

### Adding a Shared Type
1. Add type to `packages/shared-types/src/`
2. Export from appropriate module (platform, api, or index)
3. Import in apps: `import { MyType } from '@stewardtrack/shared-types'`

## Testing

**Web E2E Tests:** Playwright
```bash
pnpm --filter @stewardtrack/web test:e2e        # Run all tests
pnpm --filter @stewardtrack/web test:e2e:ui     # Interactive mode
pnpm --filter @stewardtrack/web test:e2e:debug  # Debug mode
```

**Mobile Tests (Phase 7):** Detox for iOS/Android

## Troubleshooting

**"No tenant context available"** → User session expired or `tenant_users` record missing
**"Failed to save progress"** → Check RLS policies and user tenant access
**"Module not found: @/*"** → Verify `apps/web/tsconfig.json` paths configuration
**"Module not found: @stewardtrack/*"** → Run `pnpm install` to link workspace packages
**Metadata changes not reflected** → Run `pnpm metadata:compile`
**Supabase connection errors** → Ensure `npx supabase start` is running and env vars set

## Code Style

- **TypeScript:** Strict mode enabled
- **Linting:** ESLint configured in `apps/web/eslint.config.mjs`
- **Unused vars:** Allowed with `_` prefix
- **Formatting:** No automated formatter configured

## Key Concepts

**Monorepo:** Turborepo with pnpm workspaces for shared packages
**Metadata Overlays:** Tenant/role/variant-specific XML patches applied on top of base blueprints
**Feature Permissions:** Features mapped to specific permissions for fine-grained access control
**Delegation:** Temporary role assignments with subset of delegator's permissions
**Feature Flags:** License-based feature gating (checked in metadata evaluation)
**Request Scope:** DI container creates new service instances per request (stateless)
**Server Context:** Resolves tenant/user/roles once per request, cached for reuse
**Cross-Platform:** Capacitor wraps web app for iOS/Android deployment

## References

- **Multi-Platform Plan:** `docs/MULTI-PLATFORM-IMPLEMENTATION-PLAN.md`
- **Phase 4 Quick Reference:** `docs/phase4-developer-quick-reference.md`
- **README:** `README.md`
- **Supabase Docs:** https://supabase.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Turborepo Docs:** https://turbo.build/repo/docs
- **Capacitor Docs:** https://capacitorjs.com/docs
