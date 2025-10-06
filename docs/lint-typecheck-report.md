# Linting and Type Validation Report

## Overview
We reran the stewardship workspace linting and type validation commands to determine the current blocker set. `npm run lint` completed without violations, while the TypeScript compiler surfaced 131 errors across 55 files when invoked with `npx tsc --noEmit --pretty false`.【a57ec4†L1-L6】【F:reports/typecheck-20250204-error-codes.txt†L1-L3】【F:reports/typecheck-20250204-file-counts.txt†L1-L2】

## Commands Executed
- `npm run lint`【a57ec4†L1-L6】
- `npx tsc --noEmit --pretty false` (log captured in `reports/typecheck-20250204.log`)【004202†L1-L2】【F:reports/typecheck-20250204.log†L1-L40】

## Error Inventory
### Error Codes by Frequency
| Count | Error Code | Dominant Failure Pattern | Representative Locations |
| ---: | :-- | :-- | :-- |
| 46 | TS2339 | Property lookups on `never`, mis-scoped repositories, or domain results missing expected members. | `src/repositories/rbac.repository.ts`, `src/app/api/rbac/check-access/route.ts`, `src/lib/rbac/permissionHelpers.ts`【F:reports/typecheck-20250204-error-codes.txt†L3-L3】【F:reports/typecheck-20250204.log†L175-L208】【F:reports/typecheck-20250204.log†L45-L46】【F:reports/typecheck-20250204.log†L158-L160】 |
| 22 | TS2322 | Assigning domain objects to generic `Record<string, unknown>` targets, or widening discriminated unions beyond allowed variants. | `src/services/rbacMetadata.service.ts`, `src/components/admin/rbac/RoleExplorer.tsx`, `src/components/docs/docs-manager.tsx`【F:reports/typecheck-20250204-error-codes.txt†L4-L4】【F:reports/typecheck-20250204.log†L243-L250】【F:reports/typecheck-20250204.log†L59-L60】【F:reports/typecheck-20250204.log†L64-L75】 |
| 15 | TS2345 | Nullable identifiers and optionals passed into helpers that require concrete values, plus DayPicker props missing required attributes. | `src/app/api/auth/register/route.ts`, `src/components/admin/rbac/DelegateAccessDashboard.tsx`, `src/components/admin/rbac/RbacAuditDashboard.tsx`【F:reports/typecheck-20250204-error-codes.txt†L5-L5】【F:reports/typecheck-20250204.log†L32-L39】【F:reports/typecheck-20250204.log†L48-L58】 |
| 9 | TS7006 | Implicit `any` parameters in repository/service callbacks. | `src/repositories/rbac.repository.ts`, `src/repositories/userMemberLink.repository.ts`, `src/services/RbacRegistryService.ts`【F:reports/typecheck-20250204-error-codes.txt†L6-L6】【F:reports/typecheck-20250204.log†L181-L207】【F:reports/typecheck-20250204.log†L221-L235】 |
| 7 | TS1117 | Duplicate keys in shared constant maps. | `src/lib/types.ts`【F:reports/typecheck-20250204-error-codes.txt†L7-L7】【F:reports/typecheck-20250204.log†L161-L167】 |
| 4 | TS2344 | Audit models violating `BaseModel` constraints because nullable tenant identifiers are not widened. | `src/adapters/rbacAudit.adapter.ts`, `src/repositories/rbacAudit.repository.ts`【F:reports/typecheck-20250204-error-codes.txt†L8-L8】【F:reports/typecheck-20250204.log†L14-L21】【F:reports/typecheck-20250204.log†L209-L216】 |
| 3 | TS2307 | Missing module typings for `jest`, `redis`, and `commander`. | `jest.config.ts`, `src/lib/cache/licenseCache.ts`, `src/scripts/healLicenseIssues.ts`【F:reports/typecheck-20250204-error-codes.txt†L9-L9】【F:reports/typecheck-20250204.log†L1-L1】【F:reports/typecheck-20250204.log†L167-L168】【F:reports/typecheck-20250204.log†L229-L229】 |
| 3 | TS2352 | Unsafe casting of data transfer objects to repository record types. | `src/adapters/memberProfile.adapter.ts`, `src/adapters/userRoleManagement.adapter.ts`, `src/repositories/rbac.repository.ts`【F:reports/typecheck-20250204-error-codes.txt†L10-L10】【F:reports/typecheck-20250204.log†L6-L16】【F:reports/typecheck-20250204.log†L22-L23】【F:reports/typecheck-20250204.log†L196-L200】 |
| 3 | TS2769 | Metadata providers and layout wrappers called without the required children. | `src/app/admin/members/metadata.ts`, `src/app/admin/settings/metadata.ts`, `src/lib/metadata/components/admin.tsx`【F:reports/typecheck-20250204-error-codes.txt†L11-L11】【F:reports/typecheck-20250204.log†L24-L31】【F:reports/typecheck-20250204.log†L127-L134】 |
| 3 | TS1238 | Class decorators can’t resolve repository constructors because base repositories are not expressed as abstract newables. | `src/repositories/memberInvitation.repository.ts`, `src/repositories/rbac.repository.ts`, `src/repositories/userMemberLink.repository.ts`【F:reports/typecheck-20250204-error-codes.txt†L12-L12】【F:reports/typecheck-20250204.log†L169-L177】【F:reports/typecheck-20250204.log†L175-L177】【F:reports/typecheck-20250204.log†L217-L220】 |
| 3 | TS2314 | Repository decorators invoked without generic arguments. | Same files as above【F:reports/typecheck-20250204-error-codes.txt†L13-L13】【F:reports/typecheck-20250204.log†L172-L173】【F:reports/typecheck-20250204.log†L178-L178】【F:reports/typecheck-20250204.log†L220-L220】 |
| 2 | TS18047 | Nullability guards missing in licensing product-offering handlers. | `src/app/api/licensing/product-offerings/[id]/features/route.ts`, `[id]/route.ts`【F:reports/typecheck-20250204-error-codes.txt†L14-L14】【F:reports/typecheck-20250204.log†L38-L39】 |
| 2 | TS2552 | Snake_case identifiers leaking into camelCase queries. | `src/lib/audit/licenseAuditQueries.ts`【F:reports/typecheck-20250204-error-codes.txt†L15-L15】【F:reports/typecheck-20250204.log†L110-L111】 |
| 2 | TS2739 | Domain DTOs missing required fields when cast to strongly typed records. | `src/lib/metadata/services/admin-community.ts`, `src/repositories/rbac.repository.ts`【F:reports/typecheck-20250204-error-codes.txt†L16-L16】【F:reports/typecheck-20250204.log†L135-L138】【F:reports/typecheck-20250204.log†L180-L180】 |
| 2 | TS2305 | Service layers importing repository interfaces that are no longer exported. | `src/services/RbacRegistryService.ts`, `src/services/UserRoleService.ts`【F:reports/typecheck-20250204-error-codes.txt†L17-L17】【F:reports/typecheck-20250204.log†L233-L236】 |
| 1 | TS2416 | Adapter overrides not respecting `BaseAdapter` generic signatures. | `src/adapters/licenseFeatureBundle.adapter.ts`【F:reports/typecheck-20250204-error-codes.txt†L18-L18】【F:reports/typecheck-20250204.log†L2-L5】 |
| 1 | TS2353 | Product offering hydrators attaching unsupported literals. | `src/adapters/productOffering.adapter.ts`【F:reports/typecheck-20250204-error-codes.txt†L19-L19】【F:reports/typecheck-20250204.log†L10-L10】 |
| 1 | TS2554 | Metadata action handler invoking schema validator with too few arguments. | `src/app/api/metadata/actions/route.ts`【F:reports/typecheck-20250204-error-codes.txt†L20-L20】【F:reports/typecheck-20250204.log†L40-L43】 |
| 1 | TS2561 | Extra `roles` payload in metadata evaluation wiring. | `src/lib/metadata/evaluation.ts`【F:reports/typecheck-20250204-error-codes.txt†L21-L21】【F:reports/typecheck-20250204.log†L135-L135】 |
| 1 | TS1360 | Narrow `MemberProfileRecord` expectations not satisfied by presentation-layer DTOs. | `src/lib/metadata/services/admin-community.ts`【F:reports/typecheck-20250204-error-codes.txt†L22-L22】【F:reports/typecheck-20250204.log†L135-L138】 |

