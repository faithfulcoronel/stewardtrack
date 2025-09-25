"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { normalizeList, renderAction, type ActionConfig } from "../shared";
import { AdminDetailPanels, type DetailPanel } from "./AdminDetailPanels";
import { AdminLookupQuickCreate } from "./AdminLookupQuickCreate";
import { useAdminFormController } from "./useAdminFormController";
import { renderFieldInput, type ControllerRender } from "./fieldRenderers";
import type {
  AdminFormMode,
  FormFieldConfig,
  FormFieldOption,
  FormFieldQuickCreateConfig,
} from "./types";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandDialog,
} from "@/components/ui/command";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export interface WorkspaceSummary {
  label: string;
  value: string;
  description?: string | null;
  tone?: "positive" | "informative" | "warning" | "critical" | "neutral" | null;
}

interface WorkspaceSectionBase {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  summary?: WorkspaceSummary | null;
  badge?: string | null;
  action?: ActionConfig | null;
}

export interface WorkspacePanelSection extends WorkspaceSectionBase {
  kind?: "panel" | null;
  panels?: DetailPanel[] | { items?: DetailPanel[] } | null;
}

export interface WorkspaceFormSection extends WorkspaceSectionBase {
  kind: "form";
  fields?: FormFieldConfig[] | { items?: FormFieldConfig[] } | null;
  helperText?: string | null;
}

export type WorkspaceSectionConfig = WorkspacePanelSection | WorkspaceFormSection;

export interface WorkspaceTabConfig {
  id: string;
  label: string;
  description?: string | null;
  icon?: string | null;
  sections?: WorkspaceSectionConfig[] | { items?: WorkspaceSectionConfig[] } | null;
}

export interface WorkspaceFormConfig {
  initialValues?: Record<string, unknown> | null;
  submitLabel?: string | null;
  submitAction?: ActionConfig | null;
  cancelAction?: ActionConfig | null;
  mode?: AdminFormMode | null;
  footnote?: string | null;
  lookupOptions?: Record<string, FormFieldOption[] | { items?: FormFieldOption[] } | null> | null;
}

export interface AdminMemberWorkspaceProps {
  variant?: "profile" | "manage";
  tabs?: WorkspaceTabConfig[] | { items?: WorkspaceTabConfig[] } | null;
  form?: WorkspaceFormConfig | null;
  emptyState?: { title?: string | null; description?: string | null } | null;
}

interface HouseholdOption {
  key: string;
  id: string | null;
  name: string;
  members: string[];
  envelopeNumber?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
  };
}

