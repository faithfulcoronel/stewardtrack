# StewardTrack Data Layer Architecture Guide

## 1. Purpose and Scope
This guide explains how StewardTrack's server-side data layer is composed, how requests flow through its building blocks, and how to introduce new entities safely. It supplements the metadata architecture guide by focusing specifically on repositories, adapters, and the supporting infrastructure that mediates access to Supabase.

## 2. Layered Architecture Overview
The data layer is organized as a sequence of collaborating abstractions that keep persistence logic isolated from page metadata and React components:

1. **Models** describe the shape of domain records. Every model extends the shared `BaseModel`, which already includes tenant scoping and auditing fields inherited from the generic `Entity` contract.【F:src/models/base.model.ts†L1-L10】【F:src/lib/repository/types.ts†L3-L33】
2. **Adapters** encapsulate all Supabase communication. The generic `BaseAdapter` provides tenant-aware query construction, filter translation, lifecycle hooks, relation helpers, and soft-deletion enforcement. Concrete adapters only need to configure table metadata and override hooks for entity-specific rules.【F:src/adapters/base.adapter.ts†L17-L566】
3. **Repositories** implement business workflows on top of adapters. `BaseRepository` offers CRUD methods that delegate to adapters while exposing overrideable hooks for validation, formatting, notification, and cascading behaviour.【F:src/repositories/base.repository.ts†L1-L84】
4. **Services and controllers** depend on repositories via Inversify tokens declared in `TYPES`. This keeps the composition root loosely coupled and allows unit tests to replace repositories or adapters with fakes.【F:src/lib/types.ts†L1-L112】
5. **Notification and auditing utilities** provide side-channel feedback when repositories mutate data. For example, `NotificationService` forwards success/error messages, and adapters can inject other services (such as `AuditService`) for post-commit actions.【F:src/services/NotificationService.ts†L3-L57】【F:src/adapters/chartOfAccount.adapter.ts†L55-L108】

### Request Flow
At runtime, a server action or service method calls into a repository. The repository runs its pre-hook, then delegates to the adapter. The adapter builds a secure Supabase query using the request context (tenant ID, user ID, and roles) to enforce tenant isolation and apply soft-delete filters before executing the request.【F:src/adapters/base.adapter.ts†L211-L473】【F:src/lib/server/context.ts†L1-L7】 After Supabase responds, the adapter enriches records with user display names and returns data to the repository, which can run post-hooks and trigger notifications.【F:src/adapters/base.adapter.ts†L28-L66】【F:src/repositories/chartOfAccount.repository.ts†L35-L64】

## 3. Query Construction and Filtering
The `QueryOptions` contract allows callers to shape a query without touching Supabase APIs directly.【F:src/lib/repository/query.ts†L3-L31】 The base adapter translates these options into PostgREST syntax:

- **Select clauses** default to the adapter's `defaultSelect`, but callers can override `select` to fetch additional columns or relationships.【F:src/adapters/base.adapter.ts†L211-L234】
- **Filters** accept structured operators (`eq`, `between`, `contains`, and more) or raw `or` expressions. `buildFilterQuery` maps them to Supabase filter calls so developers can build complex predicates declaratively.【F:src/adapters/base.adapter.ts†L98-L182】
- **Relationships** are built from a nested description, enabling eager loading of related tables while keeping the adapter in control of join aliases and foreign keys.【F:src/adapters/base.adapter.ts†L184-L209】
- **Ordering and pagination** map directly to Supabase's `order` and `range` APIs, ensuring consistent sort behaviour and page slicing across repositories.【F:src/adapters/base.adapter.ts†L249-L259】

The adapter automatically filters out soft-deleted rows and enforces tenant boundaries unless the request originates from a `super_admin` role, ensuring multi-tenant safety by default.【F:src/adapters/base.adapter.ts†L215-L240】

## 4. Lifecycle Hooks and Cross-Cutting Concerns
Both adapters and repositories expose lifecycle hooks for cross-cutting rules:

