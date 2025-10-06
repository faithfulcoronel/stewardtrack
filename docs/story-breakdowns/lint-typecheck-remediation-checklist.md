# Lint & Type-Check Remediation Checklist

This checklist tracks implementation progress against the user stories defined in [`lint-typecheck-report-story-plan.md`](./lint-typecheck-report-story-plan.md). Items marked as complete reflect the updates delivered in phases 1 and 2, while unchecked items remain outstanding for later remediation passes.

## Phase 1 – Restore Foundational Typings and Testing Tooling

- [x] Introduced a shared `tsconfig.base.json` and an app-focused `tsconfig.json` that exclude test sources so application builds rely on production typings only.
- [x] Added a dedicated `tsconfig.test.json` referenced by Jest so test files compile with Jest and Testing Library ambient types.
- [x] Committed a project-level `jest.config.ts` and `src/tests/setup-tests.ts` scaffold to align runtime configuration with TypeScript expectations.
- [x] Installed missing testing dependencies (`jest`, `ts-jest`, `jest-environment-jsdom`, `@types/jest`, `@testing-library/react`, `@testing-library/jest-dom`) and exposed a package script to run the configured test suite.

## Phase 2 – Normalize Adapters, Repositories, and Services

- [x] Updated feature licensing adapters to return typed DTOs consistent with their `BaseAdapter` contracts, handling relation arguments and Supabase payload validation.
- [x] Revised product offering and surface license binding adapters to surface discriminated result objects instead of `GenericStringError[]` collections.
- [x] Refined user-role management adapter logic to expose typed helper utilities, delegated scope metadata, and strongly typed return values.
- [x] Extended RBAC and user-member linking models/services to expose `linked_at` timestamps, delegated scopes, and typed search results consumed by forms and API routes.

## Phase 3 – Repair Metadata Fixtures and Validation Utilities

- [ ] Align metadata fixtures with canonical schema unions for data sources, regions, and property values.
- [ ] Regenerate derived metadata types and supporting artifacts after fixture corrections.
- [ ] Replace deprecated Zod enum overload usage with supported construction patterns and migrate custom validation hooks to `superRefine` or equivalents.

## Phase 4 – Harden UI State Management and Regression Safeguards

- [ ] Add explicit typings to UI components and hooks so React state setters, handlers, and permission explorers reference canonical definitions.
- [ ] Re-run `npm run lint` and `npx tsc --noEmit --pretty false` to capture a clean baseline once remediation is complete.
- [ ] Integrate linting and type-checking into CI to guard against future regressions across app, test, and tooling configs.
