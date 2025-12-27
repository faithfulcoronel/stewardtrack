import { Page, Locator } from '@playwright/test';
import { MemberFormLocators } from './MemberFormLocators';

/**
 * Actions for the Member Form
 * Single Responsibility: Handles form interactions (filling, selecting, submitting)
 */
export class MemberFormActions {
  private readonly page: Page;
  private readonly locators: MemberFormLocators;

  constructor(page: Page, locators: MemberFormLocators) {
    this.page = page;
    this.locators = locators;
  }

  /**
   * Expand an accordion section if it's collapsed
   */
  async expandAccordionSection(section: Locator): Promise<void> {
    const isExpanded = await section.getAttribute('aria-expanded');
    if (isExpanded !== 'true') {
      await section.click();
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Navigate to a specific tab and wait for content to load
   */
  async navigateToTab(tabName: 'profile' | 'engagement' | 'care' | 'serving' | 'finance' | 'admin'): Promise<void> {
    const tabMap = {
      profile: this.locators.profileBasicsTab,
      engagement: this.locators.engagementTab,
      care: this.locators.careTab,
      serving: this.locators.servingTab,
      finance: this.locators.financeTab,
      admin: this.locators.adminTab,
    };

    // Map tabs to their first section for content verification
    const sectionMap = {
      profile: this.locators.identityProfileSection,
      engagement: this.locators.communitiesPathwaysSection,
      care: this.locators.pastoralNotesSection,
      serving: this.locators.servingAssignmentSection,
      finance: this.locators.givingSection,
      admin: this.locators.membershipCentersSection,
    };

    const tab = tabMap[tabName];
    const section = sectionMap[tabName];

    if (await tab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tab.click();
      // Wait for tab content to load by checking for section visibility
      await section.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Select an option from a dropdown
   */
  async selectOption(locator: Locator, value: string): Promise<void> {
    try {
      await locator.selectOption(value);
    } catch {
      await locator.click();
      await this.page.getByRole('option', { name: new RegExp(value, 'i') }).click();
    }
  }

  /**
   * Fill identity section fields
   */
  async fillIdentitySection(data: {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    envelopeNumber?: string;
    occupation?: string;
    maritalStatus?: string;
  }): Promise<void> {
    await this.expandAccordionSection(this.locators.identityProfileSection);

    if (data.firstName) await this.locators.firstNameInput.fill(data.firstName);
    if (data.lastName) await this.locators.lastNameInput.fill(data.lastName);
    if (data.preferredName) await this.locators.preferredNameInput.fill(data.preferredName);
    if (data.envelopeNumber) await this.locators.envelopeNumberInput.fill(data.envelopeNumber);
    if (data.occupation) await this.locators.occupationInput.fill(data.occupation);
    if (data.maritalStatus) await this.selectOption(this.locators.maritalStatusSelect, data.maritalStatus);
  }

  /**
   * Fill household section fields
   */
  async fillHouseholdSection(data: {
    householdName?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPostal?: string;
  }): Promise<void> {
    await this.expandAccordionSection(this.locators.householdSection);

    if (data.householdName) await this.locators.householdNameInput.fill(data.householdName);
    if (data.addressStreet) await this.locators.addressStreetInput.fill(data.addressStreet);
    if (data.addressCity) await this.locators.cityInput.fill(data.addressCity);
    if (data.addressState) await this.locators.stateInput.fill(data.addressState);
    if (data.addressPostal) await this.locators.postalCodeInput.fill(data.addressPostal);
  }

  /**
   * Fill contact section fields
   */
  async fillContactSection(data: {
    email?: string;
    phone?: string;
    preferredContact?: string;
  }): Promise<void> {
    await this.expandAccordionSection(this.locators.contactPreferencesSection);

    if (data.email) await this.locators.emailInput.fill(data.email);
    if (data.phone) await this.locators.phoneInput.fill(data.phone);
    if (data.preferredContact) await this.selectOption(this.locators.preferredContactSelect, data.preferredContact);
  }

  /**
   * Fill engagement tab fields
   */
  async fillEngagementTab(data: {
    smallGroup?: string;
    mentor?: string;
    attendanceRate?: string;
    discipleshipNextStep?: string;
    prayerFocus?: string;
  }): Promise<void> {
    await this.navigateToTab('engagement');

    // Communities section
    if (await this.locators.communitiesPathwaysSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.communitiesPathwaysSection);
      if (data.smallGroup) await this.locators.smallGroupInput.fill(data.smallGroup);
      if (data.mentor) await this.locators.mentorInput.fill(data.mentor);
      if (data.attendanceRate) await this.locators.attendanceRateInput.fill(data.attendanceRate);
    }

    // Gifts section
    if (await this.locators.giftsInterestsSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.giftsInterestsSection);
      if (data.discipleshipNextStep) await this.locators.discipleshipNextStepInput.fill(data.discipleshipNextStep);
      if (data.prayerFocus) await this.locators.prayerFocusInput.fill(data.prayerFocus);
    }
  }

  /**
   * Fill care tab fields
   */
  async fillCareTab(data: {
    pastoralNotes?: string;
    prayerRequests?: string;
    emergencyContact?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
    physician?: string;
  }): Promise<void> {
    await this.navigateToTab('care');

    // Pastoral notes section
    if (await this.locators.pastoralNotesSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.pastoralNotesSection);
      if (data.pastoralNotes) await this.locators.pastoralNotesInput.fill(data.pastoralNotes);
      if (data.prayerRequests) await this.locators.prayerRequestsInput.fill(data.prayerRequests);
    }

    // Emergency contact section
    if (await this.locators.emergencyContactSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.emergencyContactSection);
      if (data.emergencyContact) await this.locators.emergencyContactInput.fill(data.emergencyContact);
      if (data.emergencyRelationship) await this.locators.emergencyRelationshipInput.fill(data.emergencyRelationship);
      if (data.emergencyPhone) await this.locators.emergencyPhoneInput.fill(data.emergencyPhone);
      if (data.physician) await this.locators.physicianInput.fill(data.physician);
    }
  }

