import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Registration Page
 *
 * Encapsulates all selectors and actions for the registration page
 */
export class RegistrationPage {
  readonly page: Page;

  // Form field locators
  readonly emailField: Locator;
  readonly passwordField: Locator;
  readonly confirmPasswordField: Locator;
  readonly churchNameField: Locator;
  readonly firstNameField: Locator;
  readonly lastNameField: Locator;
  readonly submitButton: Locator;

  // Error message locators
  readonly errorMessage: Locator;
  readonly passwordMismatchError: Locator;
  readonly emailValidationError: Locator;
  readonly requiredFieldError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form fields - use getByRole for input fields to be more specific
    this.emailField = page.getByRole('textbox', { name: /email/i });
    this.passwordField = page.locator('input[type="password"]').first();
    this.confirmPasswordField = page.locator('input[type="password"]').nth(1);
    this.churchNameField = page.getByRole('textbox', { name: /church.*name|organization.*name/i });
    this.firstNameField = page.getByRole('textbox', { name: /first.*name/i });
    this.lastNameField = page.getByRole('textbox', { name: /last.*name/i });
    this.submitButton = page.getByRole('button', { name: /register|sign up|create.*account|continue/i });

    // Error messages - use more specific selectors
    this.errorMessage = page.locator('[role="alert"], .error-message, .text-destructive').first();
    this.passwordMismatchError = page.locator('.text-destructive, [role="alert"]').filter({ hasText: /password.*match|password.*same/i });
    this.emailValidationError = page.locator('.text-destructive, [role="alert"]').filter({ hasText: /invalid.*email|email.*format|valid.*email/i });
    this.requiredFieldError = page.locator('.text-destructive, [role="alert"]').filter({ hasText: /required|cannot.*empty/i }).first();
  }

  /**
   * Navigate to registration page
   */
  async goto() {
    await this.page.goto('/signup/register');
  }

  /**
   * Fill out registration form
   */
  async fillRegistrationForm(data: {
    email: string;
    password: string;
    confirmPassword: string;
    churchName: string;
    firstName: string;
    lastName: string;
  }) {
    await this.emailField.fill(data.email);
    await this.passwordField.fill(data.password);
    await this.confirmPasswordField.fill(data.confirmPassword);
    await this.churchNameField.fill(data.churchName);
    await this.firstNameField.fill(data.firstName);
    await this.lastNameField.fill(data.lastName);
  }

  /**
   * Submit registration form
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete registration in one action
   */
  async register(data: {
    email: string;
    password: string;
    confirmPassword: string;
    churchName: string;
    firstName: string;
    lastName: string;
  }) {
    await this.fillRegistrationForm(data);
    await this.submit();
  }

  /**
   * Wait for successful registration redirect
   * Extended timeout to account for:
   * - Auth user creation
   * - Tenant setup
   * - Encryption key generation
   * - License provisioning
   * - RBAC seeding
   * - Permission deployment
   * - Feature onboarding plugins
   */
  async waitForSuccessfulRegistration() {
    // First wait for processing page (fast redirect)
    await this.page.waitForURL(/\/signup\/register\/processing/, { timeout: 10000 });

    // Then wait for final redirect to onboarding/admin/dashboard
    // This can take up to 60 seconds for all backend steps to complete
    await this.page.waitForURL(/\/(onboarding|admin|dashboard)/, { timeout: 90000 });
  }

  /**
   * Wait for redirect to processing page
   * This is the first step after form submission
   */
  async waitForProcessingPageRedirect() {
    await this.page.waitForURL(/\/signup\/register\/processing/, { timeout: 10000 });
  }

  /**
   * Check if we're on the processing page
   */
  async isOnProcessingPage(): Promise<boolean> {
    return this.page.url().includes('/signup/register/processing');
  }

  /**
   * Check if password mismatch error is visible
   */
  async hasPasswordMismatchError(): Promise<boolean> {
    return await this.passwordMismatchError.isVisible({ timeout: 5000 });
  }

  /**
   * Check if email validation error is visible
   */
  async hasEmailValidationError(): Promise<boolean> {
    return await this.emailValidationError.isVisible({ timeout: 5000 });
  }

  /**
   * Check if required field error is visible
   */
  async hasRequiredFieldError(): Promise<boolean> {
    return await this.requiredFieldError.isVisible({ timeout: 5000 });
  }
}