_See `reports/typecheck-20250204-error-codes.txt` for the raw distribution and the compiler log for the full trace of each diagnostic._【F:reports/typecheck-20250204-error-codes.txt†L1-L22】【F:reports/typecheck-20250204.log†L1-L250】

### Most Impacted Files
The table below lists every file that produced diagnostics during the run, ordered by frequency.

| Count | File |
| ---: | :-- |
| 28 | `src/repositories/rbac.repository.ts` |
| 10 | `src/repositories/userMemberLink.repository.ts` |
| 7 | `src/lib/types.ts` |
| 5 | `src/lib/metadata/actions/admin-community/manage-member/mapper.ts` |
| 4 | `src/lib/metadata/services/admin-community/membershipLookups.ts` |
| 4 | `src/services/rbacMetadata.service.ts` |
| 3 | `src/app/api/auth/register/route.ts` |
| 3 | `src/lib/container.ts` |
| 3 | `src/lib/metadata/actions/admin-community/manage-member/resourceFactory.ts` |
| 3 | `src/repositories/memberInvitation.repository.ts` |
| 3 | `src/services/RbacRegistryService.ts` |
| 3 | `src/services/rbac.service.ts` |
| 2 | _Multiple files with two diagnostics each_ |
| 1 | _Remaining files listed in the source report_ |

