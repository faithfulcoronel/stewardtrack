# End-to-End (E2E) Tests with Playwright

This directory contains Playwright end-to-end tests for the StewardTrack application, organized using the **Page Object Model** pattern.

## Project Structure

```
e2e/
├── fixtures/              # Test fixtures and shared setup
│   └── baseFixture.ts     # Extended test with page object fixtures
├── helpers/               # Utility functions and helpers
│   ├── assertions.ts      # Custom assertions
│   └── testData.ts        # Test data generators
├── pages/                 # Page Object Models
│   ├── SignupPage.ts      # Signup/pricing page
│   ├── RegistrationPage.ts # Registration form page
│   └── OnboardingPage.ts  # Onboarding wizard page
├── tests/                 # Test specifications
│   └── auth/
│       └── registration.spec.ts  # Registration tests
├── .eslintrc.json         # ESLint config for tests
└── README.md              # This file
```

## Setup

Install Playwright browsers:

```bash
npx playwright install
```

## Running Tests

```bash
npm run test:e2e           # Run all tests
npm run test:e2e:ui        # Run with UI (recommended)
npm run test:e2e:headed    # Run in headed mode
npm run test:e2e:debug     # Debug mode
npm run test:e2e:report    # View test report
```

## Writing Tests

Tests use Page Object Model pattern with fixtures:

```typescript
import { test, expect } from '../../fixtures/baseFixture';
import { generateRegistrationData } from '../../helpers/testData';

test('my test', async ({ registrationPage }) => {
  const testData = generateRegistrationData();
  await registrationPage.register(testData);
  await registrationPage.waitForSuccessfulRegistration();
});
```

## Documentation

For detailed documentation see inline comments in:
- `pages/*.ts` - Page object implementations
- `helpers/*.ts` - Helper utilities
- `fixtures/baseFixture.ts` - Test fixtures
- `tests/**/*.spec.ts` - Test examples
