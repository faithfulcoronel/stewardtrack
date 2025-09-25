export interface ManageSectionConfigEntry {
  sectionIds: string[];
  fieldNames?: string[];
  helperText?: string | null;
}

export const MANAGE_SECTION_CONFIG: Record<string, ManageSectionConfigEntry> = {
  "edit-identity": {
    sectionIds: ["identity"],
    helperText: "Update household identity details to keep statements and communications personal.",
  },
  "edit-household": {
    sectionIds: ["household", "contact"],
    helperText: "Household and contact preferences sync everywhere members appear in StewardTrack.",
  },
  "edit-emergency": {
    sectionIds: ["emergency"],
    helperText: "Emergency contact information powers pastoral care alerts during crises.",
  },
  "edit-sacraments": {
    sectionIds: ["membership"],
    fieldNames: ["joinDate"],
    helperText: "Track the member's covenant membership date alongside other discipleship milestones.",
  },
  "edit-groups": {
    sectionIds: ["groups"],
    helperText: "Community participation informs discipleship pathways and follow-up queues.",
  },
  "edit-interests": {
    sectionIds: ["gifts"],
    helperText: "Spiritual gifts and ministry interests surface matching serving opportunities.",
  },
  "edit-serving": {
    sectionIds: ["serving-assignment"],
    helperText: "Serving assignments keep teams coordinated and next serve dates accurate.",
  },
  "edit-leadership": {
    sectionIds: ["leadership"],
    helperText: "Leadership scope clarifies coaching relationships and development plans.",
  },
  "edit-care": {
    sectionIds: ["care-plan"],
    helperText: "Care plan updates notify pastors responsible for shepherding this member.",
  },
  "edit-notes": {
    sectionIds: ["care-notes"],
    helperText: "Confidential notes and prayer requests equip pastoral teams for sensitive follow-up.",
  },
  "edit-giving": {
    sectionIds: ["finance-snapshot"],
    helperText: "Giving insights ensure finance teams steward commitments with clarity.",
  },
  "manage-statements": {
    sectionIds: ["finance-admin"],
    helperText: "Statement preferences guide how families receive annual giving communication.",
  },
  "edit-admin": {
    sectionIds: ["membership"],
    helperText: "Membership stage, type, and center connect this profile to the right pastoral pipelines.",
  },
  "edit-tags": {
    sectionIds: ["segmentation"],
    helperText: "Tags and stewardship fields power segmentation, automations, and reporting.",
  },
};
