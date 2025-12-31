import { Page, Locator } from '@playwright/test';

/**
 * Locators for the Member Form
 * Single Responsibility: Manages all form field locators organized by tab/section
 */
export class MemberFormLocators {
  readonly page: Page;

  // ==================== TABS ====================
  readonly profileBasicsTab: Locator;
  readonly engagementTab: Locator;
  readonly careTab: Locator;
  readonly servingTab: Locator;
  readonly financeTab: Locator;
  readonly adminTab: Locator;

  // ==================== ACCORDION SECTIONS ====================
  // Profile basics tab sections
  readonly identityProfileSection: Locator;
  readonly householdSection: Locator;
  readonly contactPreferencesSection: Locator;

  // Engagement tab sections
  readonly communitiesPathwaysSection: Locator;
  readonly giftsInterestsSection: Locator;

  // Care tab sections
  readonly pastoralNotesSection: Locator;
  readonly emergencyContactSection: Locator;

  // Serving tab sections
  readonly servingAssignmentSection: Locator;
  readonly leadershipScopeSection: Locator;

  // Finance tab sections
  readonly givingSection: Locator;
  readonly financeAdminSection: Locator;

  // Admin tab sections
  readonly membershipCentersSection: Locator;
  readonly segmentationSection: Locator;

  // ==================== PROFILE BASICS TAB FIELDS ====================
  // Identity & profile section
  readonly profilePhotoInput: Locator;
  readonly firstNameInput: Locator;
  readonly preferredNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly envelopeNumberInput: Locator;
  readonly birthdateInput: Locator;
  readonly maritalStatusSelect: Locator;
  readonly anniversaryInput: Locator;
  readonly occupationInput: Locator;

  // Household section
  readonly householdNameInput: Locator;
  readonly householdMembersInput: Locator;
  readonly addressStreetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly postalCodeInput: Locator;

  // Contact preferences section
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly preferredContactSelect: Locator;

  // ==================== ENGAGEMENT TAB FIELDS ====================
  readonly smallGroupInput: Locator;
  readonly additionalGroupsInput: Locator;
  readonly pathwaysInput: Locator;
  readonly mentorInput: Locator;
  readonly attendanceRateInput: Locator;
  readonly lastAttendanceInput: Locator;
  readonly spiritualGiftsInput: Locator;
  readonly ministryInterestsInput: Locator;
  readonly discipleshipNextStepInput: Locator;
  readonly prayerFocusInput: Locator;

  // ==================== CARE TAB FIELDS ====================
  readonly pastoralNotesInput: Locator;
  readonly prayerRequestsInput: Locator;
  readonly emergencyContactInput: Locator;
  readonly emergencyRelationshipInput: Locator;
  readonly emergencyPhoneInput: Locator;
  readonly physicianInput: Locator;

  // ==================== SERVING TAB FIELDS ====================
  readonly servingTeamInput: Locator;
  readonly servingRoleInput: Locator;
  readonly servingScheduleInput: Locator;
  readonly servingCoachInput: Locator;
  readonly nextServeDateInput: Locator;
  readonly leadershipRolesInput: Locator;
  readonly teamFocusInput: Locator;
  readonly reportsToInput: Locator;
  readonly lastHuddleInput: Locator;

  // ==================== FINANCE TAB FIELDS ====================
  readonly recurringGivingInput: Locator;
  readonly recurringFrequencySelect: Locator;
  readonly recurringMethodSelect: Locator;
  readonly pledgeAmountInput: Locator;
  readonly pledgeCampaignInput: Locator;
  readonly primaryFundInput: Locator;
  readonly statementPreferenceSelect: Locator;
  readonly capacityTierSelect: Locator;
  readonly financeNotesInput: Locator;

  // ==================== ADMIN TAB FIELDS ====================
  readonly memberIdInput: Locator;
  readonly membershipStageSelect: Locator;
  readonly membershipTypeSelect: Locator;
  readonly centerSelect: Locator;
  readonly joinDateInput: Locator;
  readonly tagsInput: Locator;
  readonly dataStewardInput: Locator;
  readonly lastReviewInput: Locator;

  // Form actions
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly deleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tabs
    this.profileBasicsTab = page.getByRole('tab', { name: /profile.*basics/i });
    this.engagementTab = page.getByRole('tab', { name: /engagement/i });
    this.careTab = page.getByRole('tab', { name: /^care$/i });
    this.servingTab = page.getByRole('tab', { name: /serving/i });
    this.financeTab = page.getByRole('tab', { name: /finance/i });
    this.adminTab = page.getByRole('tab', { name: /admin/i });