Refer to `reports/typecheck-20250204-file-counts.txt` for the full 55-file breakdown, including the single-error modules.【F:reports/typecheck-20250204-file-counts.txt†L1-L55】

## Key Problem Areas
1. **Repository constructors and decorators are out of sync with the dependency injection container.** The `@Repository` decorator expects an abstract constructor, but `BaseRepository` is instantiated without a concrete type argument across RBAC, member invitation, and user-member link repositories, also leading to dozens of property lookups on array literals that the compiler infers as `never`.【F:reports/typecheck-20250204.log†L169-L208】
2. **Metadata services are tightly coupled to presentation DTOs that no longer satisfy strict interfaces.** Mappers, lookup services, and binding services repeatedly attempt to coerce domain models into `Record<string, unknown>` or `MemberProfileRecord`, triggering TS2322/TS2739 diagnostics and revealing gaps in the DTO contract.【F:reports/typecheck-20250204.log†L101-L157】【F:reports/typecheck-20250204.log†L243-L250】
3. **Surface access helpers and audit services expose stale method signatures.** REST handlers and service methods assume `SurfaceAccessResult.hasAccess` and `AuditService.log` exist, and RBAC services push domain objects into `string[]` slots, showing the service boundary is inconsistent with the underlying adapters.【F:reports/typecheck-20250204.log†L44-L58】【F:reports/typecheck-20250204.log†L237-L242】
4. **External integrations lack typings or installations.** The compiler cannot resolve `jest`, `redis`, and `commander` modules, and Supabase env bindings reference `EnvConfig.url`/`anonKey` fields that the current type definition does not expose.【F:reports/typecheck-20250204.log†L1-L1】【F:reports/typecheck-20250204.log†L159-L160】【F:reports/typecheck-20250204.log†L229-L229】
5. **UI components depend on updated library APIs.** DayPicker usage omits required `selected` props, metadata providers are mounted without children, and rich text transformers mix incompatible `vfile` versions, indicating the UI layer must be realigned with upstream dependencies.【F:reports/typecheck-20250204.log†L24-L75】
6. **Audit and licensing utilities expose inconsistent casing.** Remaining `tenant_id` references and `toUpperCase` calls on `never` highlight areas where data normalization was left incomplete.【F:reports/typecheck-20250204.log†L38-L41】【F:reports/typecheck-20250204.log†L110-L111】【F:reports/typecheck-20250204.log†L201-L201】

