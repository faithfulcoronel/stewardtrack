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
  readonly billingToggle: Locator;
  readonly monthlyToggle: Locator;
  readonly annualToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageHeading = page.getByRole('heading', { name: /pricing|choose.*plan|get started/i });
    this.planCards = page.locator('[data-testid="pricing-card"], .pricing-card');

    // Plan selection buttons
    this.freePlanButton = page.getByRole('button', { name: /free|get started.*free/i }).first();
    this.trialPlanButton = page.getByRole('button', { name: /trial|start.*trial/i }).first();
    this.professionalPlanButton = page.getByRole('button', { name: /professional|get started.*professional/i }).first();
    this.enterprisePlanButton = page.getByRole('button', { name: /enterprise|get started.*enterprise/i }).first();

    // Billing cycle toggle
    this.billingToggle = page.locator('[data-testid="billing-toggle"], [role="tablist"]').first();
    this.monthlyToggle = page.getByRole('tab', { name: /monthly/i }).or(page.getByRole('button', { name: /monthly/i })).first();
    this.annualToggle = page.getByRole('tab', { name: /annual|yearly/i }).or(page.getByRole('button', { name: /annual|yearly/i })).first();
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

  /**
   * Select monthly billing cycle
   */
  async selectMonthlyBilling() {
    if (await this.monthlyToggle.isVisible({ timeout: 3000 })) {
      await this.monthlyToggle.click();
      // Wait for UI to update
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Select annual billing cycle
   */
  async selectAnnualBilling() {
    if (await this.annualToggle.isVisible({ timeout: 3000 })) {
      await this.annualToggle.click();
      // Wait for UI to update
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Select first plan with specific billing cycle
   */
  async selectFirstPlanWithBilling(billingCycle: 'monthly' | 'annual') {
    if (billingCycle === 'monthly') {
      await this.selectMonthlyBilling();
    } else {
      await this.selectAnnualBilling();
    }
    await this.selectFirstPlan();
  }
}
