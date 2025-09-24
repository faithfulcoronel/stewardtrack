import { z } from "zod";

import type { Member } from "@/models/member.model";
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
    const stageKey = this.toStageKey(values.stage);
    const membershipType = this.cleanString(values.membershipType)?.toLowerCase() ?? null;
    const centerKey = this.cleanString(values.center)?.toLowerCase() ?? null;
    const joinDate = this.toDateString(values.joinDate);
    const preferredContact = this.toPreferredContact(values.preferredContact);
    const recurringGiving = this.toNumeric(values.recurringGiving);
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

    const stageId = this.findStageId(resources.stages, stageKey);
    const typeId = this.findTypeId(resources.types, membershipType);
    const centerId = centerKey === null ? null : this.findCenterId(resources.centers, centerKey);

    const payload: Partial<Member> = {
      first_name: firstName,
      last_name: lastName,
      email,
      membership_date: joinDate ?? null,
      preferred_contact_method: preferredContact,
      giving_recurring_amount: recurringGiving ?? null,
      giving_pledge_amount: pledgeAmount ?? null,
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

    if (phone) {
      payload.contact_number = phone;
    }

    if (stageId) {
      payload.membership_status_id = stageId;
    }

    if (typeId) {
      payload.membership_type_id = typeId;
    }

    if (centerKey === null) {
      payload.membership_center_id = null;
    } else if (centerId) {
      payload.membership_center_id = centerId;
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
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private findStageId(stages: MemberManageResources["stages"], stageKey: FormStageKey | null): string | null {
    if (!stageKey || !stages.length) {
      return null;
    }

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
    if (!membershipType || !types.length) {
      return null;
    }

    const normalized = membershipType.toLowerCase();
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

  private findCenterId(centers: MemberManageResources["centers"], centerKey: string | null): string | null {
    if (!centerKey || !centers.length) {
      return null;
    }

    const normalized = centerKey.toLowerCase();
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