export function AdminMemberWorkspace(props: AdminMemberWorkspaceProps) {
  const variant = props.variant ?? "profile";
  const tabs = normalizeList<WorkspaceTabConfig>(props.tabs);

  const [activeTab, setActiveTab] = React.useState<string>(() => tabs[0]?.id ?? "overview");

  React.useEffect(() => {
    const defaultTab = tabs[0]?.id;
    if (defaultTab && defaultTab !== activeTab) {
      setActiveTab(defaultTab);
    }
  }, [tabs, activeTab]);

  if (!tabs.length) {
    const emptyTitle = props.emptyState?.title ?? "No sections available";
    const emptyDescription =
      props.emptyState?.description ?? "Metadata configuration did not provide any workspace sections.";
    return (
      <div className="rounded-3xl border border-border/60 bg-background p-8 text-center">
        <h3 className="text-lg font-semibold text-foreground">{emptyTitle}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  if (variant === "manage") {
    return <ManageWorkspace tabs={tabs} form={props.form ?? null} />;
  }

  return <ProfileWorkspace tabs={tabs} />;
}

function ProfileWorkspace({ tabs }: { tabs: WorkspaceTabConfig[] }) {
  return (
    <section className="space-y-6">
      <Tabs defaultValue={tabs[0]?.id ?? "overview"} className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="whitespace-nowrap">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const sections = normalizeList<WorkspaceSectionConfig>(tab.sections).filter(
            (section) => !isFormSection(section),
          );

          return (
            <TabsContent key={tab.id} value={tab.id} className="space-y-6">
              {tab.description && (
                <p className="text-sm text-muted-foreground/90">{tab.description}</p>
              )}
              {sections.map((section) => (
                <div key={section.id ?? section.title ?? tab.id} className="space-y-4">
                  {(section.title || section.summary) && (
                    <header className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        {section.title && (
                          <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                        )}
                        {section.description && (
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        )}
                      </div>
                      {section.summary && (
                        <Card className="border-border/60">
                          <CardContent className="py-3">
                            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {section.summary.label}
                            </div>
                            <div className="text-base font-semibold text-foreground">{section.summary.value}</div>
                            {section.summary.description && (
                              <p className="mt-1 text-xs text-muted-foreground">{section.summary.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </header>
                  )}
                  <AdminDetailPanels panels={section.panels ?? []} columns={section.badge ? 3 : undefined} />
                </div>
              ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </section>
  );
}

function maybeAugmentHouseholdField(field: FormFieldConfig): FormFieldConfig {
  if (field.name === "memberId") {
    return {
      ...field,
      readOnly: true,
      disabled: true,
    } satisfies FormFieldConfig;
  }

  if (field.name === "householdMembers") {
    const automationNote = "Household members are managed automatically from the selected household.";
    const helperText = field.helperText ?? "";
    const alreadyNoted = helperText.includes(automationNote);
    return {
      ...field,
      readOnly: true,
      disabled: true,
      helperText: alreadyNoted ? helperText : helperText ? `${automationNote} ${helperText}` : automationNote,
    } satisfies FormFieldConfig;
  }

  if (field.name === "householdName") {
    return {
      ...field,
      placeholder: field.placeholder ?? "Start typing or select a household",
    } satisfies FormFieldConfig;
  }

  return field;
}

function buildHouseholdKey(id: string | null, name: string, envelopeNumber: string | null): string {
  const normalizedId = (id ?? "").trim();
  if (normalizedId) {
    return normalizedId;
  }
  const normalizedName = (name ?? "").trim().toLowerCase();
  const normalizedEnvelope = (envelopeNumber ?? "").trim().toLowerCase();
  return `name:${normalizedName || "household"}:${normalizedEnvelope}`;
}

function mapHouseholdRowToOption(row: Record<string, unknown>): HouseholdOption | null {
  const id = typeof row.id === "string" ? row.id.trim() : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  const envelope = typeof row.envelope_number === "string" ? row.envelope_number.trim() : null;
  const members = Array.isArray(row.member_names)
    ? row.member_names
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0)
    : [];

  const addressStreet = typeof row.address_street === "string" ? row.address_street.trim() : null;
  const addressCity = typeof row.address_city === "string" ? row.address_city.trim() : null;
  const addressState = typeof row.address_state === "string" ? row.address_state.trim() : null;
  const addressPostal = typeof row.address_postal_code === "string" ? row.address_postal_code.trim() : null;

  const hasAddress = Boolean(addressStreet || addressCity || addressState || addressPostal);
  const key = buildHouseholdKey(id, name, envelope);

  return {
    key,
    id: id || null,
    name: name || "Unnamed household",
    members: Array.from(new Set(members)),
    envelopeNumber: envelope ?? undefined,
    address: hasAddress
      ? {
          street: addressStreet,
          city: addressCity,
          state: addressState,
          postalCode: addressPostal,
        }
      : undefined,
  } satisfies HouseholdOption;
}

function mergeHouseholdOptions(
  previous: HouseholdOption[],
  incoming: HouseholdOption[],
): HouseholdOption[] {
  const map = new Map<string, HouseholdOption>();
  for (const option of previous) {
    map.set(option.key, option);
  }
  for (const option of incoming) {
    const existing = map.get(option.key);
    if (!existing) {
      map.set(option.key, option);
      continue;
    }
    const mergedMembers = option.members.length ? option.members : existing.members;
    map.set(option.key, {
      ...existing,
      ...option,
      members: Array.from(new Set(mergedMembers)),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function areArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function formatFullName(firstName: unknown, lastName: unknown): string | null {
  const first = typeof firstName === "string" ? firstName.trim() : "";
  const last = typeof lastName === "string" ? lastName.trim() : "";
  const combined = [first, last].filter(Boolean).join(" ").trim();
  return combined || null;
}

interface HouseholdSelectorProps {
  field: FormFieldConfig;
  controllerField: ControllerRender & { name: string };
  households: HouseholdOption[];
  onSelect: (household: HouseholdOption) => void;
  onManualInput: () => void;
  onClearSelection: () => void;
  selectedHouseholdId: string;
  isLoading: boolean;
}

function HouseholdSelector({
  field,
  controllerField,
  households,
  onSelect,
  onManualInput,
  onClearSelection,
  selectedHouseholdId,
  isLoading,
}: HouseholdSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const currentValue = typeof controllerField.value === "string" ? controllerField.value : "";
  const hasSelection = Boolean((selectedHouseholdId ?? "").trim());

  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      controllerField.onChange(event.target.value);
      if (hasSelection) {
        onManualInput();
      }
    },
    [controllerField, hasSelection, onManualInput],
  );

  const handleSelect = React.useCallback(
    (option: HouseholdOption) => {
      onSelect(option);
      setIsDialogOpen(false);
    },
    [onSelect],
  );

  const handleClear = React.useCallback(() => {
    onClearSelection();
    controllerField.onChange("");
  }, [controllerField, onClearSelection]);

  const isBrowseDisabled = isLoading && households.length === 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsDialogOpen(true)}
          disabled={isBrowseDisabled}
        >
          Browse households
        </Button>
        {(hasSelection || currentValue) && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="text-muted-foreground"
          >
            Clear selection
          </Button>
        )}
      </div>
      <Input
        value={currentValue}
        onChange={handleInputChange}
        placeholder={field.placeholder ?? "Start typing or select a household"}
        disabled={hasSelection}
      />

      <CommandDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Command>
          <CommandInput placeholder="Search households..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading households..." : "No households found."}
            </CommandEmpty>
            <CommandGroup>
              {households.map((household) => (
                <CommandItem
                  key={household.key}
                  value={`${household.name} ${household.members.join(" ")}`}
                  onSelect={() => handleSelect(household)}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{household.name}</span>
                    {household.members.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {household.members.join(", ")}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </div>
  );
}

interface ManageWorkspaceProps {
  tabs: WorkspaceTabConfig[];
  form: WorkspaceFormConfig | null;
}

function ManageWorkspace({ tabs, form }: ManageWorkspaceProps) {
  const sections = React.useMemo(() => {
    return tabs.flatMap((tab) => normalizeList<WorkspaceSectionConfig>(tab.sections));
  }, [tabs]);

  const formSections = React.useMemo(() => sections.filter(isFormSection), [sections]);

  const lookupOptionsMap = React.useMemo<Record<string, FormFieldOption[]>>(() => {
    const map: Record<string, FormFieldOption[]> = {};
    if (!form?.lookupOptions) {
      return map;
    }

    for (const [key, rawOptions] of Object.entries(form.lookupOptions)) {
      if (!rawOptions) {
        continue;
      }

      const normalized = normalizeList<FormFieldOption>(rawOptions).reduce<FormFieldOption[]>((acc, option) => {
        const label = typeof option.label === "string" ? option.label.trim() : "";
        const value = typeof option.value === "string" ? option.value.trim() : "";
        if (!label || !value) {
          return acc;
        }
        acc.push({ label, value });
        return acc;
      }, []);

      if (normalized.length > 0) {
        map[key] = normalized;
      }
    }

    return map;
  }, [form?.lookupOptions]);

  const initialHouseholdId = React.useMemo(() => {
    const raw = form?.initialValues?.householdId;
    return typeof raw === "string" ? raw.trim() : "";
  }, [form?.initialValues?.householdId]);

  const initialHouseholdName = React.useMemo(() => {
    const raw = form?.initialValues?.householdName;
    return typeof raw === "string" ? raw.trim() : "";
  }, [form?.initialValues?.householdName]);

  const initialHouseholdMembers = React.useMemo(() => {
    const raw = form?.initialValues?.householdMembers;
    if (!Array.isArray(raw)) {
      return [] as string[];
    }
    return raw
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0);
  }, [form?.initialValues?.householdMembers]);

  const initialEnvelopeNumber = React.useMemo(() => {
    const raw = form?.initialValues?.envelopeNumber;
    return typeof raw === "string" ? raw.trim() : null;
  }, [form?.initialValues?.envelopeNumber]);

  const initialAddress = React.useMemo(() => {
    const street = typeof form?.initialValues?.addressStreet === "string" ? form?.initialValues?.addressStreet?.trim() : null;
    const city = typeof form?.initialValues?.addressCity === "string" ? form?.initialValues?.addressCity?.trim() : null;
    const state = typeof form?.initialValues?.addressState === "string" ? form?.initialValues?.addressState?.trim() : null;
    const postal = typeof form?.initialValues?.addressPostal === "string" ? form?.initialValues?.addressPostal?.trim() : null;
    if (!street && !city && !state && !postal) {
      return null;
    }
    return { street, city, state, postalCode: postal };
  }, [
    form?.initialValues?.addressStreet,
    form?.initialValues?.addressCity,
    form?.initialValues?.addressState,
    form?.initialValues?.addressPostal,
  ]);

  const initialHousehold = React.useMemo<HouseholdOption | null>(() => {
    if (!initialHouseholdId && !initialHouseholdName) {
      return null;
    }
    const key = buildHouseholdKey(initialHouseholdId, initialHouseholdName, initialEnvelopeNumber);
    return {
      key,
      id: initialHouseholdId || null,
      name: initialHouseholdName || "Unnamed household",
      members: initialHouseholdMembers,
      envelopeNumber: initialEnvelopeNumber ?? undefined,
      address: initialAddress ?? undefined,
    } satisfies HouseholdOption;
  }, [initialAddress, initialEnvelopeNumber, initialHouseholdId, initialHouseholdMembers, initialHouseholdName]);

  const allFields = React.useMemo(() => {
    const deduped = new Map<string, FormFieldConfig>();
    for (const section of formSections) {
      for (const field of normalizeList<FormFieldConfig>(section.fields)) {
        if (!deduped.has(field.name)) {
          deduped.set(field.name, field);
        }
      }
    }
    return Array.from(deduped.values());
  }, [formSections]);

  const { fields, form: controller, handleSubmit, formErrors } = useAdminFormController({
    fields: allFields,
    initialValues: form?.initialValues ?? {},
    submitAction: form?.submitAction ?? null,
    mode: form?.mode ?? null,
  });

  const [householdOptions, setHouseholdOptions] = React.useState<HouseholdOption[]>(() => {
    return initialHousehold ? [initialHousehold] : [];
  });
  const [isLoadingHouseholds, setIsLoadingHouseholds] = React.useState(true);
  const [quickCreateOptions, setQuickCreateOptions] = React.useState<Record<string, FormFieldOption[]>>({});
  const [activeQuickCreateField, setActiveQuickCreateField] = React.useState<FormFieldConfig | null>(null);

  const setHouseholdMembers = React.useCallback(
    (members: string[], options?: { dirty?: boolean }) => {
      const currentValue = controller.getValues("householdMembers");
      const normalizedCurrent = Array.isArray(currentValue)
        ? currentValue.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean)
        : [];
      const normalizedNext = members
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter((value) => value.length > 0);

      if (areArraysEqual(normalizedCurrent, normalizedNext)) {
        return;
      }

      controller.setValue("householdMembers", normalizedNext, {
        shouldDirty: options?.dirty ?? false,
        shouldValidate: true,
      });
    },
    [controller],
  );

  const ensureMemberNameIncluded = React.useCallback(
    (members: string[]): string[] => {
      const fullName = formatFullName(controller.getValues("firstName"), controller.getValues("lastName"));
      if (!fullName) {
        return members;
      }
      const normalizedMembers = members.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
      const exists = normalizedMembers.some((value) => value.localeCompare(fullName, undefined, { sensitivity: "accent" }) === 0);
      if (exists) {
        return normalizedMembers;
      }
      return [...normalizedMembers, fullName];
    },
    [controller],
  );

  React.useEffect(() => {
    controller.register("householdId");
  }, [controller]);

  React.useEffect(() => {
    controller.setValue("householdId", initialHouseholdId ?? "", {
      shouldDirty: false,
      shouldValidate: false,
    });
  }, [controller, initialHouseholdId]);

  React.useEffect(() => {
    if (!initialHousehold) {
      return;
    }

    const ensureTextValue = (fieldName: string, nextValue: string | null | undefined) => {
      if (nextValue === undefined || nextValue === null) {
        return;
      }
      const currentValue = controller.getValues(fieldName);
      const normalizedCurrent = typeof currentValue === "string" ? currentValue.trim() : "";
      if (normalizedCurrent.length > 0) {
        return;
      }
      controller.setValue(fieldName as never, nextValue ?? "", {
        shouldDirty: false,
        shouldValidate: false,
      });
    };

    ensureTextValue("householdName", initialHousehold.name ?? "");
    ensureTextValue("envelopeNumber", initialHousehold.envelopeNumber ?? "");

    if (initialHousehold.address) {
      ensureTextValue("addressStreet", initialHousehold.address.street ?? "");
      ensureTextValue("addressCity", initialHousehold.address.city ?? "");
      ensureTextValue("addressState", initialHousehold.address.state ?? "");
      ensureTextValue("addressPostal", initialHousehold.address.postalCode ?? "");
    }

    const currentMembers = controller.getValues("householdMembers");
    const hasMembers = Array.isArray(currentMembers) && currentMembers.some((value) => typeof value === "string" && value.trim().length > 0);
    if (!hasMembers && initialHousehold.members.length > 0) {
      setHouseholdMembers(ensureMemberNameIncluded(initialHousehold.members), { dirty: false });
    }
  }, [
    controller,
    ensureMemberNameIncluded,
    initialHousehold,
    setHouseholdMembers,
  ]);

  React.useEffect(() => {
    if (!initialHousehold) {
      return;
    }
    setHouseholdOptions((previous) => {
      if (previous.some((option) => option.key === initialHousehold.key)) {
        return previous;
      }
      return mergeHouseholdOptions(previous, [initialHousehold]);
    });
  }, [initialHousehold]);

  React.useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseBrowserClient();

    const loadHouseholds = async () => {
      setIsLoadingHouseholds(true);
      try {
        const { data, error } = await supabase
          .from("member_households")
          .select(
            "id,name,envelope_number,address_street,address_city,address_state,address_postal_code,member_names",
          )
          .is("deleted_at", null)
          .order("name", { ascending: true });

        if (error) {
          throw error;
        }

        const mapped = (data ?? [])
          .map(mapHouseholdRowToOption)
          .filter((option): option is HouseholdOption => option !== null);

        if (!isMounted) {
          return;
        }

        setHouseholdOptions((previous) => mergeHouseholdOptions(previous, mapped));
      } catch (error) {
        console.error("Failed to load household directory", error);
        if (isMounted) {
          toast.error(
            "We couldn't load existing households. You can still enter a new household manually.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingHouseholds(false);
        }
      }
    };

    void loadHouseholds();

    return () => {
      isMounted = false;
    };
  }, []);

  const applyLookupOptions = React.useCallback(
    (field: FormFieldConfig): FormFieldConfig => {
      const lookupId = field.lookupId?.trim();
      if (!lookupId) {
        return field;
      }
      const options = lookupOptionsMap[lookupId];
      if (!options?.length) {
        return field;
      }
      return {
        ...field,
        options,
      } satisfies FormFieldConfig;
    },
    [lookupOptionsMap],
  );

  const augmentField = React.useCallback(
    (field: FormFieldConfig): FormFieldConfig => {
      return applyLookupOptions(maybeAugmentHouseholdField(field));
    },
    [applyLookupOptions],
  );

  const augmentedFields = React.useMemo(() => {
    return fields.map((field) => {
      const quickCreate = ensureQuickCreateAction(field);
      let resultField: FormFieldConfig = augmentField(field);

      if (quickCreate && quickCreate !== field.quickCreate) {
        resultField = {
          ...resultField,
          quickCreate,
        } satisfies FormFieldConfig;
      }

      if (field.type !== "select") {
        return resultField;
      }

      const additional = quickCreateOptions[field.name] ?? [];
      if (!additional.length) {
        return resultField;
      }

      const baseOptions = normalizeList<FormFieldOption>(resultField.options);
      const merged = [...baseOptions];
      for (const option of additional) {
        if (!merged.some((item) => item.value === option.value)) {
          merged.push(option);
        }
      }

      return {
        ...resultField,
        options: merged,
      } satisfies FormFieldConfig;
    });
  }, [augmentField, fields, quickCreateOptions]);

  const fieldMap = React.useMemo(() => {
    const map = new Map<string, FormFieldConfig>();
    for (const field of augmentedFields) {
      map.set(field.name, augmentField(field));
    }
    return map;
  }, [augmentField, augmentedFields]);

  const groupedTabs = React.useMemo(() => {
    return tabs.map((tab) => {
      const panelSections = normalizeList<WorkspaceSectionConfig>(tab.sections).filter(
        (section) => !isFormSection(section),
      );
      const editableSections = normalizeList<WorkspaceSectionConfig>(tab.sections).filter(isFormSection);
      return {
        ...tab,
        panelSections,
        editableSections: editableSections as WorkspaceFormSection[],
      };
    });
  }, [tabs]);

  const handleHouseholdSelect = React.useCallback(
    (option: HouseholdOption) => {
      controller.setValue("householdId", option.id ?? "", {
        shouldDirty: true,
        shouldValidate: true,
      });
      controller.setValue("householdName", option.name ?? "", {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (option.envelopeNumber !== undefined) {
        controller.setValue("envelopeNumber", option.envelopeNumber ?? "", {
          shouldDirty: true,
          shouldValidate: true,
        });
      }

      if (option.address) {
        if (option.address.street !== undefined) {
          controller.setValue("addressStreet", option.address.street ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        if (option.address.city !== undefined) {
          controller.setValue("addressCity", option.address.city ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        if (option.address.state !== undefined) {
          controller.setValue("addressState", option.address.state ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
        if (option.address.postalCode !== undefined) {
          controller.setValue("addressPostal", option.address.postalCode ?? "", {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }

      const nextMembers = ensureMemberNameIncluded(option.members);
      setHouseholdMembers(nextMembers, { dirty: true });
    },
    [controller, ensureMemberNameIncluded, setHouseholdMembers],
  );

  const handleHouseholdManualInput = React.useCallback(() => {
    controller.setValue("householdId", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [controller]);

  const handleHouseholdClear = React.useCallback(() => {
    controller.setValue("householdId", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    controller.setValue("householdName", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    controller.setValue("envelopeNumber", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    controller.setValue("addressStreet", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    controller.setValue("addressCity", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    controller.setValue("addressState", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    controller.setValue("addressPostal", "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    setHouseholdMembers([], { dirty: true });
  }, [controller, setHouseholdMembers]);

  const watchHouseholdId = controller.watch("householdId");
  const watchFirstName = controller.watch("firstName");
  const watchLastName = controller.watch("lastName");

  React.useEffect(() => {
    const normalizedId = typeof watchHouseholdId === "string" ? watchHouseholdId.trim() : "";
    if (normalizedId) {
      const selected = householdOptions.find((option) => (option.id ?? "") === normalizedId);
      if (selected) {
        setHouseholdMembers(ensureMemberNameIncluded(selected.members), { dirty: false });
      }
      return;
    }

    const fallbackName = formatFullName(watchFirstName, watchLastName);
    if (!fallbackName) {
      setHouseholdMembers([], { dirty: false });
      return;
    }
    setHouseholdMembers([fallbackName], { dirty: false });
  }, [
    ensureMemberNameIncluded,
    householdOptions,
    setHouseholdMembers,
    watchFirstName,
    watchHouseholdId,
    watchLastName,
  ]);

  const handleQuickCreate = React.useCallback((field: FormFieldConfig) => {
    const lookupId = field.lookupId?.trim();
    if (!lookupId) {
      return;
    }
    const quickCreate = ensureQuickCreateAction(field);
    if (!quickCreate) {
      return;
    }
    setActiveQuickCreateField({
      ...field,
      quickCreate,
    });
  }, []);

  const handleQuickCreateSuccess = React.useCallback(
    (field: FormFieldConfig, option: FormFieldOption) => {
      setQuickCreateOptions((previous) => {
        const existingForField = previous[field.name] ?? [];
        const baseOptions = normalizeList<FormFieldOption>(field.options);
        const exists =
          baseOptions.some((item) => item.value === option.value) ||
          existingForField.some((item) => item.value === option.value);
        if (exists) {
          return previous;
        }
        return {
          ...previous,
          [field.name]: [...existingForField, option],
        } satisfies Record<string, FormFieldOption[]>;
      });

      controller.setValue(field.name as never, option.value, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [controller],
  );

  return (
    <section className="space-y-6">
      <Form {...controller}>
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-3xl border border-border/60 bg-background p-6 shadow-sm"
        >
          {formErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTitle>We couldn&apos;t save your changes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  {formErrors.map((error, index) => (
                    <li key={index} className="text-sm">
                      {error}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue={tabs[0]?.id ?? "overview"} className="space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="whitespace-nowrap">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {groupedTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="space-y-6">
                {tab.description && <p className="text-sm text-muted-foreground/90">{tab.description}</p>}

                {tab.panelSections.map((section) => (
                  <div key={section.id ?? section.title ?? `${tab.id}-summary`} className="space-y-4">
                    {(section.title || section.summary) && (
                      <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          {section.title && (
                            <h3 className="text-lg font-semibold text-foreground">{section.title}</h3>
                          )}
                          {section.description && (
                            <p className="text-sm text-muted-foreground">{section.description}</p>
                          )}
                        </div>
                        {section.summary && (
                          <Card className="border-border/60">
                            <CardContent className="py-3">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {section.summary.label}
                              </div>
                              <div className="text-base font-semibold text-foreground">{section.summary.value}</div>
                              {section.summary.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{section.summary.description}</p>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </header>
                    )}
                    <AdminDetailPanels panels={section.panels ?? []} />
                  </div>
                ))}

                {tab.editableSections.length > 0 && (
                  <Accordion type="multiple" className="space-y-4">
                    {tab.editableSections.map((section) => {
                      const sectionFields = normalizeList<FormFieldConfig>(section.fields).map((field) => {
                        const augmented = fieldMap.get(field.name);
                        if (!augmented) {
                          return augmentField(field);
                        }
                        return {
                          ...augmented,
                          ...field,
                          quickCreate: augmented.quickCreate,
                          options: augmented.options,
                        } satisfies FormFieldConfig;
                      });

                      const accordionValue = section.id ?? section.title ?? `${tab.id}-form-section`;

                      return (
                        <AccordionItem
                          key={accordionValue}
                          value={accordionValue}
                          className="rounded-2xl border border-border/60 bg-card"
                        >
                          <AccordionTrigger className="px-6 py-4 text-left text-base font-semibold text-foreground">
                            <div className="flex w-full flex-col gap-1 text-left">
                              <span>{section.title ?? "Untitled section"}</span>
                              {section.description && (
                                <span className="text-sm font-normal text-muted-foreground">
                                  {section.description}
                                </span>
                              )}
                              {section.summary && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  {section.summary.label}: <span className="text-foreground">{section.summary.value}</span>
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-border/60 px-6 pb-6 pt-4">
                            <div className="grid gap-6 sm:grid-cols-2">
                              {sectionFields.map((field) => (
                                <FormField
                                  key={field.name}
                                  control={controller.control}
                                  name={field.name as never}
                                  render={({ field: controllerField }) => (
                                    <FormItem className={getFieldClassName(field.colSpan ?? null)}>
                                      {field.label && (
                                        <FormLabel className="text-sm font-semibold text-foreground">
                                          {field.label}
                                        </FormLabel>
                                      )}
                                      <FormControl>
                                        {field.name === "householdName" ? (
                                          <HouseholdSelector
                                            field={field}
                                            controllerField={controllerField as ControllerRender & {
                                              name: string;
                                            }}
                                            households={householdOptions}
                                            onSelect={handleHouseholdSelect}
                                            onManualInput={handleHouseholdManualInput}
                                            onClearSelection={handleHouseholdClear}
                                            selectedHouseholdId={
                                              typeof watchHouseholdId === "string" ? watchHouseholdId : ""
                                            }
                                            isLoading={isLoadingHouseholds}
                                          />
                                        ) : field.type === "select" && field.quickCreate ? (
                                          <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex-1">
                                              {renderFieldInput(field, controllerField as ControllerRender)}
                                            </div>
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="icon"
                                              className="shrink-0"
                                              aria-label={field.quickCreate?.label ?? `Add ${field.label ?? "option"}`}
                                              onClick={() => handleQuickCreate(field)}
                                            >
                                              <Plus className="size-4" aria-hidden="true" />
                                              <span className="sr-only">{field.quickCreate?.label ?? "Add"}</span>
                                            </Button>
                                          </div>
                                        ) : (
                                          renderFieldInput(field, controllerField as ControllerRender)
                                        )}
                                      </FormControl>
                                      {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              ))}
                            </div>
                            {section.helperText && (
                              <p className="mt-4 text-xs text-muted-foreground">{section.helperText}</p>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
            {form?.cancelAction ? <div>{renderAction(form.cancelAction, "ghost")}</div> : <span />}
            <Button type="submit" className="px-6" disabled={controller.formState.isSubmitting}>
              {controller.formState.isSubmitting
                ? "Saving..."
                : form?.submitLabel ?? (form?.mode === "edit" ? "Save changes" : "Submit")}
            </Button>
          </div>
        </form>
      </Form>

      {form?.footnote && <p className="text-xs text-muted-foreground/80">{form.footnote}</p>}

      <Dialog
        open={Boolean(activeQuickCreateField)}
        onOpenChange={(open) => {
          if (!open) {
            setActiveQuickCreateField(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          {activeQuickCreateField && (
            <AdminLookupQuickCreate
              key={activeQuickCreateField.name}
              lookupId={activeQuickCreateField.lookupId}
              lookupLabel={activeQuickCreateField.label}
              description={activeQuickCreateField.quickCreate?.description ?? undefined}
              submitLabel={activeQuickCreateField.quickCreate?.submitLabel ?? undefined}
              successMessage={activeQuickCreateField.quickCreate?.successMessage ?? undefined}
              action={activeQuickCreateField.quickCreate?.action ?? null}
              onCancel={() => setActiveQuickCreateField(null)}
              onSuccess={(option) => {
                handleQuickCreateSuccess(activeQuickCreateField, option);
                setActiveQuickCreateField(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function isFormSection(section: WorkspaceSectionConfig): section is WorkspaceFormSection {
  return (section as WorkspaceFormSection).kind === "form";
}

function ensureQuickCreateAction(field: FormFieldConfig): FormFieldQuickCreateConfig | null {
  const quickCreate = field.quickCreate ?? null;
  if (!quickCreate) {
    return null;
  }

  if (quickCreate.action) {
    return quickCreate;
  }

  const lookupId = field.lookupId?.trim();
  if (!lookupId) {
    return quickCreate;
  }

  const action: ActionConfig = {
    id: `quick-create-${lookupId}`,
    kind: "metadata.service",
    config: {
      handler: "admin-community.members.manage.lookup.create",
      lookupId,
    },
  } satisfies ActionConfig;

  return {
    ...quickCreate,
    action,
  } satisfies FormFieldQuickCreateConfig;
}

function getFieldClassName(colSpan: FormFieldConfig["colSpan"]): string {
  switch (colSpan) {
    case "full":
      return "sm:col-span-2";
    case "third":
      return "sm:col-span-2 lg:col-span-1";
    default:
      return "";
  }
}

