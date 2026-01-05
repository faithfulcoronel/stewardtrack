import { Page, Locator } from '@playwright/test';

/**
 * Test data generator for Care Plans
 */
export interface CarePlanTestData {
  memberId: string;
  memberName: string;
  statusCode: string;
  statusLabel: string;
  priority: 'high' | 'medium' | 'low';
  assignedTo: string;
  followUpAt: string;
  details: string;
  isActive: boolean;
}

export function generateCarePlanData(overrides: Partial<CarePlanTestData> = {}): CarePlanTestData {
  const timestamp = Date.now();
  return {
    memberId: '',
    memberName: `Test Member ${timestamp}`,
    statusCode: 'active',
    statusLabel: 'Active Care',
    priority: 'medium',
    assignedTo: `Pastor Test ${timestamp}`,
    followUpAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
    details: `Test care plan details created at ${new Date().toISOString()}`,
    isActive: true,
    ...overrides,
  };
}

/**
 * Page Object Model for Care Plans Pages
 *
 * Handles navigation and interaction with care plan management pages.
 */
export class CarePlansPage {
  readonly page: Page;

  // Navigation elements
  readonly carePlansNavLink: Locator;
  readonly addCarePlanButton: Locator;

  // List page elements
  readonly pageTitle: Locator;
  readonly carePlanRows: Locator;
  readonly dataGrid: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;

  // Form elements
  readonly memberSelect: Locator;
  readonly statusCodeSelect: Locator;
  readonly statusLabelInput: Locator;
  readonly prioritySelect: Locator;
  readonly assignedToInput: Locator;
  readonly followUpDateInput: Locator;
  readonly isActiveSelect: Locator;
  readonly detailsTextarea: Locator;

  // Buttons
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;
  readonly editButton: Locator;

  // Success/Error indicators
  readonly successToast: Locator;
  readonly errorToast: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.carePlansNavLink = page.getByRole('link', { name: /care\s*plans/i }).first();
    this.addCarePlanButton = page.getByRole('link', { name: /add|new|create.*care\s*plan/i }).first();

    // List page
    this.pageTitle = page.getByRole('heading', { level: 1 }).first();
    this.carePlanRows = page.locator('[data-testid="care-plan-row"], tr[data-row-id]');
    this.dataGrid = page.locator('[data-testid="data-grid"], table');
    this.searchInput = page.getByPlaceholder(/search/i).first();
    this.statusFilter = page.locator('[data-testid="status-filter"]');

    // Form fields
    this.memberSelect = page.locator('[name="memberId"], [data-testid="member-select"]').first();
    this.statusCodeSelect = page.locator('[name="statusCode"], [data-testid="status-select"]').first();
    this.statusLabelInput = page.locator('[name="statusLabel"], input[placeholder*="status"]').first();
    this.prioritySelect = page.locator('[name="priority"], [data-testid="priority-select"]').first();
    this.assignedToInput = page.locator('[name="assignedTo"], input[placeholder*="staff"]').first();
    this.followUpDateInput = page.locator('[name="followUpAt"], input[type="date"]').first();
    this.isActiveSelect = page.locator('[name="isActive"], [data-testid="active-select"]').first();
    this.detailsTextarea = page.locator('[name="details"], textarea').first();

    // Buttons
    this.saveButton = page.getByRole('button', { name: /save|submit|create/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i }).first();
    this.deleteButton = page.getByRole('button', { name: /delete/i }).first();
    this.editButton = page.getByRole('link', { name: /edit/i }).first();

