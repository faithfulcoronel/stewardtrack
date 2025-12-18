import { test as base } from '@playwright/test';
import { SignupPage } from '../pages/SignupPage';
import { RegistrationPage } from '../pages/RegistrationPage';
import { OnboardingPage } from '../pages/OnboardingPage';

/**
 * Extended Test Fixture
 *
 * Provides page objects and common test utilities as fixtures
 */

type TestFixtures = {
  signupPage: SignupPage;
  registrationPage: RegistrationPage;
  onboardingPage: OnboardingPage;
};

/**
 * Extended test with page object fixtures
 */
export const test = base.extend<TestFixtures>({
  signupPage: async ({ page }, use) => {
    const signupPage = new SignupPage(page);
    await use(signupPage);
  },

  registrationPage: async ({ page }, use) => {
    const registrationPage = new RegistrationPage(page);
    await use(registrationPage);
  },

  onboardingPage: async ({ page }, use) => {
    const onboardingPage = new OnboardingPage(page);
    await use(onboardingPage);
  },
});

export { expect } from '@playwright/test';
