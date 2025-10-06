# Linting and Type Validation Report

## Overview
We reran the stewardship workspace linting and type validation commands to understand the current blockers. `npm run lint` completed without violations, and `npx tsc --noEmit --pretty false` reported 131 diagnostics across 55 files.【F:reports/typecheck-20250204-error-codes.txt†L1-L22】【F:reports/typecheck-20250204-file-counts.txt†L1-L55】 The compiler output is archived in `reports/typecheck-20250204.log` for traceability.【F:reports/typecheck-20250204.log†L1-L250】

## Commands Executed
- `npm run lint`
- `npx tsc --noEmit --pretty false` (captured in `reports/typecheck-20250204.log`)

## Error Inventory
### Error Codes by Frequency
| Count | Error Code | Dominant Failure Pattern | Representative Locations |
| ---: | :-- | :-- | :-- |
| 46 | TS2339 | Property access on values inferred as `never`, decorators missing abstract constructors, and raw Supabase responses used without typing. | `src/repositories/rbac.repository.ts`, `src/lib/container.ts`, `src/lib/rbac/permissionHelpers.ts`【F:reports/typecheck-20250204.log†L87-L208】 |
| 22 | TS2322 | Domain models forced into `Record<string, unknown>` signatures and DTOs missing required properties. | `src/services/rbacMetadata.service.ts`, `src/lib/metadata/actions/admin-community/manage-member/mapper.ts`, `src/lib/metadata/services/admin-community.ts`【F:reports/typecheck-20250204.log†L101-L157】【F:reports/typecheck-20250204.log†L231-L250】 |
| 15 | TS2345 | Nullable inputs passed to helpers that expect concrete values and repository factory mismatches. | `src/app/api/auth/register/route.ts`, `src/lib/metadata/actions/admin-community/manage-member/resourceFactory.ts`, `src/components/admin/rbac/DelegateAccessDashboard.tsx`【F:reports/typecheck-20250204.log†L32-L53】【F:reports/typecheck-20250204.log†L113-L124】 |
| 9 | TS7006 | Implicit `any` parameters in repository/service callbacks. | `src/repositories/rbac.repository.ts`, `src/repositories/userMemberLink.repository.ts`, `src/services/RbacRegistryService.ts`【F:reports/typecheck-20250204.log†L181-L235】 |
| 7 | TS1117 | Duplicate keys in shared constant maps. | `src/lib/types.ts`【F:reports/typecheck-20250204.log†L161-L167】 |
| 4 | TS2344 | Audit models violating `BaseModel` constraints because nullable tenant identifiers are not widened. | `src/adapters/rbacAudit.adapter.ts`, `src/repositories/rbacAudit.repository.ts`【F:reports/typecheck-20250204.log†L14-L21】【F:reports/typecheck-20250204.log†L209-L216】 |
| 3 | TS2307 | Missing module typings for `jest`, `redis`, and `commander`. | `jest.config.ts`, `src/lib/cache/licenseCache.ts`, `src/scripts/healLicenseIssues.ts`【F:reports/typecheck-20250204.log†L1-L1】【F:reports/typecheck-20250204.log†L93-L93】【F:reports/typecheck-20250204.log†L229-L229】 |
| 3 | TS2352 | Unsafe casting of DTO collections to repository record types. | `src/adapters/memberProfile.adapter.ts`, `src/adapters/userRoleManagement.adapter.ts`, `src/repositories/rbac.repository.ts`【F:reports/typecheck-20250204.log†L6-L23】【F:reports/typecheck-20250204.log†L196-L200】 |
| 3 | TS2769 | Metadata providers invoked without required children. | `src/app/admin/members/metadata.ts`, `src/app/admin/settings/metadata.ts`, `src/lib/metadata/components/admin.tsx`【F:reports/typecheck-20250204.log†L24-L33】【F:reports/typecheck-20250204.log†L128-L133】 |
| 3 | TS1238 | Class decorators cannot resolve repository constructors because `BaseRepository` is not expressed as an abstract newable. | `src/repositories/memberInvitation.repository.ts`, `src/repositories/rbac.repository.ts`, `src/repositories/userMemberLink.repository.ts`【F:reports/typecheck-20250204.log†L169-L220】 |
| 3 | TS2314 | `BaseRepository` decorator invocations omit required generics. | Same files as above.【F:reports/typecheck-20250204.log†L169-L220】 |
| 2 | TS18047 | Licensing handlers dereference possibly null offerings. | `src/app/api/licensing/product-offerings/[id]/features/route.ts`, `src/app/api/licensing/product-offerings/[id]/route.ts`【F:reports/typecheck-20250204.log†L38-L39】 |
| 2 | TS2552 | Audit queries still reference snake_case identifiers. | `src/lib/audit/licenseAuditQueries.ts`【F:reports/typecheck-20250204.log†L91-L92】 |
| 2 | TS2739 | DTOs missing required fields when cast to strongly typed records. | `src/lib/metadata/services/admin-community.ts`, `src/repositories/rbac.repository.ts`【F:reports/typecheck-20250204.log†L136-L137】【F:reports/typecheck-20250204.log†L180-L180】 |
| 2 | TS2305 | Service layers import repository interfaces that are no longer exported. | `src/services/RbacRegistryService.ts`, `src/services/UserRoleService.ts`【F:reports/typecheck-20250204.log†L233-L236】 |
| 1 | TS2416 | Adapter overrides do not honor `BaseAdapter` generics. | `src/adapters/licenseFeatureBundle.adapter.ts`【F:reports/typecheck-20250204.log†L2-L5】 |
| 1 | TS2353 | Product offering hydrators attach unsupported literals. | `src/adapters/productOffering.adapter.ts`【F:reports/typecheck-20250204.log†L10-L10】 |
| 1 | TS2554 | Metadata action handler invokes schema validator with too few arguments. | `src/app/api/metadata/actions/route.ts`【F:reports/typecheck-20250204.log†L40-L40】 |
| 1 | TS2561 | Extra `roles` payload in metadata evaluation wiring. | `src/lib/metadata/evaluation.ts`【F:reports/typecheck-20250204.log†L135-L135】 |
| 1 | TS1360 | Presentation DTOs do not satisfy the `MemberProfileRecord` contract. | `src/lib/metadata/services/admin-community.ts`【F:reports/typecheck-20250204.log†L136-L138】 |

