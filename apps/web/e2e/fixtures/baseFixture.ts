import { test as base } from '@playwright/test';
import { SignupPage } from '../pages/SignupPage';
import { RegistrationPage } from '../pages/RegistrationPage';
import { OnboardingPage } from '../pages/OnboardingPage';
import { LoginPage, TEST_CREDENTIALS } from '../pages/LoginPage';
import { MembersPage } from '../pages/MembersPage';
import { NotificationsPage } from '../pages/NotificationsPage';

/**
 * Extended Test Fixture
 *
 * Provides page objects and common test utilities as fixtures
 */

type TestFixtures = {
  signupPage: SignupPage;
  registrationPage: RegistrationPage;
  onboardingPage: OnboardingPage;
  loginPage: LoginPage;
  membersPage: MembersPage;
  notificationsPage: NotificationsPage;
};

type AuthenticatedFixtures = TestFixtures & {
  /** Marker that authentication has been performed */
  _authenticated: void;
};

/**
 * Extended test with page object fixtures (no authentication)
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

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  membersPage: async ({ page }, use) => {
    const membersPage = new MembersPage(page);
    await use(membersPage);
  },

  notificationsPage: async ({ page }, use) => {
    const notificationsPage = new NotificationsPage(page);
    await use(notificationsPage);
  },
});

/**
 * Test with automatic authentication
 * Logs in using test credentials before each test runs
 */
export const authenticatedTest = base.extend<AuthenticatedFixtures>({
  // Auto-login fixture - runs before tests and logs in
  _authenticated: [async ({ page }, use) => {
    const loginPage = new LoginPage(page);

    // Navigate to login page
    await loginPage.goto();

    // Login with test credentials
    await loginPage.login(TEST_CREDENTIALS.email, TEST_CREDENTIALS.password);

    // Wait for successful authentication
    await loginPage.waitForSuccessfulLogin();

    // Proceed with the test
    await use();
  }, { auto: true }],

  // Page objects available in authenticated tests
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

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  membersPage: async ({ page }, use) => {
    const membersPage = new MembersPage(page);
    await use(membersPage);
  },

  notificationsPage: async ({ page }, use) => {
    const notificationsPage = new NotificationsPage(page);
    await use(notificationsPage);
  },
});

export { expect } from '@playwright/test';