    // Accordion sections
    this.identityProfileSection = page.getByRole('button', { name: /identity.*profile/i });
    this.householdSection = page.getByRole('button', { name: /^household$/i });
    this.contactPreferencesSection = page.getByRole('button', { name: /contact.*preferences/i });
    this.communitiesPathwaysSection = page.getByRole('button', { name: /communities.*pathways/i });
    this.giftsInterestsSection = page.getByRole('button', { name: /gifts.*interests/i });
    this.pastoralNotesSection = page.getByRole('button', { name: /pastoral.*notes/i });
    this.emergencyContactSection = page.getByRole('button', { name: /emergency.*contact/i });
    this.servingAssignmentSection = page.getByRole('button', { name: /serving.*assignment/i });
    this.leadershipScopeSection = page.getByRole('button', { name: /leadership.*scope/i });
    this.givingSection = page.getByRole('button', { name: /^giving$/i });
    this.financeAdminSection = page.getByRole('button', { name: /finance.*admin/i });
    this.membershipCentersSection = page.getByRole('button', { name: /membership.*centers/i });
    this.segmentationSection = page.getByRole('button', { name: /segmentation/i });

    // Profile basics fields
    this.profilePhotoInput = page.locator('[name="profilePhoto"]').or(page.getByLabel(/profile.*photo/i));
    this.firstNameInput = page.getByLabel(/first name/i).or(page.locator('[name="firstName"]'));
    this.preferredNameInput = page.getByLabel(/preferred name/i).or(page.locator('[name="preferredName"]'));
    this.lastNameInput = page.getByLabel(/last name/i).or(page.locator('[name="lastName"]'));
    this.envelopeNumberInput = page.getByLabel(/envelope.*number/i).or(page.locator('[name="envelopeNumber"]'));
    this.birthdateInput = page.getByLabel(/birthdate/i).or(page.locator('[name="birthdate"]'));
    this.maritalStatusSelect = page.getByLabel(/marital.*status/i).or(page.locator('[name="maritalStatus"]'));
    this.anniversaryInput = page.getByLabel(/anniversary/i).or(page.locator('[name="anniversary"]'));
    this.occupationInput = page.getByLabel(/occupation/i).or(page.locator('[name="occupation"]'));

    // Household fields
    this.householdNameInput = page.getByLabel(/household.*name/i).or(page.locator('[name="householdName"]'));
    this.householdMembersInput = page.locator('[name="householdMembers"]').or(page.getByLabel(/household.*members/i));
    this.addressStreetInput = page.getByLabel(/street.*address/i).or(page.locator('[name="addressStreet"]'));
    this.cityInput = page.getByLabel(/^city$/i).or(page.locator('[name="addressCity"]'));
    this.stateInput = page.getByLabel(/^state$/i).or(page.locator('[name="addressState"]'));
    this.postalCodeInput = page.getByLabel(/postal.*code/i).or(page.locator('[name="addressPostal"]'));

    // Contact fields
    this.emailInput = page.getByLabel(/^email$/i).or(page.locator('[name="email"]'));
    this.phoneInput = page.getByLabel(/mobile/i).or(page.locator('[name="phone"]'));
    this.preferredContactSelect = page.getByLabel(/preferred.*contact/i).or(page.locator('[name="preferredContact"]'));

    // Engagement fields
    this.smallGroupInput = page.getByLabel(/primary.*group/i).or(page.locator('[name="smallGroup"]'));
    this.additionalGroupsInput = page.locator('[name="additionalGroups"]').or(page.getByLabel(/additional.*groups/i));
    this.pathwaysInput = page.locator('[name="pathways"]').or(page.getByLabel(/growth.*pathways/i));
    this.mentorInput = page.getByLabel(/mentor/i).or(page.locator('[name="mentor"]'));
    this.attendanceRateInput = page.getByLabel(/attendance.*12.*weeks/i).or(page.locator('[name="attendanceRate"]'));
    this.lastAttendanceInput = page.getByLabel(/last.*attended/i).or(page.locator('[name="lastAttendance"]'));
    this.spiritualGiftsInput = page.locator('[name="spiritualGifts"]').or(page.getByLabel(/spiritual.*gifts/i));
    this.ministryInterestsInput = page.locator('[name="ministryInterests"]').or(page.getByLabel(/ministry.*interests/i));
    this.discipleshipNextStepInput = page.getByLabel(/next.*discipleship.*step/i).or(page.locator('[name="discipleshipNextStep"]'));
    this.prayerFocusInput = page.getByLabel(/prayer.*focus/i).or(page.locator('[name="prayerFocus"]'));