_See `reports/typecheck-20250204-error-codes.txt` for the raw distribution and `reports/typecheck-20250204.log` for detailed compiler output._【F:reports/typecheck-20250204-error-codes.txt†L1-L22】【F:reports/typecheck-20250204.log†L1-L250】

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
1. **Repository base classes and the dependency injection container disagree on construction contracts.** `BaseRepository` is consumed without explicit generics, the `@Repository` decorator expects an abstract newable, and the container registers concrete classes where `Newable<T>` is required. These gaps produce TS1238/TS2314/TS2345 diagnostics and cascade into dozens of property lookups against values inferred as `never` because Supabase query results are treated as loose arrays.【F:reports/typecheck-20250204.log†L94-L208】
2. **Metadata services leak presentation DTOs into lookup infrastructure.** Lookup factories hand domain repositories to helpers that expect `Record<string, unknown>`, and membership/profile mappers coerce nullable fields into strict contracts. The compiler rejects the casts, highlighting that the lookup abstraction no longer matches the shapes produced by the services.【F:reports/typecheck-20250204.log†L101-L157】【F:reports/typecheck-20250204.log†L231-L250】
3. **RBAC and audit boundaries have drifted from their adapters.** REST handlers and services still expect `AuditService.log`, `SurfaceAccessResult.hasAccess`, and string arrays from RBAC helpers, but the underlying implementations now expose different members and richer domain objects. This misalignment surfaces TS2339 and TS2322 errors across the API and service layers.【F:reports/typecheck-20250204.log†L40-L58】【F:reports/typecheck-20250204.log†L231-L242】
4. **External integrations lack typings or updated environment contracts.** The compiler cannot resolve `jest`, `redis`, or `commander`, and the Supabase server wrapper references `EnvConfig.url`/`anonKey` properties that are absent from the current type definition, blocking the build before domain fixes even run.【F:reports/typecheck-20250204.log†L1-L1】【F:reports/typecheck-20250204.log†L93-L93】【F:reports/typecheck-20250204.log†L159-L160】【F:reports/typecheck-20250204.log†L229-L229】
5. **UI integrations need to catch up with upstream library changes.** Metadata providers now require children, DayPicker enforces a `selected` prop, and the docs manager stitches together incompatible `vfile` instances, showing that component wrappers have not been adjusted for newer major versions.【F:reports/typecheck-20250204.log†L24-L33】【F:reports/typecheck-20250204.log†L64-L90】
6. **Audit and licensing data normalization remains incomplete.** Licensing routes dereference nullable offerings without guards, audit queries still use snake_case identifiers, and publishing adapters call string helpers on values inferred as `never`, all pointing to unfinished schema alignment work.【F:reports/typecheck-20250204.log†L10-L11】【F:reports/typecheck-20250204.log†L38-L92】【F:reports/typecheck-20250204.log†L201-L201】

