import { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for Members Pages
 *
 * Encapsulates selectors and actions for:
 * - Members list page
 * - Member manage/create page
 * - Member profile page
 */
export class MembersPage {
  readonly page: Page;

  // Navigation
  readonly membersNavLink: Locator;
  readonly addMemberButton: Locator;

  // List page elements
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly memberRows: Locator;
  readonly stageFilter: Locator;
  readonly centerFilter: Locator;
  readonly dataGrid: Locator;

  // Member form elements (manage page)
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly preferredNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly birthdateInput: Locator;
  readonly maritalStatusSelect: Locator;
  readonly genderSelect: Locator;
  readonly addressLine1Input: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipCodeInput: Locator;
  readonly countryInput: Locator;

  // Membership details
  readonly membershipStageSelect: Locator;
  readonly membershipTypeSelect: Locator;
  readonly centerSelect: Locator;
  readonly joinDateInput: Locator;

  // Form actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  // Tabs in manage page
  readonly personalTab: Locator;
  readonly contactTab: Locator;
  readonly membershipTab: Locator;
  readonly discipleshipTab: Locator;
  readonly careTab: Locator;
  readonly givingTab: Locator;

  // Accordion sections (collapsible)
  readonly identityProfileSection: Locator;
  readonly householdSection: Locator;
  readonly contactPreferencesSection: Locator;

  // Feedback elements
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation
    this.membersNavLink = page.getByRole('link', { name: /members|membership/i }).first();
    this.addMemberButton = page.getByRole('button', { name: /add.*member|new.*member/i }).or(
      page.getByRole('link', { name: /add.*member|new.*member/i })
    );

    // List page
    this.pageTitle = page.getByRole('heading', { level: 1 });
    // Use more specific placeholder to avoid matching the global search in navbar
    this.searchInput = page.getByPlaceholder(/search.*member|search.*name|search.*household/i);
    this.memberRows = page.locator('[data-testid="member-row"], table tbody tr, [role="row"]');
    this.stageFilter = page.getByLabel(/stage/i);
    this.centerFilter = page.getByLabel(/center/i);
    this.dataGrid = page.locator('[data-testid="data-grid"], [role="grid"], table');

    // Personal information form fields
    this.firstNameInput = page.getByLabel(/first name/i).or(page.locator('[name="firstName"]'));
    this.lastNameInput = page.getByLabel(/last name/i).or(page.locator('[name="lastName"]'));
    this.preferredNameInput = page.getByLabel(/preferred name|nickname/i).or(page.locator('[name="preferredName"]'));
    this.emailInput = page.getByLabel(/email/i).first().or(page.locator('[name="email"]'));
    this.phoneInput = page.getByLabel(/phone|mobile/i).first().or(page.locator('[name="phone"]'));
    this.birthdateInput = page.getByLabel(/birth.*date|date.*birth/i).or(page.locator('[name="birthdate"]'));
    this.maritalStatusSelect = page.getByLabel(/marital.*status/i).or(page.locator('[name="maritalStatus"]'));
    this.genderSelect = page.getByLabel(/gender/i).or(page.locator('[name="gender"]'));

    // Address fields - field names match metadata form: addressStreet, addressCity, addressState, addressPostal
    this.addressLine1Input = page.getByLabel(/street.*address/i).or(page.locator('[name="addressStreet"]'));
    this.cityInput = page.getByLabel(/^city$/i).or(page.locator('[name="addressCity"]'));
    this.stateInput = page.getByLabel(/state.*province|^state$/i).or(page.locator('[name="addressState"]'));
    this.zipCodeInput = page.getByLabel(/postal.*code|^postal$/i).or(page.locator('[name="addressPostal"]'));
    this.countryInput = page.getByLabel(/country/i).or(page.locator('[name="country"]'));

    // Membership details
    this.membershipStageSelect = page.getByLabel(/membership.*stage/i).or(page.locator('[name="stageId"]'));
    this.membershipTypeSelect = page.getByLabel(/membership.*type/i).or(page.locator('[name="typeId"]'));
    this.centerSelect = page.getByLabel(/center|campus/i).first().or(page.locator('[name="centerId"]'));
    this.joinDateInput = page.getByLabel(/join.*date|membership.*date/i).or(page.locator('[name="joinDate"]'));

    // Form actions - "Create member" for new, "Save changes" for edit
    this.saveButton = page.getByRole('button', { name: /create member|save changes|save|submit|update/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i }).or(
      page.getByRole('link', { name: /cancel/i })
    );
    this.deleteButton = page.getByRole('button', { name: /delete|archive|remove/i });

    // Tabs
    this.personalTab = page.getByRole('tab', { name: /personal|profile/i });
    this.contactTab = page.getByRole('tab', { name: /contact/i });
    this.membershipTab = page.getByRole('tab', { name: /membership/i });
    this.discipleshipTab = page.getByRole('tab', { name: /discipleship|growth/i });
    this.careTab = page.getByRole('tab', { name: /care|pastoral/i });
    this.givingTab = page.getByRole('tab', { name: /giving|finance/i });

    // Accordion sections (collapsible) - these need to be expanded to show form fields
    // Section titles: "Identity & profile", "Household", "Contact preferences"
    this.identityProfileSection = page.getByRole('button', { name: /identity.*profile/i });
    this.householdSection = page.getByRole('button', { name: /^household$/i });
    this.contactPreferencesSection = page.getByRole('button', { name: /contact.*preferences/i });

    // Feedback
    this.successMessage = page.locator('[data-testid="success-message"], .toast-success, [role="alert"]').filter({ hasText: /success|saved|created|updated/i });
    this.errorMessage = page.locator('[data-testid="error-message"], .toast-error, [role="alert"]').filter({ hasText: /error|failed|invalid/i });
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, [aria-busy="true"]');
  }

  // ==================== Navigation ====================

  /**
   * Navigate to members list page
   */
  async gotoList() {
    await this.page.goto('/admin/members/list');
  }

  /**
   * Navigate to members dashboard
   */
  async gotoDashboard() {
    await this.page.goto('/admin/members');
  }

  /**
   * Navigate to create new member page
   */
  async gotoCreateMember() {
    await this.page.goto('/admin/members/manage');
  }

  /**
   * Navigate to edit member page
   */
  async gotoEditMember(memberId: string) {
    await this.page.goto(`/admin/members/manage?memberId=${memberId}`);
  }

  /**
   * Navigate to member profile page
   */
  async gotoMemberProfile(memberId: string) {
    await this.page.goto(`/admin/members/${memberId}`);
  }

  // ==================== List Page Actions ====================

  /**
   * Search for a member in the list
   */
  async searchMember(query: string) {
    await this.searchInput.fill(query);
    // Wait for search results to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Click on a member row to view details
   */
  async clickMemberRow(name: string) {
    const row = this.page.locator('[role="row"], table tr').filter({ hasText: name }).first();
    await row.click();
  }

  /**
   * Click edit button for a member in the list
   */
  async clickEditMember(name: string) {
    const row = this.page.locator('[role="row"], table tr').filter({ hasText: name }).first();
    const editButton = row.getByRole('button', { name: /edit/i }).or(
      row.getByRole('link', { name: /edit/i })
    );
    await editButton.click();
  }

  /**
   * Click Add Member button from list or dashboard
   */
  async clickAddMember() {
    await this.addMemberButton.click();
  }

  /**
   * Get count of members displayed in the list
   */
  async getMemberCount(): Promise<number> {
    await this.memberRows.first().waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    return await this.memberRows.count();
  }

  // ==================== Form Actions ====================

  /**
   * Expand an accordion section if it's collapsed
   */
  async expandAccordionSection(section: Locator) {
    const isExpanded = await section.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await section.click();
      // Wait for animation to complete
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Expand all accordion sections in the form to make fields visible
   */
  async expandAllSections() {
    // Expand Identity & Profile section
    if (await this.identityProfileSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.identityProfileSection);
    }

    // Expand Household section
    if (await this.householdSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.householdSection);
    }

    // Expand Contact Preferences section
    if (await this.contactPreferencesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.contactPreferencesSection);
    }
  }

  /**
   * Fill personal information tab
   */
  async fillPersonalInfo(data: {
    firstName: string;
    lastName: string;
    preferredName?: string;
    birthdate?: string;
    maritalStatus?: string;
    gender?: string;
  }) {
    // First expand the Identity & Profile section to reveal form fields
    await this.expandAccordionSection(this.identityProfileSection);

    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);

    if (data.preferredName) {
      await this.preferredNameInput.fill(data.preferredName);
    }

    if (data.birthdate) {
      await this.birthdateInput.fill(data.birthdate);
    }

    if (data.maritalStatus) {
      await this.selectOption(this.maritalStatusSelect, data.maritalStatus);
    }

    if (data.gender) {
      await this.selectOption(this.genderSelect, data.gender);
    }
  }

  /**
   * Fill contact information (email, phone in Contact Preferences section)
   */
  async fillContactInfo(data: {
    email?: string;
    phone?: string;
  }) {
    // Expand Contact Preferences section if visible
    if (await this.contactPreferencesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.contactPreferencesSection);
    }

    if (data.email) {
      await this.emailInput.fill(data.email);
    }

    if (data.phone) {
      await this.phoneInput.fill(data.phone);
    }
  }

  /**
   * Fill address/household information (in Household section)
   * Address fields: addressStreet, addressCity, addressState, addressPostal
   */
  async fillAddressInfo(data: {
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPostal?: string;
    householdName?: string;
  }) {
    // Expand Household section if visible - address fields are here
    if (await this.householdSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.householdSection);
    }

    if (data.addressStreet) {
      await this.addressLine1Input.fill(data.addressStreet);
    }

    if (data.addressCity) {
      await this.cityInput.fill(data.addressCity);
    }

    if (data.addressState) {
      await this.stateInput.fill(data.addressState);
    }

    if (data.addressPostal) {
      await this.zipCodeInput.fill(data.addressPostal);
    }
  }

  /**
   * Fill membership details
   */
  async fillMembershipInfo(data: {
    stage?: string;
    type?: string;
    center?: string;
    joinDate?: string;
  }) {
    if (data.stage) {
      await this.selectOption(this.membershipStageSelect, data.stage);
    }

    if (data.type) {
      await this.selectOption(this.membershipTypeSelect, data.type);
    }

    if (data.center) {
      await this.selectOption(this.centerSelect, data.center);
    }

    if (data.joinDate) {
      await this.joinDateInput.fill(data.joinDate);
    }
  }

  /**
   * Helper to select an option from a dropdown
   */
  private async selectOption(locator: Locator, value: string) {
    try {
      // Try native select first
      await locator.selectOption(value);
    } catch {
      // If not a native select, try clicking and selecting
      await locator.click();
      await this.page.getByRole('option', { name: new RegExp(value, 'i') }).click();
    }
  }

  /**
   * Click on a specific tab in the member form
   */
  async clickTab(tabName: 'personal' | 'contact' | 'membership' | 'discipleship' | 'care' | 'giving') {
    const tabMap = {
      personal: this.personalTab,
      contact: this.contactTab,
      membership: this.membershipTab,
      discipleship: this.discipleshipTab,
      care: this.careTab,
      giving: this.givingTab,
    };
    await tabMap[tabName].click();
  }

  /**
   * Submit the member form
   */
  async submitForm() {
    await this.saveButton.click();
  }

  /**
   * Cancel form and go back
   */
  async cancelForm() {
    await this.cancelButton.click();
  }

  // ==================== Verification ====================

  /**
   * Wait for success message after form submission
   */
  async waitForSuccess() {
    await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 3000 });
  }

  /**
   * Check if page has loaded (data grid or form visible)
   */
  async isListLoaded(): Promise<boolean> {
    return await this.dataGrid.isVisible({ timeout: 10000 });
  }

  /**
   * Check if manage form is loaded (checks for accordion sections or form fields)
   */
  async isFormLoaded(): Promise<boolean> {
    // Wait for either the accordion sections OR the form fields to be visible
    const accordionVisible = await this.identityProfileSection.isVisible({ timeout: 10000 }).catch(() => false);
    if (accordionVisible) {
      return true;
    }
    // Fallback to checking if firstName input is visible (for expanded forms)
    return await this.firstNameInput.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Verify member exists in the list
   */
  async memberExistsInList(name: string): Promise<boolean> {
    const row = this.page.locator('[role="row"], table tr').filter({ hasText: name });
    return await row.isVisible({ timeout: 5000 });
  }

  /**
   * Wait for the page URL to change after save
   */
  async waitForNavigationAfterSave() {
    await this.page.waitForURL(/\/admin\/members\/(?!manage)/, { timeout: 15000 });
  }
}

/**
 * Test data generator for members
 */
export function generateMemberData(overrides: Partial<MemberTestData> = {}): MemberTestData {
  const timestamp = Date.now();
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return {
    firstName,
    lastName,
    preferredName: firstName,
    email: `test-member-${timestamp}@example.com`,
    phone: '555-123-4567',
    birthdate: '1990-01-15',
    maritalStatus: 'single',
    gender: 'male',
    // Address fields matching the form field names
    addressStreet: '123 Test Street',
    addressCity: 'Test City',
    addressState: 'TX',
    addressPostal: '12345',
    ...overrides,
  };
}

export interface MemberTestData {
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  maritalStatus?: string;
  gender?: string;
  // Address fields matching the form field names (in Household section)
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPostal?: string;
}
