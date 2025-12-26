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
    // Wait for either URL change to admin/dashboard OR for admin heading to appear
    await Promise.race([
      this.page.waitForURL(/\/(admin|dashboard)/, { timeout: 30000 }),
      this.page.getByRole('heading', { name: /admin|dashboard/i }).waitFor({ state: 'visible', timeout: 30000 }),
    ]);
    // Additional wait for page to stabilize
    await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
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
 * Default test credentials
 * These should be configured for a test user in the test environment
 */
export const TEST_CREDENTIALS = {
  email: 'uitest100@gmail.com',
  password: 'Password1',
};