## Implementation Plan
1. **Rebuild repository and decorator contracts (High Priority).** Make `BaseRepository` explicitly generic, update `@Repository` to accept abstract constructors, and adjust container registrations to pass compatible newables. Type the Supabase results feeding RBAC and membership repositories to eliminate `never` inferences.【F:reports/typecheck-20250204.log†L94-L208】
2. **Stabilize metadata DTO boundaries (High Priority).** Introduce shared interfaces for membership lookups, ensure lookup services return the relaxed shapes expected by the metadata engine, and align profile mappers with `MemberProfileRecord` so casts are unnecessary.【F:reports/typecheck-20250204.log†L101-L157】【F:reports/typecheck-20250204.log†L136-L138】
3. **Align RBAC and audit services with their adapters (High Priority).** Either restore the missing members (`log`, `hasAccess`, string arrays) or update consumers to embrace the newer domain types. Re-export the repository interfaces required by `RbacRegistryService` and `UserRoleService` to unblock service compilation.【F:reports/typecheck-20250204.log†L40-L58】【F:reports/typecheck-20250204.log†L231-L239】
4. **Restore external dependency typings (Medium Priority).** Install or stub the missing `jest`, `redis`, and `commander` packages, and extend the environment config types so Supabase bindings expose `url` and `anonKey`.【F:reports/typecheck-20250204.log†L1-L1】【F:reports/typecheck-20250204.log†L93-L93】【F:reports/typecheck-20250204.log†L159-L160】【F:reports/typecheck-20250204.log†L229-L229】
5. **Harden nullable flows and data normalization (Medium Priority).** Guard licensing routes against null offerings, convert lingering snake_case identifiers, and audit adapters to ensure string helpers operate on well-typed values.【F:reports/typecheck-20250204.log†L10-L11】【F:reports/typecheck-20250204.log†L38-L92】【F:reports/typecheck-20250204.log†L201-L201】
6. **Update UI wrappers for current library APIs (Medium Priority).** Provide the required props when mounting metadata providers, patch DayPicker integrations with explicit `selected` state, and unify `vfile` usage within the docs manager to remove transformer incompatibilities.【F:reports/typecheck-20250204.log†L24-L90】
7. **Follow-up validation (Ongoing).** After each fix set, regenerate metadata types as needed, rerun `npm run lint` and `npx tsc --noEmit --pretty false`, and archive fresh reports for historical tracking.【F:reports/typecheck-20250204.log†L1-L250】

## Artifacts
- Full compiler diagnostics: `reports/typecheck-20250204.log`
- Error code distribution: `reports/typecheck-20250204-error-codes.txt`
- Per-file error counts: `reports/typecheck-20250204-file-counts.txt`

These findings prioritize the fixes required to bring the workspace back to a lint- and type-clean state while tightening contracts between repositories, services, metadata tooling, and UI components.
