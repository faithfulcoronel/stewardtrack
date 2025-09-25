# StewardTrack

StewardTrack is a Next.js 15 application that pairs a polished public marketing site with Supabase-backed authentication, a dynamic admin workspace, and a metadata-driven page runtime. It gives you a turnkey SaaS foundation that covers landing pages, secure sessions, and tenant-aware dashboards out of the box.【F:src/app/(public)/page.tsx†L5-L134】【F:src/app/admin/page.tsx†L10-L103】【F:package.json†L1-L48】

## What's included

- **Marketing, auth, and admin surfaces** – Responsive landing and pricing sections, a Supabase-powered login flow, and an authenticated admin dashboard ready for customization.【F:src/app/(public)/page.tsx†L5-L134】【F:src/app/(public)/login/page.tsx†L5-L33】【F:src/app/admin/page.tsx†L10-L103】
- **Server-side Supabase session helpers** – Shared browser/server clients built on `@supabase/ssr` keep cookies and redirects in sync across server components and actions.【F:src/lib/supabase/server.ts†L1-L44】【F:src/lib/supabase/client.ts†L1-L8】
- **Metadata runtime for dynamic pages** – Resolve layered XML blueprints and overlays into React output at request time, powering both public experiences and admin modules without per-route React code.【F:src/app/(public)/pages/[tenant]/[module]/[[...segments]]/page.tsx†L1-L75】【F:src/lib/metadata/resolver.ts†L1-L107】【F:src/lib/metadata/interpreter.tsx†L1-L87】
- **Prebuilt membership workspace** – Rich membership dashboards, detail views, and forms authored entirely in metadata to accelerate church operations use cases.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L1-L58】【F:src/app/admin/members/metadata.ts†L1-L41】
- **Registry explorer & UI block library** – Admin tools list compiled metadata modules and showcase reusable hero, pricing, stats, CTA, and testimonial blocks for rapid composition.【F:src/app/admin/modules/page.tsx†L27-L93】【F:src/app/admin/ui-blocks/hero-sections/page.tsx†L1-L50】
- **Supabase Edge email function** – A Deno function integrates with Resend so you can send transactional invites from secure server-side code.【F:supabase/functions/email-service/index.ts†L12-L88】
- **In-depth authoring guide** – Learn how the metadata compiler, registry, and interpreter collaborate in the included architecture documentation.【F:docs/metadata-architecture.md†L1-L118】

## Tech stack

- **Framework:** Next.js 15 with the App Router and Turbopack dev server.【F:package.json†L1-L13】【F:package.json†L31-L48】
- **Language & styling:** TypeScript, React 19, Tailwind CSS 4, and Radix UI primitives.【F:package.json†L31-L68】
- **Backend services:** Supabase authentication, Postgres, and edge functions orchestrated by the Supabase CLI.【F:supabase/config.toml†L1-L142】【F:supabase/functions/email-service/index.ts†L12-L88】
- **Metadata tooling:** Custom compiler, registry, and interpreter for XML-authored pages with typed contracts.【F:tools/metadata/compile.ts†L1-L34】【F:src/lib/metadata/resolver.ts†L1-L107】【F:src/lib/metadata/interpreter.tsx†L1-L87】

## Project structure

| Path | Purpose |
| ---- | ------- |
| `src/app/(public)` | Marketing pages, legal content, and the Supabase sign-in screen rendered with server components.【F:src/app/(public)/page.tsx†L5-L134】【F:src/app/(public)/login/page.tsx†L5-L33】 |
| `src/app/admin` | Authenticated admin routes, the metadata module explorer, and metadata-backed membership experiences.【F:src/app/admin/page.tsx†L10-L103】【F:src/app/admin/modules/[module]/page.tsx†L39-L181】 |
| `src/lib/metadata` | Runtime for resolving layered metadata, evaluating data sources/actions, and rendering React components.【F:src/lib/metadata/resolver.ts†L1-L107】【F:src/lib/metadata/interpreter.tsx†L1-L87】 |
| `metadata/authoring` | XML blueprints and overlays that describe pages, UI blocks, and tenant-specific variations.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L1-L58】 |
| `tools/metadata` | CLI scripts that compile XML into canonical JSON artifacts and publish registry manifests.【F:tools/metadata/compile.ts†L1-L34】 |
| `supabase` | Local Supabase configuration, SQL migrations, and edge functions (e.g., transactional email via Resend).【F:supabase/config.toml†L1-L142】【F:supabase/functions/email-service/index.ts†L12-L88】 |

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   - Required: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for both server and browser Supabase clients.【F:src/lib/supabase/server.ts†L4-L22】【F:src/lib/supabase/client.ts†L3-L7】
   - Optional: set `NEXT_PUBLIC_ENABLE_DYNAMIC_MENU=false` to disable metadata-driven sidebars when tenant data is unavailable.【F:src/services/SidebarService.ts†L29-L33】
   - Edge email function: provide `SUPABASE_SERVICE_ROLE_KEY`/`SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` in the Supabase environment to authorize outbound emails.【F:supabase/functions/email-service/index.ts†L33-L69】

