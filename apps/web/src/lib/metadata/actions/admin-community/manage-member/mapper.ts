import { z } from "zod";

import type { Member, FamilyInput } from "@/models/member.model";
import type { FamilyRole } from "@/models/familyMember.model";
import type { MetadataActionResult } from "../../types";

import type { ManageMemberRequest } from "./request";
import type { MemberManageResources } from "./resourceFactory";

/**
 * Family membership input from the FamilyMembershipManager component
 */
export interface FamilyMembershipInput {
  familyId: string;
  familyName: string;
  role: FamilyRole;
  isPrimary: boolean;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
}

type MemberFormMappingResult =
  | { success: true; data: { payload: Partial<Member>; familyMemberships?: FamilyMembershipInput[] } }
  | { success: false; error: MetadataActionResult };

type FormStageKey = "active" | "new" | "care" | "inactive";

const STAGE_SYNONYMS: Record<FormStageKey, string[]> = {
  active: ["active", "member", "covenant", "regular"],
  new: ["new", "visitor", "guest", "prospect", "attender", "first"],
  care: ["care", "shepherd", "pastoral", "process", "assimilation", "engaged"],
  inactive: ["inactive", "withdrawn", "removed", "lapsed"],
};

const STAGE_FALLBACK_CODE: Record<FormStageKey, string> = {
  active: "active",
  new: "visitor",
  care: "regular_attender",
  inactive: "inactive",
};

const TYPE_SYNONYMS: Record<string, string[]> = {
  "covenant member": ["covenant", "member"],
  attender: ["attender", "attendee", "visitor", "guest"],
  "partner in process": ["partner", "process", "assimilation", "engaged"],
};

const TYPE_FALLBACK_CODE: Record<string, string> = {
  "covenant member": "member",
  attender: "visitor",
  "partner in process": "non_member",
};

const CENTER_SYNONYMS: Record<string, string[]> = {
  downtown: ["downtown", "central", "city"],
  northside: ["northside", "north", "uptown"],
  southridge: ["southridge", "south", "ridge"],
  online: ["online", "digital", "broadcast", "virtual"],
};

