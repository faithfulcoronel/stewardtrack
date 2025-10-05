# StewardTrack Feature Launch Manual

## Purpose of This Guide
This manual walks product owners, designers, and developers through the full journey of shipping a brand-new capability in StewardTrack—from the first idea, to metadata implementation, into Licensing Studio, and finally through RBAC launch readiness. Each step uses plain language and checklists so new teammates can follow along without prior system knowledge.

---

## End-to-End Lifecycle at a Glance

| Stage | Goal | Primary Owners | Key Outputs |
| --- | --- | --- | --- |
| 0. Kickoff | Align on what we are building and why | Product + Stakeholders | Feature brief, success metrics |
| 1. Design & Author | Capture the user experience and data rules in metadata | Product + UX + Developers | Metadata blueprint, acceptance notes |
| 2. Build & Validate | Implement metadata, connect data sources, and test locally | Developers | Compiled metadata, passing smoke tests |
| 3. Licensing Setup | Make sure the feature can be sold and packaged | Product Ops | Feature record, bundle assignment, product tier updates |
| 4. RBAC Alignment | Ensure the right people can see and use it | Security Admins | Permissions, roles, surface bindings |
| 5. Launch Readiness | Confirm everything works together before go-live | Cross-functional squad | Launch checklist, approval to deploy |

Keep this table nearby—it is the "You Are Here" map for the rest of the guide.

---

## Stage 0 – Kickoff & Preparation

**Goal:** Create a shared understanding of the feature before any files are touched.

1. **Write a one-page feature brief.** Capture the user problem, target audience, and "definition of done." Store it in your team workspace.
2. **List the systems impacted.** Note whether the feature touches metadata pages, backend services, analytics, or external APIs.
3. **Confirm licensing intent early.** Decide whether the feature is part of an existing tier or a new upsell so the Licensing Studio steps are not a surprise later.
4. **Schedule a feature readiness huddle.** Bring product, development, licensing ops, and RBAC admins together. Review the lifecycle table and assign owners.
5. **Create your Git branch.** Use the naming convention `feature/<short-name>` so changes are easy to track. Run `npm install` if this is your first time on the repo.

> ✅ **Output:** Feature brief, ownership list, active branch, and a clear go/no-go decision to enter Stage 1.

---

## Stage 1 – Design & Metadata Authoring Plan

**Goal:** Translate the feature concept into clear metadata artifacts.

1. **Sketch the user flow.** Whiteboard the screens and key actions. Identify which existing page metadata can be extended versus needing a new definition.
2. **Locate the authoring folder.** All metadata blueprints live under `metadata/authoring`, organized by domain and page type.【F:docs/architecture/metadata-architecture.md†L1-L34】
3. **Decide on overlays vs. new pages.** If you are enhancing an existing page, plan to add an overlay XML file. New surfaces get their own folder with `page.xml` and optional overlays.
4. **Document data needs.** List API endpoints, table queries, and any computed values the metadata must expose. Clarify if new Supabase views or actions are required.
5. **Draft metadata acceptance notes.** Before coding, write bullet points for what you expect to see (fields, buttons, RBAC tags, feature switches). These become your testing checklist in Stage 2.

> ✅ **Output:** Wireframes or flow notes, file plan inside `metadata/authoring`, and acceptance bullets saved with the feature brief.

---

## Stage 2 – Build, Compile, and Test Locally

**Goal:** Implement the metadata safely and confirm it works in a local environment.

1. **Create or edit the XML.** Add your new files inside `metadata/authoring` based on the plan from Stage 1. Follow the patterns described in the Metadata Architecture Guide for layouts, data sources, and actions.【F:docs/architecture/metadata-architecture.md†L1-L34】
2. **Validate structure early.** Run the metadata compiler to catch schema issues:
   ```bash
   npm run metadata:compile
   ```
   This command validates the XML, produces compiled JSON, and refreshes the manifest used by the app.【F:package.json†L7-L19】【F:tools/metadata/pipeline/compiler.ts†L15-L74】
3. **Preview in the app.** Start the Next.js dev server with `npm run dev`, navigate to the affected pages, and confirm visuals match your acceptance notes.
4. **Check RBAC directives in metadata.** Use `<RBAC>` tags or equivalent gating to hide controls from unauthorized roles. Note the exact permission keys—you will wire them up in Stage 4.
5. **Update automated checks.** If the feature adds new data types or metadata IDs, ensure tests or snapshots that reference them are refreshed.
6. **Document test results.** Update the acceptance notes with screenshots, console logs, and any follow-up items.

> ✅ **Output:** Compiled metadata artifacts, local screenshots, and a short test log stored with the feature brief.

---

## Stage 3 – Configure Licensing Studio