    // Toast notifications
    this.successToast = page.locator('[data-testid="toast-success"], .toast-success, [role="status"]');
    this.errorToast = page.locator('[data-testid="toast-error"], .toast-error, [role="alert"]');
    this.errorMessage = page.locator('.error-message, .text-destructive, [data-error="true"]');
  }

  /**
   * Navigate to the care plans module hub
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin/community/care-plans');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the care plans list page
   */
  async gotoList(): Promise<void> {
    await this.page.goto('/admin/community/care-plans/list');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the care plan creation page
   */
  async gotoCreate(): Promise<void> {
    await this.page.goto('/admin/community/care-plans/manage');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to a specific care plan's detail page
   */
  async gotoCarePlan(carePlanId: string): Promise<void> {
    await this.page.goto(`/admin/community/care-plans/${carePlanId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to edit a specific care plan
   */
  async gotoEdit(carePlanId: string): Promise<void> {
    await this.page.goto(`/admin/community/care-plans/manage?carePlanId=${carePlanId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the form is loaded
   */
  async isFormLoaded(): Promise<boolean> {
    try {
      await this.page.waitForSelector('form, [data-testid="care-plan-form"]', { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fill the care plan form
   */
  async fillCarePlanForm(data: Partial<CarePlanTestData>): Promise<void> {
    // Select member if member dropdown exists and memberId is provided
    if (data.memberId) {
      const memberDropdown = this.page.locator('[data-testid="member-select"], select[name="memberId"]').first();
      if (await memberDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await memberDropdown.selectOption(data.memberId);
      }
    }

    // Select status code
    if (data.statusCode) {
      const statusDropdown = this.page.locator('select[name="statusCode"], [data-testid="status-select"]').first();
      if (await statusDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await statusDropdown.selectOption(data.statusCode);
      }
    }

    // Fill priority
    if (data.priority) {
      const priorityDropdown = this.page.locator('select[name="priority"]').first();
      if (await priorityDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await priorityDropdown.selectOption(data.priority);
      }
    }

    // Fill assigned to
    if (data.assignedTo) {
      const assignedInput = this.page.locator('input[name="assignedTo"]').first();
      if (await assignedInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await assignedInput.fill(data.assignedTo);
      }
    }

    // Fill follow-up date
    if (data.followUpAt) {
      const followUpInput = this.page.locator('input[name="followUpAt"], input[type="date"]').first();
      if (await followUpInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await followUpInput.fill(data.followUpAt);
      }
    }

    // Select active status
    if (data.isActive !== undefined) {
      const activeDropdown = this.page.locator('select[name="isActive"]').first();
      if (await activeDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await activeDropdown.selectOption(data.isActive ? 'true' : 'false');
      }
    }

    // Fill details
    if (data.details) {
      const detailsInput = this.page.locator('textarea[name="details"]').first();
      if (await detailsInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await detailsInput.fill(data.details);
      }
    }
  }

  /**
   * Submit the care plan form
   */
  async submitForm(): Promise<void> {
    await this.saveButton.click();
    // Wait for form submission to process
    await this.page.waitForTimeout(2000);
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Get the error message text
   */
  async getErrorMessage(): Promise<string | null> {
    if (await this.hasErrorMessage()) {
      return await this.errorMessage.textContent();
    }
    return null;
  }

  /**
   * Check if success toast is displayed
   */
  async hasSuccessToast(): Promise<boolean> {
    return await this.successToast.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Check if error toast is displayed
   */
  async hasErrorToast(): Promise<boolean> {
    return await this.errorToast.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Wait for navigation to care plan detail page after creation
   */
  async waitForCarePlanCreated(): Promise<string | null> {
    try {
      await this.page.waitForURL(/\/admin\/community\/care-plans\/[a-f0-9-]+/, { timeout: 15000 });
      const url = this.page.url();
      const match = url.match(/\/care-plans\/([a-f0-9-]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if unauthorized page is displayed
   */
  async isUnauthorized(): Promise<boolean> {
    const url = this.page.url();
    if (url.includes('/unauthorized')) {
      return true;
    }

    // Also check for unauthorized message on page
    const unauthorizedText = this.page.getByText(/unauthorized|access denied|permission denied/i);
    return await unauthorizedText.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * Check if RLS error is displayed (row-level security violation)
   */
  async hasRLSError(): Promise<boolean> {
    const rlsError = this.page.getByText(/row-level security|rls|policy.*violat/i);
    return await rlsError.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * Get count of care plans in the list
   */
  async getCarePlanCount(): Promise<number> {
    await this.page.waitForTimeout(1000); // Wait for data to load
    return await this.carePlanRows.count();
  }
}
