import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Signup/Pricing Page
 *
 * Encapsulates all selectors and actions for the pricing/plan selection page
 *
 * Note: The signup page dynamically loads pricing plans from the API.
 * Each plan card has:
 * - A heading with the tier name (Essential, Premium, Professional, Enterprise)
 * - A "Choose Plan" or "Get Started Free" button
 * - Optional "Start X-Day Free Trial" button for tiers with trial
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
  readonly premiumPlanButton: Locator;
  readonly billingToggle: Locator;
  readonly monthlyToggle: Locator;
  readonly annualToggle: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageHeading = page.getByRole('heading', { name: /pricing|choose.*plan|get started/i });
    this.planCards = page.locator('[data-testid="pricing-card"], .pricing-card');

    // Plan selection buttons - these match the button text used in the signup page
    // "Get Started Free" for free plans, "Choose Plan" for paid plans, "Start X-Day Free Trial" for trials
    this.freePlanButton = page.getByRole('button', { name: /get started free/i }).first();
    this.trialPlanButton = page.getByRole('button', { name: /start.*free trial/i }).first();

    // For paid plans, we need to find the card by tier heading and then click the button inside
    // The button text is "Choose Plan" or "or Subscribe Now" for all paid plans
    this.professionalPlanButton = page.locator('div').filter({ has: page.getByRole('heading', { name: /professional/i }) }).getByRole('button', { name: /choose plan|subscribe/i }).first();
    this.enterprisePlanButton = page.locator('div').filter({ has: page.getByRole('heading', { name: /enterprise/i }) }).getByRole('button', { name: /choose plan|subscribe/i }).first();
    this.premiumPlanButton = page.locator('div').filter({ has: page.getByRole('heading', { name: /premium/i }) }).getByRole('button', { name: /choose plan|subscribe|trial/i }).first();

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

  /**
   * Select premium plan
   */
  async selectPremiumPlan() {
    await this.premiumPlanButton.click();
  }

  /**
   * Select a plan by tier name
   * This finds the card with the tier heading and clicks the first available button
   */
  async selectPlanByTier(tier: 'essential' | 'premium' | 'professional' | 'enterprise') {
    // Wait for plans to load
    await this.page.waitForTimeout(1000);

    // Find the card with the tier heading
    const tierCard = this.page.locator('div').filter({
      has: this.page.getByRole('heading', { name: new RegExp(tier, 'i') })
    });

    // Find and click any button in the card (trial, choose plan, or get started)
    const button = tierCard.getByRole('button').first();
    await button.click();
  }

  /**
   * Check if a specific tier plan is visible
   */
  async isTierVisible(tier: 'essential' | 'premium' | 'professional' | 'enterprise'): Promise<boolean> {
    // Wait for plans to load
    await this.page.waitForTimeout(1000);

    const tierHeading = this.page.getByRole('heading', { name: new RegExp(`^${tier}$`, 'i') });
    return await tierHeading.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * Get all visible tier names
   */
  async getVisibleTiers(): Promise<string[]> {
    // Wait for plans to load
    await this.page.waitForTimeout(1000);

    // Get all h3 headings that contain tier names
    const tierHeadings = this.page.locator('h3').filter({
      hasText: /essential|premium|professional|enterprise/i
    });

    const count = await tierHeadings.count();
    const tiers: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await tierHeadings.nth(i).textContent();
      if (text) {
        tiers.push(text.toLowerCase().trim());
      }
    }

    return tiers;
  }
}