export class MemberFormMapper {
  map(request: ManageMemberRequest, resources: MemberManageResources): MemberFormMappingResult {
    const values = request.values ?? {};
    const payload: Partial<Member> = {};

    const isEditMode = Boolean(request.memberId);
    const hasFirstNameField = this.hasField(values, "firstName");
    const hasLastNameField = this.hasField(values, "lastName");

    if (!isEditMode) {
      try {
        payload.first_name = this.requireString(values.firstName, "First name");
        payload.last_name = this.requireString(values.lastName, "Last name");
      } catch (error) {
        return {
          success: false,
          error: this.buildValidationError(
            error instanceof Error ? error.message : "Required member details are missing.",
          ),
        } satisfies MemberFormMappingResult;
      }
    } else {
      if (hasFirstNameField) {
        const firstName = this.cleanString(values.firstName);
        if (!firstName) {
          return {
            success: false,
            error: this.buildValidationError("First name is required."),
          } satisfies MemberFormMappingResult;
        }
        payload.first_name = firstName;
      }

      if (hasLastNameField) {
        const lastName = this.cleanString(values.lastName);
        if (!lastName) {
          return {
            success: false,
            error: this.buildValidationError("Last name is required."),
          } satisfies MemberFormMappingResult;
        }
        payload.last_name = lastName;
      }
    }

    if (!isEditMode && (!payload.first_name || !payload.last_name)) {
      return {
        success: false,
        error: this.buildValidationError("Required member details are missing."),
      } satisfies MemberFormMappingResult;
    }

    if (this.hasField(values, "email")) {
      const email = this.cleanString(values.email)?.toLowerCase() ?? null;
      if (email && !z.string().email().safeParse(email).success) {
        return {
          success: false,
          error: this.buildValidationError("Please provide a valid email address."),
        } satisfies MemberFormMappingResult;
      }
      payload.email = email;
    }

    if (this.hasField(values, "preferredContact")) {
      payload.preferred_contact_method = this.toPreferredContact(values.preferredContact);
    } else if (!isEditMode) {
      payload.preferred_contact_method = this.toPreferredContact(null);
    }

    if (this.hasField(values, "recurringGiving")) {
      payload.giving_recurring_amount = this.toNumeric(values.recurringGiving) ?? null;
    }

    if (this.hasField(values, "pledgeAmount")) {
      payload.giving_pledge_amount = this.toNumeric(values.pledgeAmount) ?? null;
    }

    if (this.hasField(values, "recurringFrequency")) {
      payload.giving_recurring_frequency = this.cleanString(values.recurringFrequency) ?? null;
    }

    if (this.hasField(values, "recurringMethod")) {
      payload.giving_recurring_method = this.cleanString(values.recurringMethod) ?? null;
    }

    if (this.hasField(values, "servingTeam")) {
      payload.serving_team = this.cleanString(values.servingTeam) ?? null;
    }

    if (this.hasField(values, "servingRole")) {
      payload.serving_role = this.cleanString(values.servingRole) ?? null;
    }

    if (this.hasField(values, "servingSchedule")) {
      payload.serving_schedule = this.cleanString(values.servingSchedule) ?? null;
    }

    if (this.hasField(values, "discipleshipNextStep")) {
      payload.discipleship_next_step = this.cleanString(values.discipleshipNextStep) ?? null;
    }

    if (this.hasField(values, "pastoralNotes")) {
      payload.pastoral_notes = this.cleanString(values.pastoralNotes) ?? null;
    } else if (this.hasField(values, "notes")) {
      payload.pastoral_notes = this.cleanString(values.notes) ?? null;
    }

    if (this.hasField(values, "tags")) {
      payload.tags = this.toTags(values.tags);
    } else if (!isEditMode) {
      payload.tags = [];
    }

    if (this.hasField(values, "profilePhoto")) {
      const profilePhotoUrl = this.toProfilePhoto(values.profilePhoto);
      if (profilePhotoUrl !== undefined) {
        payload.profile_picture_url = profilePhotoUrl;
      }
    }

    if (this.hasField(values, "preferredName")) {
      payload.preferred_name = this.cleanString(values.preferredName);
    }

    if (this.hasField(values, "phone")) {
      payload.contact_number = this.cleanString(values.phone) ?? undefined;
    }

    if (this.hasField(values, "birthdate")) {
      payload.birthday = this.toDateString(values.birthdate) ?? null;
    }

    if (this.hasField(values, "maritalStatus")) {
      payload.marital_status = this.toMaritalStatus(values.maritalStatus);
    }

    if (this.hasField(values, "anniversary")) {
      payload.anniversary = this.toDateString(values.anniversary) ?? null;
    }

    if (this.hasField(values, "occupation")) {
      payload.occupation = this.cleanString(values.occupation) ?? null;
    }

    if (this.hasField(values, "smallGroup")) {
      const primaryGroup = this.cleanString(values.smallGroup) ?? null;
      payload.primary_small_group = primaryGroup;
      payload.discipleship_group = primaryGroup;
    }

    if (this.hasField(values, "additionalGroups")) {
      payload.small_groups = this.toTags(values.additionalGroups);
    } else if (!isEditMode) {
      payload.small_groups = [];
    }

    if (this.hasField(values, "pathways")) {
      payload.discipleship_pathways = this.toTags(values.pathways);
    } else if (!isEditMode) {
      payload.discipleship_pathways = [];
    }

    if (this.hasField(values, "mentor")) {
      payload.discipleship_mentor = this.cleanString(values.mentor) ?? null;
    }

    if (this.hasField(values, "attendanceRate")) {
      payload.attendance_rate = this.toNumeric(values.attendanceRate) ?? null;
    }

    if (this.hasField(values, "lastAttendance")) {
      payload.last_attendance_date = this.toDateString(values.lastAttendance) ?? null;
    }

    if (this.hasField(values, "spiritualGifts")) {
      payload.spiritual_gifts = this.toTags(values.spiritualGifts);
    } else if (!isEditMode) {
      payload.spiritual_gifts = [];
    }

    if (this.hasField(values, "ministryInterests")) {
      payload.ministry_interests = this.toTags(values.ministryInterests);
    } else if (!isEditMode) {
      payload.ministry_interests = [];
    }

    if (this.hasField(values, "prayerFocus")) {
      payload.prayer_focus = this.cleanString(values.prayerFocus) ?? null;
    }

    if (this.hasField(values, "prayerRequests")) {
      payload.prayer_requests = this.toTags(values.prayerRequests);
    } else if (!isEditMode) {
      payload.prayer_requests = [];
    }

    if (this.hasField(values, "emergencyContact")) {
      payload.emergency_contact_name = this.cleanString(values.emergencyContact) ?? null;
    }

    if (this.hasField(values, "emergencyRelationship")) {
      payload.emergency_contact_relationship = this.cleanString(values.emergencyRelationship) ?? null;
    }

    if (this.hasField(values, "emergencyPhone")) {
      payload.emergency_contact_phone = this.cleanString(values.emergencyPhone) ?? null;
    }

    if (this.hasField(values, "physician")) {
      payload.physician_name = this.cleanString(values.physician) ?? null;
    }

    if (this.hasField(values, "nextServeDate")) {
      payload.next_serve_at = this.toDateString(values.nextServeDate) ?? null;
    }

    if (this.hasField(values, "leadershipRoles")) {
      payload.leadership_roles = this.toTags(values.leadershipRoles);
    } else if (!isEditMode) {
      payload.leadership_roles = [];
    }

    if (this.hasField(values, "teamFocus")) {
      payload.team_focus = this.cleanString(values.teamFocus) ?? null;
    }

    if (this.hasField(values, "reportsTo")) {
      payload.reports_to = this.cleanString(values.reportsTo) ?? null;
    }

    if (this.hasField(values, "lastHuddle")) {
      payload.last_huddle_at = this.toDateString(values.lastHuddle) ?? null;
    }

    if (this.hasField(values, "primaryFund")) {
      payload.giving_primary_fund = this.cleanString(values.primaryFund) ?? null;
    }

    if (this.hasField(values, "givingTier")) {
      payload.giving_tier = this.cleanString(values.givingTier) ?? null;
    }

    if (this.hasField(values, "financeNotes")) {
      payload.finance_notes = this.cleanString(values.financeNotes) ?? null;
    }

    if (this.hasField(values, "dataSteward")) {
      payload.data_steward = this.cleanString(values.dataSteward) ?? null;
    }

    if (this.hasField(values, "lastReview")) {
      payload.last_review_at = this.toDateString(values.lastReview) ?? null;
    }

    if (this.hasField(values, "envelopeNumber")) {
      payload.envelope_number = this.cleanString(values.envelopeNumber) ?? null;
    }

    if (this.hasField(values, "joinDate")) {
      payload.membership_date = this.toDateString(values.joinDate) ?? null;
    }

    // Spiritual Journey / Faith Background fields
    if (this.hasField(values, "dateTrustedChrist")) {
      payload.date_trusted_christ = this.toDateString(values.dateTrustedChrist) ?? null;
    }

    if (this.hasField(values, "denominationId")) {
      payload.denomination_id = this.cleanString(values.denominationId) ?? null;
    }

    if (this.hasField(values, "previousDenomination")) {
      payload.previous_denomination = this.cleanString(values.previousDenomination) ?? null;
    }

    // Baptism Information fields
    if (this.hasField(values, "baptizedByImmersion")) {
      payload.baptized_by_immersion = this.toBooleanOrNull(values.baptizedByImmersion);
    }

    if (this.hasField(values, "baptismDate")) {
      payload.baptism_date = this.toDateString(values.baptismDate) ?? null;
    }

    if (this.hasField(values, "baptismPlace")) {
      payload.baptism_place = this.cleanString(values.baptismPlace) ?? null;
    }

    if (this.hasField(values, "baptismChurch")) {
      payload.baptism_church = this.cleanString(values.baptismChurch) ?? null;
    }

    if (this.hasField(values, "baptizedBy")) {
      payload.baptized_by = this.cleanString(values.baptizedBy) ?? null;
    }

    // Testimony field
    if (this.hasField(values, "testimony")) {
      payload.testimony = this.cleanString(values.testimony) ?? null;
    }

    // Visitor Information fields
    if (this.hasField(values, "isVisitor")) {
      payload.is_visitor = this.toBooleanOrNull(values.isVisitor);
    }

    if (this.hasField(values, "visitorFirstVisitDate")) {
      payload.visitor_first_visit_date = this.toDateString(values.visitorFirstVisitDate) ?? null;
    }

    if (this.hasField(values, "visitorInvitedByName")) {
      payload.visitor_invited_by_name = this.cleanString(values.visitorInvitedByName) ?? null;
    }

    if (this.hasField(values, "visitorHowHeard")) {
      payload.visitor_how_heard = this.cleanString(values.visitorHowHeard) ?? null;
    }

    if (this.hasField(values, "visitorInterests")) {
      payload.visitor_interests = this.toTags(values.visitorInterests);
    }

    if (this.hasField(values, "visitorFollowUpStatus")) {
      payload.visitor_follow_up_status = this.toVisitorFollowUpStatus(values.visitorFollowUpStatus);
    }

    if (this.hasField(values, "visitorFollowUpNotes")) {
      payload.visitor_follow_up_notes = this.cleanString(values.visitorFollowUpNotes) ?? null;
    }

    if (this.hasField(values, "visitorConvertedToMemberDate")) {
      payload.visitor_converted_to_member_date = this.toDateString(values.visitorConvertedToMemberDate) ?? null;
    }

    if (this.hasField(values, "stage")) {
      const stageValue = this.cleanString(values.stage);
      const stageId = this.findStageId(resources.stages, stageValue);
      if (stageId) {
        payload.membership_status_id = stageId;
      }
    }

    if (this.hasField(values, "membershipType")) {
      const membershipTypeValue = this.cleanString(values.membershipType);
      const typeId = this.findTypeId(resources.types, membershipTypeValue);
      if (typeId) {
        payload.membership_type_id = typeId;
      }
    }

    if (this.hasField(values, "center")) {
      const centerValue = this.cleanString(values.center);
      if (centerValue === null) {
        payload.membership_center_id = null;
      } else {
        const centerId = this.findCenterId(resources.centers, centerValue);
        if (centerId) {
          payload.membership_center_id = centerId;
        }
      }
    }

    // Family memberships handling (new multi-family system via FamilyMembershipManager)
    let familyMemberships: FamilyMembershipInput[] | undefined;
    console.log('[MemberFormMapper] Checking for familyMemberships in values');
    console.log('[MemberFormMapper] hasField familyMemberships:', this.hasField(values, "familyMemberships"));
    console.log('[MemberFormMapper] values keys:', values ? Object.keys(values) : 'values is null/undefined');
    if (this.hasField(values, "familyMemberships")) {
      const rawMemberships = values.familyMemberships;
      console.log('[MemberFormMapper] familyMemberships value:', rawMemberships);
      console.log('[MemberFormMapper] familyMemberships is array:', Array.isArray(rawMemberships));
      console.log('[MemberFormMapper] familyMemberships length:', Array.isArray(rawMemberships) ? rawMemberships.length : 'N/A');

      if (Array.isArray(rawMemberships)) {
        familyMemberships = rawMemberships
          .filter((m): m is Record<string, unknown> => m !== null && typeof m === 'object')
          .map((m) => ({
            familyId: String(m.familyId || ''),
            familyName: String(m.familyName || ''),
            role: this.toFamilyRole(m.role),
            isPrimary: this.toBoolean(m.isPrimary),
            address_street: m.address_street ? String(m.address_street) : null,
            address_city: m.address_city ? String(m.address_city) : null,
            address_state: m.address_state ? String(m.address_state) : null,
            address_postal_code: m.address_postal_code ? String(m.address_postal_code) : null,
          }))
          .filter((m) => m.familyId); // Only include entries with valid family IDs

        // Note: We no longer auto-fill member address from family address here.
        // The member's address fields are separate from family address.
        // Auto-fill happens in the UI (AdminMemberWorkspace) when selecting a primary family.
      }
    }

    // Legacy family fields handling (for backwards compatibility)
    const hasFamilyIdField = this.hasField(values, "familyId");
    const hasLegacyFamilyFields = hasFamilyIdField || this.hasField(values, "familyName");

    // Only process legacy fields if we don't have the new familyMemberships array
    if (!familyMemberships && hasLegacyFamilyFields) {
      console.log('[MemberFormMapper] Processing legacy family fields');
      console.log('[MemberFormMapper] hasFamilyIdField:', hasFamilyIdField);
      console.log('[MemberFormMapper] familyId value:', values?.familyId);
      console.log('[MemberFormMapper] addressStreet value:', values?.addressStreet);
      console.log('[MemberFormMapper] familyRole value:', values?.familyRole);
      console.log('[MemberFormMapper] isPrimaryFamily value:', values?.isPrimaryFamily);

      const familyName = this.hasField(values, "familyName")
        ? this.cleanString(values.familyName)
        : null;
      const addressStreet = this.hasField(values, "addressStreet")
        ? this.cleanString(values.addressStreet)
        : null;
      const addressCity = this.hasField(values, "addressCity")
        ? this.cleanString(values.addressCity)
        : null;
      const addressState = this.hasField(values, "addressState")
        ? this.cleanString(values.addressState)
        : null;
      const addressPostal = this.hasField(values, "addressPostal")
        ? this.cleanString(values.addressPostal)
        : null;
      const familyMembers = this.hasField(values, "familyMembers")
        ? this.toTags(values.familyMembers)
        : [];
      const familyId = this.hasField(values, "familyId")
        ? this.cleanString(values.familyId)
        : null;
      const familyRole = this.hasField(values, "familyRole")
        ? this.toFamilyRole(values.familyRole)
        : 'other';
      const isPrimaryFamily = this.hasField(values, "isPrimaryFamily")
        ? this.toBoolean(values.isPrimaryFamily)
        : true;

      const includeFamily =
        familyId !== null ||
        familyName !== null ||
        addressStreet !== null ||
        addressCity !== null ||
        addressState !== null ||
        addressPostal !== null ||
        familyMembers.length > 0;

      if (includeFamily) {
        const familyPayload: FamilyInput = {
          role: familyRole,
          isPrimary: isPrimaryFamily,
        };
        if (familyId) {
          familyPayload.id = familyId;
        }
        familyPayload.name = familyName;
        familyPayload.address_street = addressStreet;
        familyPayload.address_city = addressCity;
        familyPayload.address_state = addressState;
        familyPayload.address_postal_code = addressPostal;
        familyPayload.member_names = familyMembers;
        payload.family = familyPayload;
      } else if (hasFamilyIdField && familyId === null) {
        payload.family = null;
      }

      // Note: We no longer combine address fields into the legacy 'address' column.
      // The split address columns are used directly, and the database trigger
      // will sync them to the combined 'address' column for backwards compatibility.
    }

    // Handle direct member address fields (from Address section)
    // Map form fields to new split address columns
    if (this.hasField(values, "addressStreet")) {
      payload.address_street = this.cleanString(values.addressStreet);
    }
    if (this.hasField(values, "addressCity")) {
      payload.address_city = this.cleanString(values.addressCity);
    }
    if (this.hasField(values, "addressState")) {
      payload.address_state = this.cleanString(values.addressState);
    }
    if (this.hasField(values, "addressPostal")) {
      payload.address_postal_code = this.cleanString(values.addressPostal);
    }
    if (this.hasField(values, "addressCountry")) {
      payload.address_country = this.cleanString(values.addressCountry);
    }

    // Ensure required fields have valid defaults for new members
    if (!isEditMode) {
      if (!payload.gender) {
        payload.gender = 'other';
      }
      if (!payload.marital_status) {
        payload.marital_status = 'single';
      }
      if (!payload.profile_picture_url) {
        payload.profile_picture_url = null;
      }
    }

    return {
      success: true,
      data: { payload, familyMemberships },
    } satisfies MemberFormMappingResult;
  }

