import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Onboarding Page
 *
 * Encapsulates all selectors and actions for the onboarding wizard
 */
export class OnboardingPage {
  readonly page: Page;

  // Page elements
  readonly welcomeHeading: Locator;
  readonly nextButton: Locator;
  readonly skipButton: Locator;
  readonly completeButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.welcomeHeading = page.getByRole('heading', { name: /welcome|onboarding|get started/i }).first();
    this.nextButton = page.getByRole('button', { name: /next|continue/i });
    this.skipButton = page.getByRole('button', { name: /skip/i });
    this.completeButton = page.getByRole('button', { name: /complete|finish|get started/i });
  }

  /**
   * Navigate to onboarding page
   */
  async goto() {
    await this.page.goto('/onboarding');
  }

  /**
   * Check if onboarding page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.welcomeHeading.isVisible({ timeout: 10000 });
  }

  /**
   * Skip onboarding wizard
   */
  async skip() {
    const skipVisible = await this.skipButton.isVisible({ timeout: 2000 });
    if (skipVisible) {
      await this.skipButton.click();
    }
  }

  /**
   * Complete onboarding wizard by clicking through
   */
  async complete() {
    // Click next until complete button appears
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const completeVisible = await this.completeButton.isVisible({ timeout: 1000 });

      if (completeVisible) {
        await this.completeButton.click();
        break;
      }

      const nextVisible = await this.nextButton.isVisible({ timeout: 1000 });
      if (nextVisible) {
        await this.nextButton.click();
        attempts++;
      } else {
        break;
      }
    }
  }
}
