import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Login Page
 *
 * Encapsulates all selectors and actions for the login page
 */
export class LoginPage {
  readonly page: Page;

  // Page elements
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly rememberMeCheckbox: Locator;
  readonly submitButton: Locator;
  readonly forgotPasswordLink: Locator;
  readonly signupLink: Locator;
  readonly errorMessage: Locator;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form elements
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.rememberMeCheckbox = page.locator('#remember');
    this.submitButton = page.getByRole('button', { name: /sign in/i });
    this.forgotPasswordLink = page.getByRole('link', { name: /forgot password/i });
    this.signupLink = page.getByRole('link', { name: /free.*trial|start.*trial/i });
    this.errorMessage = page.locator('[role="alert"]');
    this.pageHeading = page.getByRole('heading', { name: /welcome back/i });
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login');
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow with credentials
   */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password);
    await this.submit();
  }

  /**
   * Wait for successful login (redirect to admin dashboard)
   */
  async waitForSuccessfulLogin() {
    // Increased timeout for slower CI environments
    const loginTimeout = 60000;

    // Wait for either URL change to admin/dashboard OR for admin heading to appear
    await Promise.race([
      this.page.waitForURL(/\/(admin|dashboard|onboarding)/, { timeout: loginTimeout }),
      this.page.getByRole('heading', { name: /admin|dashboard|overview/i }).waitFor({ state: 'visible', timeout: loginTimeout }),
      // Also check for sidebar navigation as indicator of successful login
      this.page.locator('[data-testid="sidebar"], nav[role="navigation"]').waitFor({ state: 'visible', timeout: loginTimeout }),
    ]);
    // Additional wait for page to stabilize
    await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  }

  /**
   * Check if login page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.pageHeading.isVisible({ timeout: 5000 });
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 3000 });
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasError()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check remember me checkbox
   */
  async checkRememberMe() {
    await this.rememberMeCheckbox.check();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    const toggleButton = this.page.getByRole('button', { name: /show password|hide password/i });
    await toggleButton.click();
  }
}

/**
 * Test credentials loaded from environment variables
 * Configure via StewardTrack-E2E-Secrets variable group in CI/CD
 * or set locally via .env file
 *
 * Required environment variables:
 * - E2E_TEST_USER_EMAIL
 * - E2E_TEST_USER_PASSWORD
 */
export const TEST_CREDENTIALS = {
  get email(): string {
    const email = process.env.E2E_TEST_USER_EMAIL;
    if (!email) {
      throw new Error('E2E_TEST_USER_EMAIL environment variable is not set');
    }
    return email;
  },
  get password(): string {
    const password = process.env.E2E_TEST_USER_PASSWORD;
    if (!password) {
      throw new Error('E2E_TEST_USER_PASSWORD environment variable is not set');
    }
    return password;
  },
};
