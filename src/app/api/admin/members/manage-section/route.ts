import { NextResponse, type NextRequest } from "next/server";

import { getMembershipContext } from "@/app/admin/members/context";
import { resolvePageMetadata } from "@/lib/metadata/resolver";
import {
  evaluateMetadataActions,
  evaluateMetadataDataSources,
  evaluateMetadataProps,
} from "@/lib/metadata/evaluation";
import type { CanonicalComponent, CanonicalRegion } from "@/lib/metadata/generated/canonical";
import { MANAGE_SECTION_CONFIG, type ManageSectionConfigEntry } from "@/lib/members/manageSectionConfig";
import type { FormFieldConfig, FormFieldOption } from "@/components/dynamic/admin/types";
import type { ActionConfig } from "@/components/dynamic/shared";

interface WorkspaceFormSection {
  id?: string | null;
  kind?: string | null;
  title?: string | null;
  helperText?: string | null;
  fields?: FormFieldConfig[] | { items?: FormFieldConfig[] } | null;
}

interface ManageWorkspaceFormConfig {
  initialValues?: Record<string, unknown> | null;
  submitAction?: ActionConfig | null;
  submitLabel?: string | null;
  mode?: string | null;
  footnote?: string | null;
  lookupOptions?: Record<string, FormFieldOption[] | { items?: FormFieldOption[] } | null> | null;
}

interface ManageSectionResponse {
  data: {
    actionId: string;
    memberId: string;
    fields: FormFieldConfig[];
    initialValues: Record<string, unknown>;
    submitAction: ActionConfig | null;
    submitLabel: string | null;
    mode: string | null;
    footnote: string | null;
    helperText: string | null;
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId");
  const actionId = url.searchParams.get("actionId");

  if (!memberId || !actionId) {
    return NextResponse.json({ error: "Missing memberId or actionId." }, { status: 400 });
  }

  const mapping = MANAGE_SECTION_CONFIG[actionId];
  if (!mapping) {
    return NextResponse.json({ error: "This section does not support inline editing." }, { status: 404 });
  }

  try {
    const membershipContext = await getMembershipContext();
    const resolved = await resolvePageMetadata({
      module: "admin-community",
      route: "members/manage",
      tenant: membershipContext.tenant,
      role: membershipContext.role,
      locale: membershipContext.locale,
      featureFlags: membershipContext.featureFlags,
    });

    const dataScope = await evaluateMetadataDataSources(resolved.definition.page.dataSources ?? [], {
      role: membershipContext.role,
      featureFlags: membershipContext.featureFlags,
      searchParams: { memberId },
    });
    const actions = evaluateMetadataActions(resolved.definition.page.actions ?? [], membershipContext.role);

    const manageComponent = findComponentById(resolved.definition.page.regions ?? [], "manage-workspace");
    if (!manageComponent) {
      return NextResponse.json({ error: "Membership manage workspace is not configured." }, { status: 500 });
    }

    const evaluatedProps = evaluateMetadataProps(manageComponent.props ?? {}, dataScope, actions, {
      role: membershipContext.role,
      featureFlags: membershipContext.featureFlags,
      searchParams: { memberId },
    });

    const tabs = normalizeList<{ sections?: unknown }>(evaluatedProps.tabs);
    const formConfig = (evaluatedProps.form ?? null) as ManageWorkspaceFormConfig | null;

    const sectionMap = buildFormSectionMap(tabs);
    const selectedSections = selectSections(sectionMap, mapping);
    const aggregatedFields = aggregateFields(selectedSections, mapping);

    if (!aggregatedFields.length) {
      return NextResponse.json({ error: "No editable fields were found for this section." }, { status: 404 });
    }

    const helperText = resolveHelperText(selectedSections, mapping);

    const response: ManageSectionResponse = {
      data: {
        actionId,
        memberId,
        fields: aggregatedFields,
        initialValues: formConfig?.initialValues ?? {},
        submitAction: formConfig?.submitAction ?? null,
        submitLabel: formConfig?.submitLabel ?? null,
        mode: formConfig?.mode ?? null,
        footnote: formConfig?.footnote ?? null,
        helperText,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to resolve manage section form", error);
    return NextResponse.json({ error: "Unable to load the edit form." }, { status: 500 });
  }
}

function findComponentById(regions: CanonicalRegion[], id: string): CanonicalComponent | null {
  for (const region of regions) {
    const components = region.components ?? [];
    for (const component of components) {
      if (component.id === id) {
        return component;
      }
      const children = component.children ?? [];
      const nested = findComponentById([{ id: component.id ?? "", components: children }], id);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}

function buildFormSectionMap(tabs: { sections?: unknown }[]): Map<string, WorkspaceFormSection> {
  const map = new Map<string, WorkspaceFormSection>();
  for (const tab of tabs) {
    const sections = normalizeList<WorkspaceFormSection>(tab.sections);
    for (const section of sections) {
      if ((section.kind ?? "panel") !== "form") {
        continue;
      }
      const key = section.id ?? "";
      if (key) {
        map.set(key, section);
      }
    }
  }
  return map;
}

function selectSections(
  sectionMap: Map<string, WorkspaceFormSection>,
  mapping: ManageSectionConfigEntry,
): WorkspaceFormSection[] {
  const sections: WorkspaceFormSection[] = [];
  for (const sectionId of mapping.sectionIds) {
    const section = sectionMap.get(sectionId);
    if (section) {
      sections.push(section);
    }
  }
  return sections;
}

function aggregateFields(
  sections: WorkspaceFormSection[],
  mapping: ManageSectionConfigEntry,
): FormFieldConfig[] {
  const fields = sections.flatMap((section) => normalizeList<FormFieldConfig>(section.fields));
  if (!mapping.fieldNames || mapping.fieldNames.length === 0) {
    return fields;
  }
  const allowed = new Set(mapping.fieldNames);
  return fields.filter((field) => allowed.has(field.name));
}

function resolveHelperText(
  sections: WorkspaceFormSection[],
  mapping: ManageSectionConfigEntry,
): string | null {
  if (mapping.helperText) {
    return mapping.helperText;
  }
  const found = sections.find((section) => (section.helperText ?? "").trim().length > 0);
  return found?.helperText ?? null;
}

function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object" && "items" in (value as Record<string, unknown>)) {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  if (typeof value === "string") {
    return [value as unknown as T];
  }
  return [];
}