    // Care fields
    this.pastoralNotesInput = page.getByLabel(/confidential.*notes/i).or(page.locator('[name="pastoralNotes"]'));
    this.prayerRequestsInput = page.getByLabel(/prayer.*requests/i).or(page.locator('[name="prayerRequests"]'));
    this.emergencyContactInput = page.getByLabel(/contact.*name/i).or(page.locator('[name="emergencyContact"]'));
    this.emergencyRelationshipInput = page.getByLabel(/relationship/i).or(page.locator('[name="emergencyRelationship"]'));
    this.emergencyPhoneInput = page.getByLabel(/contact.*phone/i).or(page.locator('[name="emergencyPhone"]'));
    this.physicianInput = page.getByLabel(/physician/i).or(page.locator('[name="physician"]'));

    // Serving fields
    this.servingTeamInput = page.getByLabel(/serving.*team/i).or(page.locator('[name="servingTeam"]'));
    this.servingRoleInput = page.getByLabel(/serving.*role/i).or(page.locator('[name="servingRole"]'));
    this.servingScheduleInput = page.getByLabel(/serving.*schedule/i).or(page.locator('[name="servingSchedule"]'));
    this.servingCoachInput = page.getByLabel(/^coach$/i).or(page.locator('[name="servingCoach"]'));
    this.nextServeDateInput = page.getByLabel(/next.*serve.*date/i).or(page.locator('[name="nextServeDate"]'));
    this.leadershipRolesInput = page.locator('[name="leadershipRoles"]').or(page.getByLabel(/leadership.*roles/i));
    this.teamFocusInput = page.getByLabel(/team.*focus/i).or(page.locator('[name="teamFocus"]'));
    this.reportsToInput = page.getByLabel(/reports.*to/i).or(page.locator('[name="reportsTo"]'));
    this.lastHuddleInput = page.getByLabel(/last.*huddle/i).or(page.locator('[name="lastHuddle"]'));

    // Finance fields
    this.recurringGivingInput = page.getByLabel(/recurring.*amount/i).or(page.locator('[name="recurringGiving"]'));
    this.recurringFrequencySelect = page.getByLabel(/recurring.*frequency/i).or(page.locator('[name="recurringFrequency"]'));
    this.recurringMethodSelect = page.getByLabel(/recurring.*method/i).or(page.locator('[name="recurringMethod"]'));
    this.pledgeAmountInput = page.getByLabel(/pledge.*amount/i).or(page.locator('[name="pledgeAmount"]'));
    this.pledgeCampaignInput = page.getByLabel(/campaign/i).or(page.locator('[name="pledgeCampaign"]'));
    this.primaryFundInput = page.getByLabel(/preferred.*fund/i).or(page.locator('[name="primaryFund"]'));
    this.statementPreferenceSelect = page.getByLabel(/statement.*delivery/i).or(page.locator('[name="statementPreference"]'));
    this.capacityTierSelect = page.getByLabel(/capacity.*tier/i).or(page.locator('[name="capacityTier"]'));
    this.financeNotesInput = page.getByLabel(/finance.*notes/i).or(page.locator('[name="financeNotes"]'));

    // Admin fields
    this.memberIdInput = page.getByLabel(/member.*id/i).or(page.locator('[name="memberId"]'));
    this.membershipStageSelect = page.getByLabel(/membership.*stage/i).or(page.locator('[name="stage"]'));
    this.membershipTypeSelect = page.getByLabel(/membership.*type/i).or(page.locator('[name="membershipType"]'));
    this.centerSelect = page.getByLabel(/^center$/i).or(page.locator('[name="center"]'));
    this.joinDateInput = page.getByLabel(/join.*date/i).or(page.locator('[name="joinDate"]'));
    this.tagsInput = page.locator('[name="tags"]').or(page.getByLabel(/^tags$/i));
    this.dataStewardInput = page.getByLabel(/data.*steward/i).or(page.locator('[name="dataSteward"]'));
    this.lastReviewInput = page.getByLabel(/last.*review/i).or(page.locator('[name="lastReview"]'));

    // Form actions
    this.saveButton = page.getByRole('button', { name: /create member|save changes|save|submit|update/i });
    this.cancelButton = page.getByRole('button', { name: /cancel/i }).or(page.getByRole('link', { name: /cancel/i }));
    this.deleteButton = page.getByRole('button', { name: /delete|archive|remove/i });
  }
}
