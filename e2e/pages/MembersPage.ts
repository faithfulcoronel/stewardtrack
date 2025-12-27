import { Page, Locator } from '@playwright/test';
import { MemberFormLocators } from './members/MemberFormLocators';
import { MemberFormActions } from './members/MemberFormActions';
import { MemberListPage } from './members/MemberListPage';

// Re-export types and generators for backwards compatibility
export type { MemberTestData, ComprehensiveMemberData } from './members/MemberTestData';
export { generateMemberData, generateComprehensiveMemberData } from './members/MemberTestData';

/**
 * Page Object Model for Members Pages
 *
 * Facade that composes specialized classes for different responsibilities:
 * - MemberFormLocators: Form field locators
 * - MemberFormActions: Form interactions
 * - MemberListPage: List page interactions
 *
 * Maintains backwards compatibility with existing tests.
 */
export class MembersPage {
  readonly page: Page;

  // Composed modules
  readonly form: MemberFormLocators;
  readonly actions: MemberFormActions;
  readonly list: MemberListPage;

  // ==================== BACKWARDS COMPATIBLE LOCATORS ====================
  // Navigation
  readonly membersNavLink: Locator;
  readonly addMemberButton: Locator;

  // List page
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly memberRows: Locator;
  readonly stageFilter: Locator;
  readonly centerFilter: Locator;
  readonly dataGrid: Locator;

  // Tabs (delegated to form)
  readonly profileBasicsTab: Locator;
  readonly engagementTab: Locator;
  readonly careTab: Locator;
  readonly servingTab: Locator;
  readonly financeTab: Locator;
  readonly adminTab: Locator;
  readonly personalTab: Locator;
  readonly contactTab: Locator;
  readonly membershipTab: Locator;
  readonly discipleshipTab: Locator;
  readonly givingTab: Locator;

  // Accordion sections (delegated to form)
  readonly identityProfileSection: Locator;
  readonly householdSection: Locator;
  readonly contactPreferencesSection: Locator;
  readonly communitiesPathwaysSection: Locator;
  readonly giftsInterestsSection: Locator;
  readonly pastoralNotesSection: Locator;
  readonly emergencyContactSection: Locator;
  readonly servingAssignmentSection: Locator;
  readonly leadershipScopeSection: Locator;
  readonly givingSection: Locator;
  readonly financeAdminSection: Locator;
  readonly membershipCentersSection: Locator;
  readonly segmentationSection: Locator;

  // Form fields (delegated to form)
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
  readonly envelopeNumberInput: Locator;
  readonly occupationInput: Locator;
  readonly householdNameInput: Locator;
  readonly preferredContactSelect: Locator;

  // Engagement fields
  readonly smallGroupInput: Locator;
  readonly mentorInput: Locator;
  readonly attendanceRateInput: Locator;
  readonly discipleshipNextStepInput: Locator;
  readonly prayerFocusInput: Locator;

  // Care fields
  readonly pastoralNotesInput: Locator;
  readonly prayerRequestsInput: Locator;
  readonly emergencyContactInput: Locator;
  readonly emergencyRelationshipInput: Locator;
  readonly emergencyPhoneInput: Locator;
  readonly physicianInput: Locator;

  // Serving fields
  readonly servingTeamInput: Locator;
  readonly servingRoleInput: Locator;
  readonly servingScheduleInput: Locator;
  readonly servingCoachInput: Locator;
  readonly teamFocusInput: Locator;
  readonly reportsToInput: Locator;

  // Finance fields
  readonly recurringGivingInput: Locator;
  readonly pledgeAmountInput: Locator;
  readonly pledgeCampaignInput: Locator;
  readonly primaryFundInput: Locator;
  readonly financeNotesInput: Locator;

  // Admin fields
  readonly membershipStageSelect: Locator;
  readonly membershipTypeSelect: Locator;
  readonly centerSelect: Locator;
  readonly joinDateInput: Locator;
  readonly dataStewardInput: Locator;

  // Form actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  // Feedback
  readonly successMessage: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize composed modules
    this.form = new MemberFormLocators(page);
    this.actions = new MemberFormActions(page, this.form);
    this.list = new MemberListPage(page);

    // Delegate list locators
    this.membersNavLink = page.getByRole('link', { name: /members|membership/i }).first();
    this.addMemberButton = this.list.addMemberButton;
    this.pageTitle = this.list.pageTitle;
    this.searchInput = this.list.searchInput;
    this.memberRows = this.list.memberRows;
    this.stageFilter = this.list.stageFilter;
    this.centerFilter = this.list.centerFilter;
    this.dataGrid = this.list.dataGrid;