  /**
   * Fill serving tab fields
   */
  async fillServingTab(data: {
    servingTeam?: string;
    servingRole?: string;
    servingSchedule?: string;
    servingCoach?: string;
    teamFocus?: string;
    reportsTo?: string;
  }): Promise<void> {
    await this.navigateToTab('serving');

    // Serving assignment section
    if (await this.locators.servingAssignmentSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.servingAssignmentSection);
      if (data.servingTeam) await this.locators.servingTeamInput.fill(data.servingTeam);
      if (data.servingRole) await this.locators.servingRoleInput.fill(data.servingRole);
      if (data.servingSchedule) await this.locators.servingScheduleInput.fill(data.servingSchedule);
      if (data.servingCoach) await this.locators.servingCoachInput.fill(data.servingCoach);
    }

    // Leadership section
    if (await this.locators.leadershipScopeSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.leadershipScopeSection);
      if (data.teamFocus) await this.locators.teamFocusInput.fill(data.teamFocus);
      if (data.reportsTo) await this.locators.reportsToInput.fill(data.reportsTo);
    }
  }

  /**
   * Fill finance tab fields
   */
  async fillFinanceTab(data: {
    recurringGiving?: string;
    recurringFrequency?: string;
    recurringMethod?: string;
    pledgeAmount?: string;
    pledgeCampaign?: string;
    primaryFund?: string;
    statementPreference?: string;
    capacityTier?: string;
    financeNotes?: string;
  }): Promise<void> {
    await this.navigateToTab('finance');

    // Giving section
    if (await this.locators.givingSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.givingSection);
      if (data.recurringGiving) await this.locators.recurringGivingInput.fill(data.recurringGiving);
      if (data.recurringFrequency) await this.selectOption(this.locators.recurringFrequencySelect, data.recurringFrequency);
      if (data.recurringMethod) await this.selectOption(this.locators.recurringMethodSelect, data.recurringMethod);
      if (data.pledgeAmount) await this.locators.pledgeAmountInput.fill(data.pledgeAmount);
      if (data.pledgeCampaign) await this.locators.pledgeCampaignInput.fill(data.pledgeCampaign);
      if (data.primaryFund) await this.locators.primaryFundInput.fill(data.primaryFund);
    }

    // Finance admin section
    if (await this.locators.financeAdminSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.financeAdminSection);
      if (data.statementPreference) await this.selectOption(this.locators.statementPreferenceSelect, data.statementPreference);
      if (data.capacityTier) await this.selectOption(this.locators.capacityTierSelect, data.capacityTier);
      if (data.financeNotes) await this.locators.financeNotesInput.fill(data.financeNotes);
    }
  }

  /**
   * Fill admin tab fields
   */
  async fillAdminTab(data: {
    stage?: string;
    membershipType?: string;
    center?: string;
    dataSteward?: string;
  }): Promise<void> {
    await this.navigateToTab('admin');

    // Membership section
    if (await this.locators.membershipCentersSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.membershipCentersSection);
      if (data.stage) await this.selectOption(this.locators.membershipStageSelect, data.stage);
      if (data.membershipType) await this.selectOption(this.locators.membershipTypeSelect, data.membershipType);
      if (data.center) await this.selectOption(this.locators.centerSelect, data.center);
    }

    // Segmentation section
    if (await this.locators.segmentationSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await this.expandAccordionSection(this.locators.segmentationSection);
      if (data.dataSteward) await this.locators.dataStewardInput.fill(data.dataSteward);
    }
  }

  /**
   * Submit the form
   */
  async submitForm(): Promise<void> {
    await this.locators.saveButton.click();
  }

  /**
   * Cancel the form
   */
  async cancelForm(): Promise<void> {
    await this.locators.cancelButton.click();
  }

  /**
   * Get field value
   */
  async getFieldValue(locator: Locator): Promise<string> {
    return await locator.inputValue().catch(() => '');
  }
}
