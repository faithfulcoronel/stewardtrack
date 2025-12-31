import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Signup/Pricing Page
 *
 * Encapsulates all selectors and actions for the pricing/plan selection page
 */
export class SignupPage {
  readonly page: Page;

  // Page elements
  readonly pageHeading: Locator;
  readonly planCards: Locator;
  readonly freePlanButton: Locator;
  readonly trialPlanButton: Locator;
  readonly professionalPlanButton: Locator;
  readonly enterprisePlanButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageHeading = page.getByRole('heading', { name: /pricing|choose.*plan|get started/i });
    this.planCards = page.locator('[data-testid="pricing-card"], .pricing-card');

    // Plan selection buttons
    this.freePlanButton = page.getByRole('button', { name: /free|get started.*free/i }).first();
    this.trialPlanButton = page.getByRole('button', { name: /trial|start.*trial/i }).first();
    this.professionalPlanButton = page.getByRole('button', { name: /professional|get started.*professional/i }).first();
    this.enterprisePlanButton = page.getByRole('button', { name: /enterprise|get started.*enterprise/i }).first();
  }

  /**
   * Navigate to signup page
   */
  async goto() {
    await this.page.goto('/signup');
  }

  /**
   * Select first available plan (usually free or trial)
   */
  async selectFirstPlan() {
    const firstPlanButton = this.page.getByRole('button', { name: /get started|choose.*plan|select|sign up/i }).first();
    await firstPlanButton.click();
  }

  /**
   * Select free plan
   */
  async selectFreePlan() {
    await this.freePlanButton.click();
  }

  /**
   * Select trial plan
   */
  async selectTrialPlan() {
    await this.trialPlanButton.click();
  }

  /**
   * Select professional plan
   */
  async selectProfessionalPlan() {
    await this.professionalPlanButton.click();
  }

  /**
   * Select enterprise plan
   */
  async selectEnterprisePlan() {
    await this.enterprisePlanButton.click();
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.pageHeading.isVisible({ timeout: 5000 });
  }
}