**Goal:** Make the feature easy to sell, bundle, and assign inside Licensing Studio.

1. **Create or update the feature record.** In Licensing Studio, navigate to **Feature Bundles** and click **Add Features** to register the capability with a clear name and description.【F:docs/user-manual/licensing/licensing-studio-user-guide.md†L173-L216】
2. **Place the feature in bundles.** Add it to the bundle(s) that represent how it will be sold. Mark the feature as *Required* if every subscriber of that bundle must receive it.【F:docs/user-manual/licensing/licensing-studio-user-guide.md†L217-L241】
3. **Review product offerings.** Switch to the **Product Offerings** tab and confirm each tier includes the right bundles. Update pricing copy or notes if the new feature changes the value proposition.【F:docs/user-manual/licensing/licensing-studio-quick-start.md†L23-L38】
4. **Plan customer migration (if needed).** Decide whether existing churches should automatically receive the feature. Coordinate with operations for any staged rollout.
5. **Capture licensing decisions.** Record which bundles and offerings were touched, plus any launch conditions (e.g., "Enterprise-only until Q4"). Store this with the feature brief.

> ✅ **Output:** Feature visible in Licensing Studio, bundle assignments updated, product tiers reviewed, and migration notes documented.

---

## Stage 4 – Align RBAC Roles & Permissions

**Goal:** Guarantee that only the intended audiences can access the new capability.

1. **Inventory existing roles.** Open the RBAC dashboard and review current role definitions to avoid duplicates. The RBAC manual recommends creating specific roles rather than overly broad ones.【F:RBAC_USER_MANUAL.md†L514-L524】
2. **Create or update permission bundles.** If the feature introduces new actions, add them to a permission bundle so they can be reused across roles.【F:RBAC_USER_MANUAL.md†L153-L184】
3. **Bind permissions to surfaces.** Use the Surface Binding Manager to connect the new metadata page or component to the appropriate roles or bundles.【F:RBAC_USER_MANUAL.md†L215-L247】
4. **Test with role-based logins.** Impersonate or use test accounts for each target role. Verify the feature appears only for the correct combinations of licenses and permissions.
5. **Schedule an RBAC review.** Have the security admin confirm mappings and document any temporary overrides or exceptions.

> ✅ **Output:** Permission bundle updates, role assignments, surface bindings, and sign-off from the RBAC admin.

---

## Stage 5 – Launch Readiness & Go-Live

**Goal:** Confirm that metadata, licensing, and RBAC align before opening the feature to real users.

1. **Build the integrated checklist.** Merge the acceptance notes, licensing decisions, and RBAC confirmations into a single launch checklist.
2. **Run pre-flight tests in staging.** Deploy to the staging environment, seed a test tenant with the new license bundle, and exercise the feature end-to-end (happy path + permission edge cases).
3. **Verify telemetry or logging.** Ensure analytics events and audit logs capture usage for post-launch monitoring.
4. **Train support and sales teams.** Share a short briefing covering what changed, who gets the feature, and how to troubleshoot access issues.
5. **Hold the go/no-go meeting.** Review the checklist, confirm monitoring is live, and agree on the launch window and rollback plan.
6. **Deploy and monitor.** After go-live, watch dashboards for usage and error trends. Keep a rollback or feature toggle plan handy for the first 24–48 hours.

> ✅ **Output:** Signed launch checklist, deployment notes, and monitoring plan.

---

## Appendices

### A. Documentation Templates
- **Feature Brief Template:** Problem, target users, success metrics, licensing intent, RBAC impact, rollout plan.
- **Acceptance Notes Template:** Metadata IDs touched, expected UI elements, data sources, RBAC keys, test results.
- **Launch Checklist Template:** Metadata compiled ✔, Licensing bundles updated ✔, RBAC roles approved ✔, Staging smoke test date ✔, Support notified ✔.

### B. Helpful Commands Reference
- `npm run metadata:compile` – Validate and compile metadata before commits.【F:package.json†L7-L19】
- `npm run metadata:watch` – Keep the compiler running while you edit XML so issues are caught immediately.【F:package.json†L10-L14】
- `npm run dev` – Launch the local app for visual testing.
- `npm run rbac:phase1` – Generate an inventory of current roles and permissions when planning RBAC updates.【F:package.json†L14-L15】

### C. Roles & Responsibilities Cheat Sheet
- **Product Owner:** Owns feature brief, licensing decisions, go/no-go call.
- **Developer:** Authors metadata, runs compilers, validates RBAC hooks.
- **Licensing Ops:** Maintains feature bundles and product offerings.
- **Security Admin:** Approves RBAC changes and audits access.
- **Support Lead:** Prepares communications and handles post-launch tickets.

Keep this manual bookmarked. Updating it after each launch keeps the process smooth for the next feature.