    // Delegate tab locators
    this.profileBasicsTab = this.form.profileBasicsTab;
    this.engagementTab = this.form.engagementTab;
    this.careTab = this.form.careTab;
    this.servingTab = this.form.servingTab;
    this.financeTab = this.form.financeTab;
    this.adminTab = this.form.adminTab;
    this.personalTab = this.form.profileBasicsTab;
    this.contactTab = page.getByRole('tab', { name: /contact/i });
    this.membershipTab = this.form.adminTab;
    this.discipleshipTab = this.form.engagementTab;
    this.givingTab = this.form.financeTab;

    // Delegate section locators
    this.identityProfileSection = this.form.identityProfileSection;
    this.householdSection = this.form.householdSection;
    this.contactPreferencesSection = this.form.contactPreferencesSection;
    this.communitiesPathwaysSection = this.form.communitiesPathwaysSection;
    this.giftsInterestsSection = this.form.giftsInterestsSection;
    this.pastoralNotesSection = this.form.pastoralNotesSection;
    this.emergencyContactSection = this.form.emergencyContactSection;
    this.servingAssignmentSection = this.form.servingAssignmentSection;
    this.leadershipScopeSection = this.form.leadershipScopeSection;
    this.givingSection = this.form.givingSection;
    this.financeAdminSection = this.form.financeAdminSection;
    this.membershipCentersSection = this.form.membershipCentersSection;
    this.segmentationSection = this.form.segmentationSection;

    // Delegate form field locators
    this.firstNameInput = this.form.firstNameInput;
    this.lastNameInput = this.form.lastNameInput;
    this.preferredNameInput = this.form.preferredNameInput;
    this.emailInput = this.form.emailInput;
    this.phoneInput = this.form.phoneInput;
    this.birthdateInput = this.form.birthdateInput;
    this.maritalStatusSelect = this.form.maritalStatusSelect;
    this.genderSelect = page.getByLabel(/gender/i).or(page.locator('[name="gender"]'));
    this.addressLine1Input = this.form.addressStreetInput;
    this.cityInput = this.form.cityInput;
    this.stateInput = this.form.stateInput;
    this.zipCodeInput = this.form.postalCodeInput;
    this.countryInput = page.getByLabel(/country/i).or(page.locator('[name="country"]'));
    this.envelopeNumberInput = this.form.envelopeNumberInput;
    this.occupationInput = this.form.occupationInput;
    this.householdNameInput = this.form.householdNameInput;
    this.preferredContactSelect = this.form.preferredContactSelect;

    // Engagement fields
    this.smallGroupInput = this.form.smallGroupInput;
    this.mentorInput = this.form.mentorInput;
    this.attendanceRateInput = this.form.attendanceRateInput;
    this.discipleshipNextStepInput = this.form.discipleshipNextStepInput;
    this.prayerFocusInput = this.form.prayerFocusInput;

    // Care fields
    this.pastoralNotesInput = this.form.pastoralNotesInput;
    this.prayerRequestsInput = this.form.prayerRequestsInput;
    this.emergencyContactInput = this.form.emergencyContactInput;
    this.emergencyRelationshipInput = this.form.emergencyRelationshipInput;
    this.emergencyPhoneInput = this.form.emergencyPhoneInput;
    this.physicianInput = this.form.physicianInput;

    // Serving fields
    this.servingTeamInput = this.form.servingTeamInput;
    this.servingRoleInput = this.form.servingRoleInput;
    this.servingScheduleInput = this.form.servingScheduleInput;
    this.servingCoachInput = this.form.servingCoachInput;
    this.teamFocusInput = this.form.teamFocusInput;
    this.reportsToInput = this.form.reportsToInput;

    // Finance fields
    this.recurringGivingInput = this.form.recurringGivingInput;
    this.pledgeAmountInput = this.form.pledgeAmountInput;
    this.pledgeCampaignInput = this.form.pledgeCampaignInput;
    this.primaryFundInput = this.form.primaryFundInput;
    this.financeNotesInput = this.form.financeNotesInput;

    // Admin fields
    this.membershipStageSelect = this.form.membershipStageSelect;
    this.membershipTypeSelect = this.form.membershipTypeSelect;
    this.centerSelect = this.form.centerSelect;
    this.joinDateInput = this.form.joinDateInput;
    this.dataStewardInput = this.form.dataStewardInput;

    // Form actions
    this.saveButton = this.form.saveButton;
    this.cancelButton = this.form.cancelButton;
    this.deleteButton = this.form.deleteButton;