3. **Prepare Supabase**
   - Use the Supabase CLI (`supabase start`) to run the local stack defined in `supabase/config.toml`, then apply SQL migrations in `supabase/migrations`.【F:supabase/config.toml†L1-L142】
   - Seed data is loaded automatically when `db.seed.enabled` is true in the CLI config.【F:supabase/config.toml†L49-L73】

4. **Compile metadata**
   - Run `npm run metadata:compile` once to validate XML, emit canonical JSON, and refresh the registry pointers.【F:package.json†L6-L15】【F:tools/metadata/compile.ts†L5-L28】
   - Use `npm run metadata:watch` during authoring for automatic recompilation, and `npm run metadata:types` after schema changes.【F:package.json†L6-L15】

5. **Start the app**
   - Launch the Next.js dev server with `npm run dev` and browse to `http://localhost:3000` to explore the marketing site and authenticated admin flows.【F:package.json†L6-L11】【F:src/app/(public)/page.tsx†L5-L134】

## Metadata authoring workflow

Author new experiences by iterating on XML instead of React:

1. Create blueprints and overlays under `metadata/authoring`, following the schema and best practices in the architecture guide.【F:metadata/authoring/blueprints/admin-community/membership-dashboard.xml†L1-L58】【F:docs/metadata-architecture.md†L9-L75】
2. Compile metadata to generate canonical JSON artifacts and update the registry manifest consumed at runtime.【F:tools/metadata/compile.ts†L5-L28】【F:src/app/admin/modules/page.tsx†L27-L93】
3. Render pages through the metadata interpreter—public routes under `/pages/[tenant]/[module]/…` and admin membership screens both rely on the same runtime pipeline.【F:src/app/(public)/pages/[tenant]/[module]/[[...segments]]/page.tsx†L1-L75】【F:src/app/admin/members/metadata.ts†L1-L41】【F:src/lib/metadata/interpreter.tsx†L1-L87】

## Supabase Edge email service

Deploy `supabase/functions/email-service` to send transactional emails (e.g., invitations) via Resend using Supabase service-role authentication. The function validates the bearer token, renders HTML templates, and forwards the payload to Resend's API.【F:supabase/functions/email-service/index.ts†L12-L88】 Configure the Resend API key, sender address, and Supabase service role secrets before invoking the function from server actions or background jobs.【F:supabase/functions/email-service/index.ts†L33-L69】

## Useful npm scripts

| Command | Description |
| ------- | ----------- |
| `npm run dev` | Start the Next.js dev server with Turbopack for local development.【F:package.json†L6-L11】 |
| `npm run build` | Create an optimized production build (precompiles metadata via `prebuild`).【F:package.json†L6-L15】 |
| `npm run start` | Serve the production build locally.【F:package.json†L6-L13】 |
| `npm run lint` | Run ESLint across the project.【F:package.json†L6-L15】 |
| `npm run metadata:compile` | Validate XML definitions and publish updated metadata artifacts.【F:package.json†L6-L15】【F:tools/metadata/compile.ts†L5-L28】 |
| `npm run metadata:watch` | Watch metadata authoring files and recompile on change.【F:package.json†L6-L15】 |
| `npm run metadata:types` | Regenerate TypeScript contracts after schema updates.【F:package.json†L6-L15】 |

With the marketing site, Supabase integration, metadata pipeline, and admin tooling in place, StewardTrack lets teams focus on product-specific logic instead of reinventing scaffolding.
