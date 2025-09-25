import { z } from "zod";

import type { Member } from "@/models/member.model";
import type { MemberHousehold } from "@/models/memberHousehold.model";
import type { MetadataActionResult } from "../../types";

import type { ManageMemberRequest } from "./request";
import type { MemberManageResources } from "./resourceFactory";

type MemberFormMappingResult =
  | { success: true; data: { payload: Partial<Member> } }
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

    let firstName: string;
    let lastName: string;

    try {
      firstName = this.requireString(values.firstName, "First name");
      lastName = this.requireString(values.lastName, "Last name");
    } catch (error) {
      return {
        success: false,
        error: this.buildValidationError(
          error instanceof Error ? error.message : "Required member details are missing.",
        ),
      };
    }

    if (!firstName || !lastName) {
      return {
        success: false,
        error: this.buildValidationError("Required member details are missing."),
      };
    }

    const email = this.cleanString(values.email)?.toLowerCase() ?? null;

    if (email && !z.string().email().safeParse(email).success) {
      return {
        success: false,
        error: this.buildValidationError("Please provide a valid email address."),
      };
    }

    const phone = this.cleanString(values.phone);
    const stageValue = this.cleanString(values.stage);
    const membershipTypeValue = this.cleanString(values.membershipType);
    const centerValue = this.cleanString(values.center);
    const joinDate = this.toDateString(values.joinDate);
    const preferredContact = this.toPreferredContact(values.preferredContact);
    const recurringGiving = this.toNumeric(values.recurringGiving);
    const recurringFrequency = this.cleanString(values.recurringFrequency);
    const recurringMethod = this.cleanString(values.recurringMethod);
    const pledgeAmount = this.toNumeric(values.pledgeAmount);
    const careStatus = this.cleanString(values.careStatus)?.toLowerCase() ?? null;
    const carePastor = this.cleanString(values.carePastor);
    const followUpDate = this.toDateString(values.followUpDate);
    const servingTeam = this.cleanString(values.servingTeam);
    const servingRole = this.cleanString(values.servingRole);
    const servingSchedule = this.cleanString(values.servingSchedule);
    const discipleshipNextStep = this.cleanString(values.discipleshipNextStep);
    const notes = this.cleanString(values.notes);
    const tags = this.toTags(values.tags);
    const preferredName = this.cleanString(values.preferredName);
    const birthDate = this.toDateString(values.birthdate);
    const maritalStatus = this.toMaritalStatus(values.maritalStatus);
    const anniversary = this.toDateString(values.anniversary);
    const occupation = this.cleanString(values.occupation);
    const primaryGroup = this.cleanString(values.smallGroup);
    const additionalGroups = this.toTags(values.additionalGroups);
    const pathways = this.toTags(values.pathways);
    const mentor = this.cleanString(values.mentor);
    const attendanceRate = this.toNumeric(values.attendanceRate);
    const lastAttendance = this.toDateString(values.lastAttendance);
    const spiritualGifts = this.toTags(values.spiritualGifts);
    const ministryInterests = this.toTags(values.ministryInterests);
    const prayerFocus = this.cleanString(values.prayerFocus);
    const prayerRequests = this.toTags(values.prayerRequests);
    const careTeam = this.toTags(values.careTeam);
    const emergencyContact = this.cleanString(values.emergencyContact);
    const emergencyRelationship = this.cleanString(values.emergencyRelationship);
    const emergencyPhone = this.cleanString(values.emergencyPhone);
    const physician = this.cleanString(values.physician);
    const nextServeDate = this.toDateString(values.nextServeDate);
    const leadershipRoles = this.toTags(values.leadershipRoles);
    const teamFocus = this.cleanString(values.teamFocus);
    const reportsTo = this.cleanString(values.reportsTo);
    const lastHuddle = this.toDateString(values.lastHuddle);
    const primaryFund = this.cleanString(values.primaryFund);
    const givingTier = this.cleanString(values.givingTier);
    const financeNotes = this.cleanString(values.financeNotes);
    const dataSteward = this.cleanString(values.dataSteward);
    const lastReview = this.toDateString(values.lastReview);
    const householdName = this.cleanString(values.householdName);
    const householdMembers = this.toTags(values.householdMembers);
    const addressStreet = this.cleanString(values.addressStreet);
    const addressCity = this.cleanString(values.addressCity);
    const addressState = this.cleanString(values.addressState);
    const addressPostal = this.cleanString(values.addressPostal);
    const envelopeNumber = this.cleanString(values.envelopeNumber);
    const householdId = this.cleanString(values.householdId);
    const profilePhotoUrl = this.toProfilePhoto(values.profilePhoto);

    const stageId = this.findStageId(resources.stages, stageValue);
    const typeId = this.findTypeId(resources.types, membershipTypeValue);
    const centerId = centerValue === null ? null : this.findCenterId(resources.centers, centerValue);

    const payload: Partial<Member> = {
      first_name: firstName,
      last_name: lastName,
      email,
      membership_date: joinDate ?? null,
      preferred_contact_method: preferredContact,
      giving_recurring_amount: recurringGiving ?? null,
      giving_pledge_amount: pledgeAmount ?? null,
      giving_recurring_frequency: recurringFrequency ?? null,
      giving_recurring_method: recurringMethod ?? null,
      care_status_code: careStatus ?? null,
      care_pastor: carePastor ?? null,
      care_follow_up_at: followUpDate ?? null,
      serving_team: servingTeam ?? null,
      serving_role: servingRole ?? null,
      serving_schedule: servingSchedule ?? null,
      discipleship_next_step: discipleshipNextStep ?? null,
      pastoral_notes: notes ?? null,
      tags,
    };

    if (profilePhotoUrl !== undefined) {
      payload.profile_picture_url = profilePhotoUrl;
    }

    if (preferredName !== null || Object.prototype.hasOwnProperty.call(values, 'preferredName')) {
      payload.preferred_name = preferredName;
    }

    if (phone) {
      payload.contact_number = phone;
    }

    payload.birthday = birthDate ?? null;
    payload.marital_status = maritalStatus;
    payload.anniversary = anniversary ?? null;
    payload.occupation = occupation ?? null;
    payload.primary_small_group = primaryGroup ?? null;
    payload.discipleship_group = primaryGroup ?? null;
    payload.small_groups = additionalGroups;
    payload.discipleship_pathways = pathways;
    payload.discipleship_mentor = mentor ?? null;
    payload.attendance_rate = attendanceRate ?? null;
    payload.last_attendance_date = lastAttendance ?? null;
    payload.spiritual_gifts = spiritualGifts;
    payload.ministry_interests = ministryInterests;
    payload.prayer_focus = prayerFocus ?? null;
    payload.prayer_requests = prayerRequests;
    payload.care_team = careTeam;
    payload.emergency_contact_name = emergencyContact ?? null;
    payload.emergency_contact_relationship = emergencyRelationship ?? null;
    payload.emergency_contact_phone = emergencyPhone ?? null;
    payload.physician_name = physician ?? null;
    payload.next_serve_at = nextServeDate ?? null;
    payload.leadership_roles = leadershipRoles;
    payload.team_focus = teamFocus ?? null;
    payload.reports_to = reportsTo ?? null;
    payload.last_huddle_at = lastHuddle ?? null;
    payload.giving_primary_fund = primaryFund ?? null;
    payload.giving_tier = givingTier ?? null;
    payload.finance_notes = financeNotes ?? null;
    payload.data_steward = dataSteward ?? null;
    payload.last_review_at = lastReview ?? null;
    payload.envelope_number = envelopeNumber ?? null;

    if (stageId) {
      payload.membership_status_id = stageId;
    }

    if (typeId) {
      payload.membership_type_id = typeId;
    }

    if (centerValue === null) {
      payload.membership_center_id = null;
    } else if (centerId) {
      payload.membership_center_id = centerId;
    }

    const hasHouseholdIdField = Object.prototype.hasOwnProperty.call(values, "householdId");

    const includeHousehold =
      householdId !== null ||
      householdName !== null ||
      envelopeNumber !== null ||
      addressStreet !== null ||
      addressCity !== null ||
      addressState !== null ||
      addressPostal !== null ||
      householdMembers.length > 0;

    if (includeHousehold) {
      const householdPayload: Partial<MemberHousehold> = {};
      if (householdId) {
        householdPayload.id = householdId;
      }
      householdPayload.name = householdName;
      householdPayload.envelope_number = envelopeNumber;
      householdPayload.address_street = addressStreet;
      householdPayload.address_city = addressCity;
      householdPayload.address_state = addressState;
      householdPayload.address_postal_code = addressPostal;
      householdPayload.member_names = householdMembers;
      payload.household = householdPayload;
    } else if (hasHouseholdIdField && householdId === null) {
      payload.household = { id: null } satisfies Partial<MemberHousehold>;
    }

    return {
      success: true,
      data: { payload },
    };
  }

  private buildValidationError(message: string): MetadataActionResult {
    return {
      success: false,
      status: 400,
      message,
    };
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

  private toMaritalStatus(value: unknown): Member['marital_status'] | null {
    const normalized = this.cleanString(value)?.toLowerCase();
    if (!normalized) {
      return null;
    }
    if (normalized === 'engaged' || normalized === 'engagement') {
      return 'engaged';
    }
    if (normalized === 'single' || normalized === 'married' || normalized === 'widowed' || normalized === 'divorced') {
      return normalized as Member['marital_status'];
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