## Implementation Plan
The roadmap below prioritizes fixes to eliminate the current compiler blockers and prevent regression.

1. **Rebuild repository base types (High Priority).**
   - Refactor `BaseRepository` and `@Repository` decorator signatures to require explicit type parameters and expose an abstract constructor that satisfies `Newable`. Update RBAC, user-member link, member invitation, and licensing repositories to pass the correct generics, eliminating TS1238/TS2314 errors.【F:reports/typecheck-20250204.log†L169-L208】
   - Replace array literals currently inferred as `{ ... }[]` with typed DTO factories or mapper functions so property access resolves against concrete interfaces instead of `never`.【F:reports/typecheck-20250204.log†L182-L208】

2. **Stabilize metadata DTO contracts (High Priority).**
   - Define shared interfaces for membership stages, types, and centers that extend `Record<string, unknown>` where needed, or relax the lookup framework to accept well-typed domain models. Align mapper outputs with `MemberHousehold` and `MemberProfileRecord` fields to remove unsafe casts.【F:reports/typecheck-20250204.log†L101-L157】【F:reports/typecheck-20250204.log†L135-L138】
   - Audit metadata providers (`MetadataClientProvider`, admin components) to ensure required children and props are supplied by each entry point.【F:reports/typecheck-20250204.log†L24-L31】【F:reports/typecheck-20250204.log†L127-L134】

3. **Correct service boundary expectations (High Priority).**
   - Update `SurfaceAccessResult` and `AuditService` typings (or the consuming services) so the exposed methods match runtime implementations, resolving the missing `hasAccess`/`log` members and allowing `RbacService` to emit strongly typed permission arrays.【F:reports/typecheck-20250204.log†L44-L58】【F:reports/typecheck-20250204.log†L237-L242】
   - Restore the `IUserRoleRepository` export or adjust service imports to the new contract, keeping registry and role services aligned with repository refactors.【F:reports/typecheck-20250204.log†L233-L237】

4. **Reconcile nullable inputs and schema validators (Medium Priority).**
   - Harden registration flows and licensing handlers by enforcing guards around nullable tenant IDs and product offerings before invoking downstream helpers, clearing TS2345/TS18047 diagnostics.【F:reports/typecheck-20250204.log†L32-L39】【F:reports/typecheck-20250204.log†L38-L39】
   - Fix metadata action validators to pass the correct arity and replace snake_case identifiers (`tenant_id`) with camelCase equivalents across audit queries.【F:reports/typecheck-20250204.log†L40-L43】【F:reports/typecheck-20250204.log†L110-L111】

5. **Restore external dependency typing (Medium Priority).**
   - Install missing runtime packages (`@types/jest`, `redis`, `@types/redis`, `commander`, `@types/commander`) or stub local declaration files where dependencies are optional. Update Supabase config typings to expose `url`/`anonKey` when present in the environment schema.【F:reports/typecheck-20250204.log†L1-L1】【F:reports/typecheck-20250204.log†L159-L160】【F:reports/typecheck-20250204.log†L229-L229】

6. **Align UI components with library APIs (Medium Priority).**
   - Review DayPicker usage and other UI composition to ensure required props (`selected`, correct ref types, valid remark plugins) match the current versions of `react-day-picker`, `react-markdown`, and `remark-slug`. Provide local wrapper types if the upstream libraries lack exported helpers.【F:reports/typecheck-20250204.log†L48-L75】

7. **Follow-up validation (Ongoing).**
   - After implementing the above, regenerate metadata types (`npm run metadata:types` if necessary), rerun `npm run lint` and `npx tsc --noEmit --pretty false`, and archive fresh reports in `reports/` for traceability.【a57ec4†L1-L6】【F:reports/typecheck-20250204.log†L1-L250】

## Artifacts
- Full compiler diagnostics: `reports/typecheck-20250204.log`
- Error code distribution: `reports/typecheck-20250204-error-codes.txt`
- Per-file error counts: `reports/typecheck-20250204-file-counts.txt`

These findings provide a prioritized plan to bring the codebase back to a lint- and type-clean state while tightening contracts between repositories, services, metadata tooling, and UI components.
