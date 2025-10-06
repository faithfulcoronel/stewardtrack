# Lint and Type-Check Remediation User Stories

This story map translates the implementation plan in [`docs/lint-typecheck-report.md`](../lint-typecheck-report.md) into incremental delivery phases. Each phase groups user stories that can be executed together to restore a clean lint and type-check baseline while improving confidence in the tooling.

## Phase 1 – Restore Foundational Typings and Testing Tooling

- **Story: As a developer, I need tests to compile with the correct global typings so that TypeScript recognizes Jest/Vitest helpers.**
  - Update the TypeScript configuration to include a test-specific `tsconfig` that brings in the proper ambient type declarations.
  - Ensure project references or path mappings allow test files to pick up the new configuration automatically.
- **Story: As a developer, I need required testing packages installed so that IDEs and compilers resolve testing utilities.**
  - Add missing `@types/jest`, `@testing-library/react`, and any chosen test runner dependencies.
  - Align npm scripts to invoke the supported test environment to keep type definitions in sync with runtime behavior.

## Phase 2 – Normalize Adapters, Repositories, and Services

- **Story: As a developer, I need adapters to return type-safe domain DTOs so downstream consumers stop receiving `GenericStringError[]`.**
  - Refactor adapter return values to use discriminated unions or dedicated result objects that match the declared contracts.
  - Reconcile inheritance with `BaseAdapter` generics, including required method parameters such as `relations` objects.
- **Story: As a developer, I need repository contracts and service calls to agree so that queries and consumers no longer disagree on shapes.**
  - Audit repositories (e.g., RBAC and user-member linking) to match service expectations, including missing properties like `linked_at`.
  - Update services to invoke existing helper methods or revise type definitions to reflect actual return shapes.
  - Provide typed interfaces for injected dependencies such as audit loggers exposing `log` functions.

## Phase 3 – Repair Metadata Fixtures and Validation Utilities

- **Story: As a metadata maintainer, I need fixtures to align with canonical schema unions so that pipeline tests stop violating literal constraints.**
  - Update metadata pipeline fixtures to use the narrowed unions for data sources, regions, and property values.
  - Regenerate derived metadata types after fixture updates to keep generated artifacts current.
- **Story: As a developer, I need validation utilities to rely on supported Zod APIs so that schema construction no longer triggers overload errors.**
  - Replace deprecated enum overload usage with `z.enum([...])` and move custom error handling into `superRefine` or equivalent hooks.

## Phase 4 – Harden UI State Management and Finalize Regression Safeguards

- **Story: As a UI engineer, I need components and hooks to have explicit types so that React state setters and handlers are type-safe.**
  - Add precise typings to handler parameters currently inferred as `any` and ensure state updater callbacks conform to stored state shapes.
  - Import or export shared permission types so UI components like RoleExplorer reference canonical definitions.
- **Story: As an engineering team, we need automated checks to prevent type regressions after remediation.**
  - Rerun `npm run lint` and `npx tsc --noEmit --pretty false` to confirm a clean baseline.
  - Integrate type-checking into CI, considering separate tsconfig paths for app, tests, and tooling to surface issues earlier.

Delivering the remediation through these phases provides incremental validation and keeps the highest-risk type errors from blocking downstream feature work.