  private buildValidationError(message: string): MetadataActionResult {
    return {
      success: false,
      status: 400,
      message,
    };
  }

  private hasField(
    values: ManageMemberRequest["values"],
    key: keyof NonNullable<ManageMemberRequest["values"]>,
  ): boolean {
    if (!values) {
      return false;
    }
    return Object.prototype.hasOwnProperty.call(values, key);
  }

  private requireString(value: unknown, label: string): string {
    const cleaned = this.cleanString(value);
    if (!cleaned) {
      throw new Error(`${label} is required.`);
    }
    return cleaned;
  }

  private cleanString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const normalized = String(value).trim();
    return normalized ? normalized : null;
  }

  private toProfilePhoto(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (value === null) {
      return null;
    }
    if (typeof value === "string") {
      const normalized = value.trim();
      return normalized || null;
    }
    if (typeof value === "object") {
      const candidate = this.cleanString((value as { url?: unknown }).url);
      const remove = this.toBoolean((value as { remove?: unknown }).remove);
      if (remove) {
        return null;
      }
      return candidate ?? null;
    }
    return null;
  }

  private toStageKey(value: unknown): FormStageKey | null {
    const normalized = this.cleanString(value)?.toLowerCase() as FormStageKey | null;
    if (!normalized) {
      return null;
    }
    return normalized === "active" || normalized === "new" || normalized === "care" || normalized === "inactive"
      ? normalized
      : null;
  }

  private toPreferredContact(value: unknown): "email" | "phone" | "text" | "mail" {
    const normalized = this.cleanString(value)?.toLowerCase();
    switch (normalized) {
      case "phone":
      case "text":
      case "mail":
        return normalized;
      case "email":
      default:
        return "email";
    }
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      return normalized === "true" || normalized === "1" || normalized === "yes";
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    return false;
  }

  private toNumeric(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    const normalized = String(value).replace(/,/g, "").trim();
    if (!normalized) {
      return null;
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toDateString(value: unknown): string | null {
    const normalized = this.cleanString(value);
    if (!normalized) {
      return null;
    }
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : normalized;
  }

  private toTags(value: unknown): string[] {
    if (value === null || value === undefined) {
      return [];
    }
    return String(value)
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private toMaritalStatus(value: unknown): Member['marital_status'] | undefined {
    const normalized = this.cleanString(value)?.toLowerCase();
    if (!normalized) {
      return undefined;
    }
    if (normalized === 'engaged' || normalized === 'engagement') {
      return 'engaged';
    }
    if (normalized === 'single' || normalized === 'married' || normalized === 'widowed' || normalized === 'divorced') {
      return normalized as Member['marital_status'];
    }
    return undefined;
  }

  private toFamilyRole(value: unknown): FamilyRole {
    const normalized = this.cleanString(value)?.toLowerCase();
    if (!normalized) {
      return 'other';
    }
    const validRoles: FamilyRole[] = ['head', 'spouse', 'child', 'dependent', 'other'];
    if (validRoles.includes(normalized as FamilyRole)) {
      return normalized as FamilyRole;
    }
    return 'other';
  }

  private toBooleanOrNull(value: unknown): boolean | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return this.toBoolean(value);
  }

  private toVisitorFollowUpStatus(value: unknown): Member['visitor_follow_up_status'] {
    const normalized = this.cleanString(value)?.toLowerCase();
    if (!normalized) {
      return null;
    }
    const validStatuses = ['pending', 'contacted', 'scheduled_visit', 'no_response', 'converted', 'declined'];
    if (validStatuses.includes(normalized)) {
      return normalized as Member['visitor_follow_up_status'];
    }
    return null;
  }

  private findStageId(stages: MemberManageResources["stages"], stageValue: string | null): string | null {
    if (!stages.length || !stageValue) {
      return null;
    }

    const trimmed = stageValue.trim();
    if (!trimmed) {
      return null;
    }

    const directId = stages.find((stage) => stage.id === trimmed);
    if (directId) {
      return directId.id;
    }

    const normalized = trimmed.toLowerCase();
    const directMatch = stages.find(
      (stage) => stage.code?.toLowerCase() === normalized || stage.name?.toLowerCase() === normalized,
    );
    if (directMatch) {
      return directMatch.id;
    }

    const stageKey = this.toStageKey(trimmed);
    if (!stageKey) {
      return null;
    }

    return this.findStageIdByKey(stages, stageKey);
  }

  private findStageIdByKey(
    stages: MemberManageResources["stages"],
    stageKey: FormStageKey,
  ): string | null {
    const normalizedKey = stageKey.toLowerCase();
    const direct = stages.find(
      (stage) => stage.code?.toLowerCase() === normalizedKey || stage.name?.toLowerCase() === normalizedKey,
    );

    if (direct) {
      return direct.id;
    }

    const synonyms = STAGE_SYNONYMS[stageKey];
    const synonymMatch = stages.find((stage) => {
      const composite = `${stage.code ?? ""} ${stage.name ?? ""}`.toLowerCase();
      return synonyms.some((token) => composite.includes(token));
    });

    if (synonymMatch) {
      return synonymMatch.id;
    }

    const fallbackCode = STAGE_FALLBACK_CODE[stageKey];
    const fallback = stages.find((stage) => stage.code?.toLowerCase() === fallbackCode);
    if (fallback) {
      return fallback.id;
    }

    return stages[0]?.id ?? null;
  }

  private findTypeId(types: MemberManageResources["types"], membershipType: string | null): string | null {
    if (!types.length || !membershipType) {
      return null;
    }

    const trimmed = membershipType.trim();
    if (!trimmed) {
      return null;
    }

    const directId = types.find((type) => type.id === trimmed);
    if (directId) {
      return directId.id;
    }

    const normalized = trimmed.toLowerCase();
    const direct = types.find(
      (type) => type.code?.toLowerCase() === normalized || type.name?.toLowerCase() === normalized,
    );

    if (direct) {
      return direct.id;
    }

    for (const [code, synonyms] of Object.entries(TYPE_SYNONYMS)) {
      if (!synonyms.some((token) => normalized.includes(token))) {
        continue;
      }
      const match = types.find((type) => {
        const composite = `${type.code ?? ""} ${type.name ?? ""}`.toLowerCase();
        return synonyms.some((token) => composite.includes(token));
      });
      if (match) {
        return match.id;
      }
      const fallbackCode = TYPE_FALLBACK_CODE[code];
      const fallback = types.find((type) => type.code?.toLowerCase() === fallbackCode);
      if (fallback) {
        return fallback.id;
      }
    }

    return types[0]?.id ?? null;
  }

  private findCenterId(centers: MemberManageResources["centers"], centerValue: string | null): string | null {
    if (!centers.length || !centerValue) {
      return null;
    }

    const trimmed = centerValue.trim();
    if (!trimmed) {
      return null;
    }

    const directId = centers.find((center) => center.id === trimmed);
    if (directId) {
      return directId.id;
    }

    const normalized = trimmed.toLowerCase();
    const direct = centers.find(
      (center) => center.code?.toLowerCase() === normalized || center.name?.toLowerCase() === normalized,
    );

    if (direct) {
      return direct.id;
    }

    for (const [key, synonyms] of Object.entries(CENTER_SYNONYMS)) {
      if (!synonyms.some((token) => normalized.includes(token))) {
        continue;
      }
      const match = centers.find((center) => {
        const composite = `${center.code ?? ""} ${center.name ?? ""}`.toLowerCase();
        return synonyms.some((token) => composite.includes(token));
      });
      if (match) {
        return match.id;
      }
      const fallback = centers.find((center) => center.code?.toLowerCase() === key);
      if (fallback) {
        return fallback.id;
      }
    }

    return centers[0]?.id ?? null;
  }
}