    // Feedback
    this.successMessage = page.locator('[data-testid="success-message"], .toast-success, [role="alert"]').filter({ hasText: /success|saved|created|updated/i });
    this.errorMessage = page.locator('[data-testid="error-message"], .toast-error, [role="alert"]').filter({ hasText: /error|failed|invalid/i });
    this.loadingSpinner = page.locator('[data-testid="loading"], .loading, [aria-busy="true"]');
  }

  // ==================== NAVIGATION ====================

  async gotoList(): Promise<void> {
    await this.list.goto();
  }

  async gotoDashboard(): Promise<void> {
    await this.page.goto('/admin/members');
  }

  async gotoCreateMember(): Promise<void> {
    await this.page.goto('/admin/members/manage');
  }

  async gotoEditMember(memberId: string): Promise<void> {
    await this.page.goto(`/admin/members/manage?memberId=${memberId}`);
  }

  async gotoMemberProfile(memberId: string): Promise<void> {
    await this.page.goto(`/admin/members/${memberId}`);
  }

  // ==================== LIST ACTIONS ====================

  async searchMember(query: string): Promise<void> {
    await this.list.searchMember(query);
  }

  async clickMemberRow(name: string): Promise<void> {
    await this.list.clickMemberRow(name);
  }

  async clickEditMember(name: string): Promise<void> {
    await this.list.clickEditMember(name);
  }

  async clickAddMember(): Promise<void> {
    await this.list.clickAddMember();
  }

  async getMemberCount(): Promise<number> {
    return await this.list.getMemberCount();
  }

  // ==================== FORM ACTIONS ====================

  async expandAccordionSection(section: Locator): Promise<void> {
    await this.actions.expandAccordionSection(section);
  }

  async expandAllSections(): Promise<void> {
    if (await this.identityProfileSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.actions.expandAccordionSection(this.identityProfileSection);
    }
    if (await this.householdSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.actions.expandAccordionSection(this.householdSection);
    }
    if (await this.contactPreferencesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.actions.expandAccordionSection(this.contactPreferencesSection);
    }
  }

  async navigateToTab(tabName: 'profile' | 'engagement' | 'care' | 'serving' | 'finance' | 'admin'): Promise<void> {
    await this.actions.navigateToTab(tabName);
  }

  async fillPersonalInfo(data: { firstName: string; lastName: string; preferredName?: string; birthdate?: string; maritalStatus?: string; gender?: string }): Promise<void> {
    await this.actions.fillIdentitySection(data);
  }

  async fillContactInfo(data: { email?: string; phone?: string }): Promise<void> {
    await this.actions.fillContactSection(data);
  }

  async fillAddressInfo(data: { addressStreet?: string; addressCity?: string; addressState?: string; addressPostal?: string; householdName?: string }): Promise<void> {
    await this.actions.fillHouseholdSection(data);
  }

  async fillMembershipInfo(data: { stage?: string; type?: string; center?: string; joinDate?: string }): Promise<void> {
    await this.actions.fillAdminTab({ stage: data.stage, membershipType: data.type, center: data.center });
  }

  async submitForm(): Promise<void> {
    await this.actions.submitForm();
  }

  async cancelForm(): Promise<void> {
    await this.actions.cancelForm();
  }

  // ==================== VERIFICATION ====================

  async waitForSuccess(): Promise<void> {
    await this.successMessage.waitFor({ state: 'visible', timeout: 10000 });
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 3000 });
  }

  async isListLoaded(): Promise<boolean> {
    return await this.list.isLoaded();
  }

  async isFormLoaded(): Promise<boolean> {
    const accordionVisible = await this.identityProfileSection.isVisible({ timeout: 10000 }).catch(() => false);
    if (accordionVisible) return true;
    return await this.firstNameInput.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async memberExistsInList(name: string): Promise<boolean> {
    return await this.list.memberExistsInList(name);
  }

  async waitForNavigationAfterSave(): Promise<void> {
    await this.page.waitForURL(/\/admin\/members\/(?!manage)/, { timeout: 15000 });
  }

  // ==================== LEGACY TAB METHOD ====================

  async clickTab(tabName: 'personal' | 'contact' | 'membership' | 'discipleship' | 'care' | 'giving'): Promise<void> {
    const tabMap: Record<string, 'profile' | 'engagement' | 'care' | 'serving' | 'finance' | 'admin'> = {
      personal: 'profile',
      contact: 'profile',
      membership: 'admin',
      discipleship: 'engagement',
      care: 'care',
      giving: 'finance',
    };
    await this.actions.navigateToTab(tabMap[tabName]);
  }
}
