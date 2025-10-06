# Linting and Type Validation Report

## Overview
This document captures the outcomes of the latest repository-wide linting and TypeScript validation runs and lays out a plan to address all reported issues.

## Commands Executed
- `npm run lint`
- `npx tsc --noEmit --pretty false`

The ESLint run completed without reporting any violations. The TypeScript compiler detected 418 errors across 63 files.【90e28d†L1-L5】【182fe1†L1-L3】

## Error Inventory

### Error Codes by Frequency
| Count | Error Code | Description (summary) |
| ---: | :-- | :-- |
| 154 | TS2304 | Undeclared identifiers (e.g., `describe`, `expect`, domain helpers). |
| 68 | TS2582 | Missing test globals such as `it`/`describe`. |
| 68 | TS2339 | Accessing properties that do not exist on the inferred type. |
| 29 | TS2322 | Type assignment incompatibilities, primarily returning `GenericStringError[]` in domain adapters. |
| 22 | TS2345 | Invalid arguments passed to strongly typed helpers (nullability and enum constraints). |
| 11 | TS7006 | Parameters implicitly receiving the `any` type. |
| 8 | TS2769 | Invalid overload usage when instantiating Zod schemas and React components. |
| 8 | TS2344 | Generic constraints violated when adapting Prisma models to base interfaces. |
| 7 | TS1117 | Inconsistent declarations within repository factories. |
| 6 | TS2307 | Missing module or type declaration imports for testing utilities. |
| _See `reports/typecheck-error-codes.txt` for the full distribution of all 27 error codes._【0c19b9†L1-L26】

### Most Impacted Files
| Count | File |
| ---: | :-- |
| 169 | `src/tests/api/rbac-phase-e.test.ts` |
| 56 | `src/tests/components/rbac-phase-e.test.tsx` |
| 28 | `src/repositories/rbac.repository.ts` |
| 14 | `src/adapters/userRoleManagement.adapter.ts` |
| 11 | `src/adapters/surfaceLicenseBinding.adapter.ts` |
| 10 | `src/repositories/userMemberLink.repository.ts` |
| 8 | `src/components/admin/rbac/RoleExplorer.tsx` |
| 7 | `tools/metadata/pipeline/__tests__/metadataPipeline.test.ts` |
| 7 | `src/lib/types.ts` |
| 7 | `src/adapters/licenseFeatureBundle.adapter.ts` |
| _Refer to `reports/typecheck-file-counts.txt` for the complete per-file breakdown._【112c3e†L1-L63】

### Key Problem Areas
1. **Test suites missing Jest/Vitest globals.** API and component RBAC Phase E tests lack ambient definitions for `describe`, `it`, `expect`, and related helpers; testing modules such as `@testing-library/react` are also unresolved.【b64ba5†L520-L580】
2. **Adapter and repository type mismatches.** Multiple adapters coerce `GenericStringError[]` into typed model arrays, violate base class generic constraints, or rely on methods that do not exist on the adapter instance.【ef1c6a†L1-L78】
3. **Domain service and API handlers with nullability issues.** Several routes pass `string | null` into helpers that require `string`, and services access properties that are not present on the typed results (e.g., `hasAccess`, `log`).【ef1c6a†L88-L118】【ef1c6a†L100-L107】
4. **Metadata pipeline tests using outdated canonical schema fixtures.** Fixtures construct data sources and regions with loose string unions that no longer satisfy the strongly typed metadata definitions.【b64ba5†L590-L620】
5. **UI state management typing gaps.** Components such as `DelegateAccessDashboard` pass incompatible updater signatures to React state setters, and several React handlers rely on implicitly `any` parameters.【ef1c6a†L108-L118】【ef1c6a†L114-L118】
6. **Validation schema construction errors.** Zod enum construction in `license.validator.ts` references deprecated overloads and uses `errorMap` incorrectly.【b64ba5†L584-L589】

## Implementation Plan

### 1. Restore Test Environment Typings (High Priority)
- Add Jest/Vitest types to `tsconfig` via a dedicated `tsconfig.test.json`, and include it in the project references or extend configuration used by test files.【b64ba5†L520-L580】
- Install missing packages such as `@types/jest`, `@testing-library/react`, and ensure the chosen runner exports required globals.
- Update scripts to run the selected test framework so the compiler aligns with runtime behavior.

### 2. Normalize Adapter Return Types and Generics (High Priority)
- Refactor adapters to return domain-specific DTOs instead of raw `GenericStringError[]` collections; introduce discriminated unions if error propagation is required.【ef1c6a†L1-L78】
- Align adapter inheritance with `BaseAdapter` signatures by adjusting method parameters (e.g., support `relations` objects) and sanitization helpers so they respect generic constraints.【ef1c6a†L8-L21】
- Ensure Prisma model types such as `EffectiveSurfaceAccess` extend the expected `BaseModel` shape by including required identifiers.【ef1c6a†L48-L61】

### 3. Fix Repository and Service Contract Drift (High Priority)
- Audit repositories like `rbac.repository.ts` and `userMemberLink.repository.ts` to ensure method signatures and query builders match the types consumed by services; add missing properties (e.g., `linked_at`).【112c3e†L1-L36】【ef1c6a†L103-L107】
- Update domain services to call the correct helper methods (e.g., use `hasAccessResult.hasAccess` if the property exists) or adjust type definitions to reflect actual return values.【ef1c6a†L101-L102】
- Provide typed audit service interfaces exposing `log` methods or inject the correct dependency implementing that API.【ef1c6a†L100-L107】

### 4. Reconcile Metadata Schema Fixtures (Medium Priority)
- Update metadata pipeline test fixtures to use the narrowed unions for `CanonicalDataSource`, `CanonicalRegion`, and `PropValue`, ensuring `kind` fields match the enumerated literal types.【b64ba5†L590-L620】
- Regenerate any derived types via `npm run metadata:types` after fixture adjustments to keep generated artifacts in sync.

### 5. Harden UI Components and Hooks (Medium Priority)
- Add explicit parameter typings to React handlers currently inferred as `any`, and adjust state setter calls so the callback return matches the stored state shape.【ef1c6a†L108-L118】【ef1c6a†L114-L118】
- Review component props (e.g., RoleExplorer permission typings) to import the correct types or expose them from shared modules.【ef1c6a†L119-L120】

### 6. Correct Validation Utilities (Medium Priority)
- Rewrite the Zod enum initialization in `license.validator.ts` to use the supported `z.enum([...])` signature without the invalid `errorMap` parameter, and move custom error mapping to `superRefine` if needed.【b64ba5†L584-L589】

### 7. Cleanup and Regression Prevention (Ongoing)
- After implementing fixes above, rerun `npm run lint` and `npx tsc --noEmit --pretty false` to ensure all errors are resolved.
- Integrate type-checking into CI and consider splitting tsconfig paths (`app`, `tests`, `tools`) to surface regressions earlier.

## Artifacts
- Full compiler output: `reports/typecheck.log`
- Error code distribution: `reports/typecheck-error-codes.txt`
- Per-file error counts: `reports/typecheck-file-counts.txt`

Following this roadmap will bring the project back to a lint- and type-clean baseline while improving the resilience of adapters, services, and metadata tooling.