- **Adapter hooks** (`onBeforeCreate`, `onAfterCreate`, etc.) run closest to Supabase. They are ideal for low-level guards, audit logging, or enforcing relational integrity. For example, the chart-of-account adapter blocks deletions when transactions or children exist and emits audit events through the injected service.【F:src/adapters/chartOfAccount.adapter.ts†L46-L108】
- **Repository hooks** (`beforeCreate`, `afterDelete`, etc.) run on the server layer. They are best suited for validation, data shaping, and user-facing notifications. The chart-of-account repository trims input, validates business rules, and surfaces success toasts via the notification service.【F:src/repositories/chartOfAccount.repository.ts†L27-L94】

Because adapters receive the request context through Inversify, they can inspect the current tenant, user, or roles, and adapters update relational join tables using the shared helpers when you pass a `relations` map to repository methods.【F:src/adapters/base.adapter.ts†L23-L26】【F:src/adapters/base.adapter.ts†L474-L525】

## 5. Adding a New Entity
Follow these steps to onboard a new entity into the data layer:

1. **Model definition** – Create an interface in `src/models` that extends `BaseModel` and enumerates the entity's columns. This guarantees each record carries tenant and auditing metadata automatically.【F:src/models/base.model.ts†L1-L10】
2. **Adapter implementation** – Add a file under `src/adapters` that extends `BaseAdapter<YourModel>`. Configure `tableName`, `defaultSelect`, and any `defaultRelationships`. Override adapter hooks to enforce low-level constraints or to integrate with other services as needed.【F:src/adapters/base.adapter.ts†L17-L566】
3. **Repository implementation** – Create a class under `src/repositories` that extends `BaseRepository<YourModel>`. Inject the adapter via the appropriate Inversify token, override repository hooks for validation/notifications, and export an interface describing any custom query helpers you add.【F:src/repositories/base.repository.ts†L6-L84】
4. **Dependency injection wiring** – Register Inversify tokens for the adapter and repository in `src/lib/types.ts`, mirroring existing entries. Bindings are resolved via these symbols throughout services, so new tokens keep the system strongly typed.【F:src/lib/types.ts†L1-L112】
5. **Service integration** – If domain services need the new repository, inject it using `@inject(TYPES.YourRepositoryToken)` inside the service constructor. This keeps server actions decoupled from storage details, just like other services in the codebase.【F:src/repositories/chartOfAccount.repository.ts†L1-L24】
6. **Notifications and relations (optional)** – Use the repository hooks to raise `NotificationService` events or pass a `relations` map to CRUD methods to maintain join tables through `updateRelations` instead of writing Supabase logic manually.【F:src/services/NotificationService.ts†L45-L56】【F:src/adapters/base.adapter.ts†L474-L525】

## 6. Best Practices
- **Honor tenant boundaries** – Never bypass `BaseAdapter` for direct Supabase calls unless you replicate its tenant and soft-delete guards. The adapter enforces both automatically through the request context.【F:src/adapters/base.adapter.ts†L215-L240】
- **Keep validation close to the repository** – Use repository pre-hooks for business validation so services stay thin. Validators (like `ChartOfAccountValidator`) are invoked here before the adapter writes data.【F:src/repositories/chartOfAccount.repository.ts†L27-L46】
- **Log meaningful side effects** – Prefer calling `NotificationService` or domain-specific audit services within hooks instead of scattering console logs in services. This centralizes user and admin feedback for data changes.【F:src/services/NotificationService.ts†L15-L56】【F:src/adapters/chartOfAccount.adapter.ts†L55-L108】
- **Leverage `QueryOptions`** – When exposing finder methods, accept or compose `QueryOptions` so callers can extend filters and relationships without modifying adapters. Repositories such as the chart-of-account repo combine custom filters with caller-supplied options to stay flexible.【F:src/lib/repository/query.ts†L3-L31】【F:src/repositories/chartOfAccount.repository.ts†L82-L95】
- **Use relation helpers** – Pass relation ID arrays to repository `create`/`update` calls instead of writing ad-hoc Supabase mutations. The base adapter handles clearing and inserting join rows consistently across many-to-many relationships.【F:src/adapters/base.adapter.ts†L474-L525】
- **Enrich results through adapters** – Keep data massaging (like attaching user display names) in the adapter so every repository benefits from shared enhancements without duplicating work.【F:src/adapters/base.adapter.ts†L42-L66】

By following this architecture, new features can rely on a consistent, tenant-aware data access layer that centralizes validation, auditing, and side effects while keeping Supabase-specific code in one place.
