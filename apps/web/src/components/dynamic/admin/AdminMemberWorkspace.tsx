"use client";

import * as React from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { normalizeList, renderAction, type ActionConfig } from "../shared";
import { AdminDetailPanels, type DetailPanel } from "./AdminDetailPanels";
import { AdminLookupQuickCreate } from "./AdminLookupQuickCreate";
import { FamilyMembershipManager, type FamilyOption, type FamilyMembership } from "./FamilyMembershipManager";
import { useAdminFormController } from "./useAdminFormController";
import { renderFieldInput, type ControllerRender } from "./fieldRenderers";
import type {
  AdminFormMode,
  FormFieldConfig,
  FormFieldOption,
  FormFieldQuickCreateConfig,
} from "./types";
import {
  buildFieldRowHelperMap,
  getFieldGridClassName,
  groupFieldsIntoRows,
} from "./formLayout";
import { Plus, Users, FileText, ChevronRight } from "lucide-react";
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

export interface WorkspaceListItem {
  id: string;
  label: string;
  description?: string | null;
  href?: string | null;
  badge?: string | null;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive" | null;
}

export interface WorkspaceListSection extends WorkspaceSectionBase {
  kind: "list";
  items?: WorkspaceListItem[] | { items?: WorkspaceListItem[] } | null;
  emptyMessage?: string | null;
  viewAllHref?: string | null;
  viewAllLabel?: string | null;
}

export interface WorkspaceFamilyManagerSection extends WorkspaceSectionBase {
  kind: "familyManager";
}

export type WorkspaceSectionConfig = WorkspacePanelSection | WorkspaceFormSection | WorkspaceListSection | WorkspaceFamilyManagerSection;

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
  familyOptions?: FamilyOption[] | null;
  familyMemberships?: FamilyMembership[] | null;
  onCreateFamily?: (name: string) => Promise<FamilyOption | null>;
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

// Type guard functions (defined before components that use them)
function isFormSection(section: WorkspaceSectionConfig): section is WorkspaceFormSection {
  return (section as WorkspaceFormSection).kind === "form";
}

function isListSection(section: WorkspaceSectionConfig): section is WorkspaceListSection {
  return (section as WorkspaceListSection).kind === "list";
}

function isFamilyManagerSection(section: WorkspaceSectionConfig): section is WorkspaceFamilyManagerSection {
  return (section as WorkspaceFamilyManagerSection).kind === "familyManager";
}

function isPanelSection(section: WorkspaceSectionConfig): section is WorkspacePanelSection {
  return !isFormSection(section) && !isListSection(section) && !isFamilyManagerSection(section);
}

export function AdminMemberWorkspace(props: AdminMemberWorkspaceProps) {
  const variant = props.variant ?? "profile";
  const tabs = normalizeList<WorkspaceTabConfig>(props.tabs);

  if (!tabs.length) {
    const emptyTitle = props.emptyState?.title ?? "No sections available";
    const emptyDescription =
      props.emptyState?.description ?? "Metadata configuration did not provide any workspace sections.";
    return (
      <Card className={cn(
        "group relative overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20" />

        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner mb-4">
            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground/60" aria-hidden />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-foreground">{emptyTitle}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">{emptyDescription}</p>
        </CardContent>
      </Card>
    );
  }

  if (variant === "manage") {
    return <ManageWorkspace tabs={tabs} form={props.form ?? null} />;
  }

  return <ProfileWorkspace tabs={tabs} />;
}

function ProfileWorkspace({ tabs }: { tabs: WorkspaceTabConfig[] }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();

  // Get the current tab from URL, defaulting to the first tab
  const defaultTab = tabs[0]?.id ?? "overview";
  const currentTab = searchParams.get("tab") ?? defaultTab;

  // Ensure the current tab is valid, otherwise use the default
  const validTabIds = tabs.map((tab) => tab.id);
  const activeTab = validTabIds.includes(currentTab) ? currentTab : defaultTab;

  // Optimistic tab state for immediate feedback
  const [optimisticTab, setOptimisticTab] = React.useState(activeTab);

  // Sync optimistic tab with actual tab when URL changes
  React.useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  const handleTabChange = React.useCallback(
    (value: string) => {
      // Immediately update the optimistic tab for instant feedback
      setOptimisticTab(value);

      // Use startTransition to keep UI responsive during URL update
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === defaultTab) {
          // Remove tab param if it's the default to keep URL clean
          params.delete("tab");
        } else {
          params.set("tab", value);
        }
        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(newUrl, { scroll: false });
      });
    },
    [searchParams, pathname, router, defaultTab],
  );

  return (
    <section className="space-y-5 sm:space-y-6">
      <Tabs value={optimisticTab} onValueChange={handleTabChange} className="space-y-5 sm:space-y-6">
        <TabsList className="h-10 sm:h-11 p-1 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/40">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all duration-200",
                "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                "data-[state=active]:border-border/60",
                isPending && optimisticTab === tab.id && "opacity-70"
              )}
            >
              {tab.label}
              {isPending && optimisticTab === tab.id && (
                <span className="ml-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const sections = normalizeList<WorkspaceSectionConfig>(tab.sections).filter(
            (section) => !isFormSection(section),
          );

          return (
            <TabsContent key={tab.id} value={tab.id} className={cn(
              "space-y-5 sm:space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              isPending && "opacity-70 transition-opacity"
            )}>
              {tab.description && (
                <p className="text-sm text-muted-foreground/90 pl-3">{tab.description}</p>
              )}
              {sections.map((section, sectionIndex) => (
                <div
                  key={section.id ?? section.title ?? tab.id}
                  className="space-y-4"
                  style={{ animationDelay: `${sectionIndex * 50}ms` }}
                >
                  {(section.title || section.summary) && (
                    <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                      <div className="space-y-1.5">
                        {section.title && (
                          <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                            <span className="h-4 w-1 rounded-full bg-primary shrink-0" />
                            {section.title}
                          </h3>
                        )}
                        {section.description && (
                          <p className="text-sm text-muted-foreground pl-3">{section.description}</p>
                        )}
                      </div>
                      {section.summary && (
                        <Card className={cn(
                          "border-border/40 bg-card/50 backdrop-blur-sm",
                          "transition-all duration-200 hover:border-primary/30"
                        )}>
                          <CardContent className="py-3 px-4">
                            <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                              {section.summary.label}
                            </div>
                            <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                              {section.summary.value}
                            </div>
                            {section.summary.description && (
                              <p className="mt-1 text-xs text-muted-foreground">{section.summary.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      )}
                    </header>
                  )}
                  {isListSection(section) ? (
                    <WorkspaceListSectionRenderer section={section} />
                  ) : isPanelSection(section) ? (
                    <AdminDetailPanels panels={section.panels ?? []} columns={section.badge ? 3 : undefined} />
                  ) : null}
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

function buildHouseholdKey(id: string | null, name: string): string {
  const normalizedId = (id ?? "").trim();
  if (normalizedId) {
    return normalizedId;
  }
  const normalizedName = (name ?? "").trim().toLowerCase();
  // Households are now uniquely identified by name when ID is not available
  return `name:${normalizedName || "household"}`;
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
  const key = buildHouseholdKey(id, name);

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
          className={cn(
            "border-border/60 hover:border-primary/40",
            "transition-all hover:shadow-sm"
          )}
        >
          <Users className="mr-2 h-4 w-4 text-muted-foreground" />
          Browse households
        </Button>
        {(hasSelection || currentValue) && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground"
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
        className={cn(
          "border-border/60 bg-background/50",
          "focus:border-primary/40 focus:ring-primary/20",
          hasSelection && "bg-muted/30"
        )}
      />

      <CommandDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Command className="rounded-xl border-border/40 bg-background/95 backdrop-blur-sm">
          <CommandInput placeholder="Search households..." className="border-b-border/40" />
          <CommandList className="max-h-[300px] sm:max-h-[400px]">
            <CommandEmpty className="py-8 text-center">
              <div className="flex flex-col items-center gap-2">
                <Users className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading households..." : "No households found."}
                </p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {households.map((household, index) => (
                <CommandItem
                  key={household.key}
                  value={`${household.name} ${household.members.join(" ")}`}
                  onSelect={() => handleSelect(household)}
                  className={cn(
                    "px-3 py-2.5 cursor-pointer",
                    "transition-colors hover:bg-muted/50",
                    "animate-in fade-in-0 slide-in-from-left-2 duration-200"
                  )}
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">{household.name}</span>
                    {household.members.length > 0 && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = React.useTransition();

  // Get the current tab from URL, defaulting to the first tab
  const defaultTab = tabs[0]?.id ?? "overview";
  const currentTab = searchParams.get("tab") ?? defaultTab;

  // Ensure the current tab is valid, otherwise use the default
  const validTabIds = tabs.map((tab) => tab.id);
  const activeTab = validTabIds.includes(currentTab) ? currentTab : defaultTab;

  // Optimistic tab state for immediate feedback
  const [optimisticTab, setOptimisticTab] = React.useState(activeTab);

  // Sync optimistic tab with actual tab when URL changes
  React.useEffect(() => {
    setOptimisticTab(activeTab);
  }, [activeTab]);

  const handleTabChange = React.useCallback(
    (value: string) => {
      // Immediately update the optimistic tab for instant feedback
      setOptimisticTab(value);

      // Use startTransition to keep UI responsive during URL update
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === defaultTab) {
          // Remove tab param if it's the default to keep URL clean
          params.delete("tab");
        } else {
          params.set("tab", value);
        }
        const queryString = params.toString();
        const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(newUrl, { scroll: false });
      });
    },
    [searchParams, pathname, router, defaultTab],
  );

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
    const key = buildHouseholdKey(initialHouseholdId, initialHouseholdName);
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

  // Family membership management state
  const [familyOptions, setFamilyOptions] = React.useState<FamilyOption[]>(
    () => form?.familyOptions ?? []
  );
  const [familyMemberships, setFamilyMemberships] = React.useState<FamilyMembership[]>(
    () => form?.familyMemberships ?? []
  );

  // Sync family options from form config
  React.useEffect(() => {
    if (form?.familyOptions) {
      setFamilyOptions(form.familyOptions);
    }
  }, [form?.familyOptions]);

  // Sync family memberships from form config
  React.useEffect(() => {
    if (form?.familyMemberships) {
      setFamilyMemberships(form.familyMemberships);
    }
  }, [form?.familyMemberships]);

  const handleFamilyMembershipsChange = React.useCallback(
    (memberships: FamilyMembership[]) => {
      console.log('[AdminMemberWorkspace] handleFamilyMembershipsChange called with:', memberships);
      console.log('[AdminMemberWorkspace] Number of memberships:', memberships.length);
      setFamilyMemberships(memberships);
      // Store in form values for submission
      controller.setValue("familyMemberships", memberships, {
        shouldDirty: true,
        shouldValidate: true,
      });
      // Verify the value was set
      const verifyValue = controller.getValues("familyMemberships");
      console.log('[AdminMemberWorkspace] Controller familyMemberships after setValue:', verifyValue);

      // Auto-fill address from primary family (only if address fields are empty)
      const primaryMembership = memberships.find((m) => m.isPrimary);
      if (primaryMembership) {
        // Find the family details from familyOptions
        const primaryFamily = familyOptions.find((f) => f.id === primaryMembership.familyId);
        if (primaryFamily) {
          // Get current address values
          const currentStreet = controller.getValues("addressStreet");
          const currentCity = controller.getValues("addressCity");
          const currentState = controller.getValues("addressState");
          const currentPostal = controller.getValues("addressPostal");

          // Only auto-fill if the field is empty
          if (!currentStreet && primaryFamily.address_street) {
            controller.setValue("addressStreet", primaryFamily.address_street, { shouldDirty: true });
          }
          if (!currentCity && primaryFamily.address_city) {
            controller.setValue("addressCity", primaryFamily.address_city, { shouldDirty: true });
          }
          if (!currentState && primaryFamily.address_state) {
            controller.setValue("addressState", primaryFamily.address_state, { shouldDirty: true });
          }
          if (!currentPostal && primaryFamily.address_postal_code) {
            controller.setValue("addressPostal", primaryFamily.address_postal_code, { shouldDirty: true });
          }
        }
      }
    },
    [controller, familyOptions]
  );

  const [_isCreatingFamily, setIsCreatingFamily] = React.useState(false);

  const handleCreateFamily = React.useCallback(
    async (name: string): Promise<FamilyOption | null> => {
      setIsCreatingFamily(true);
      try {
        // Call the quick create action with correct API format
        const response = await fetch("/api/metadata/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: {
              id: "admin-community.families.quickCreate",
              kind: "metadata.service",
              handler: "admin-community.families.quickCreate",
            },
            input: { name },
            context: { params: {} },
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || result.message || "Failed to create family");
        }

        if (result.success && result.data?.family) {
          // Add the new family to the available options
          const newFamily = result.data.family;
          setFamilyOptions((prev) => [...prev, newFamily]);
          toast.success(result.message || `Family "${name}" created successfully`);
          return newFamily;
        }

        throw new Error(result.message || "Failed to create family");
      } catch (error) {
        console.error("[handleCreateFamily] Error:", error);
        toast.error(error instanceof Error ? error.message : "Failed to create family");
        return null;
      } finally {
        setIsCreatingFamily(false);
      }
    },
    []
  );

  // Register familyMemberships field
  React.useEffect(() => {
    controller.register("familyMemberships");
  }, [controller]);

  // Initialize familyMemberships in controller when component mounts
  // This ensures the form data includes familyMemberships on submission
  // Use a ref to ensure we only initialize once, not on every re-render
  const familyMembershipsInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!familyMembershipsInitializedRef.current && form?.familyMemberships) {
      console.log('[AdminMemberWorkspace] Initializing familyMemberships in controller:', form.familyMemberships);
      controller.setValue("familyMemberships", form.familyMemberships, {
        shouldDirty: false,
        shouldValidate: false,
      });
      familyMembershipsInitializedRef.current = true;
    }
  }, [controller, form?.familyMemberships]);

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
      // Dynamic field name requires type assertion for react-hook-form
      (controller.setValue as (name: string, value: unknown, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void)(
        fieldName,
        nextValue ?? "",
        { shouldDirty: false, shouldValidate: false }
      );
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

    const loadHouseholds = async () => {
      setIsLoadingHouseholds(true);
      try {
        const response = await fetch("/api/households");

        if (!response.ok) {
          throw new Error(`Failed to fetch households: ${response.statusText}`);
        }

        const json = await response.json();
        const data: Record<string, unknown>[] = json.data ?? [];

        const mapped = data
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
      const allSections = normalizeList<WorkspaceSectionConfig>(tab.sections);
      const panelSections = allSections.filter(isPanelSection);
      const listSections = allSections.filter(isListSection);
      const editableSections = allSections.filter(isFormSection);
      const familyManagerSections = allSections.filter(isFamilyManagerSection);
      return {
        ...tab,
        panelSections,
        listSections,
        editableSections: editableSections as WorkspaceFormSection[],
        familyManagerSections: familyManagerSections as WorkspaceFamilyManagerSection[],
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

      // Dynamic field name requires type assertion for react-hook-form
      (controller.setValue as (name: string, value: unknown, options?: { shouldDirty?: boolean; shouldValidate?: boolean }) => void)(
        field.name,
        option.value,
        { shouldDirty: true, shouldValidate: true }
      );
    },
    [controller],
  );

  return (
    <section className="space-y-5 sm:space-y-6">
      <Form {...controller}>
        <form
          onSubmit={handleSubmit}
          className={cn(
            "space-y-5 sm:space-y-6 rounded-2xl sm:rounded-3xl p-4 sm:p-6",
            "border border-border/40 bg-card/50 backdrop-blur-sm",
            "relative overflow-hidden shadow-sm"
          )}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20" />
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

          <Tabs value={optimisticTab} onValueChange={handleTabChange} className="space-y-5 sm:space-y-6">
            <TabsList className="h-10 sm:h-11 p-1 bg-muted/50 backdrop-blur-sm rounded-xl border border-border/40">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className={cn(
                    "h-8 sm:h-9 px-3 sm:px-4 rounded-lg transition-all duration-200",
                    "data-[state=active]:bg-background data-[state=active]:shadow-sm",
                    "data-[state=active]:border-border/60",
                    isPending && optimisticTab === tab.id && "opacity-70"
                  )}
                >
                  {tab.label}
                  {isPending && optimisticTab === tab.id && (
                    <span className="ml-2 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {groupedTabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className={cn(
                "space-y-5 sm:space-y-6 animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
                isPending && "opacity-70 transition-opacity"
              )}>
                {tab.description && <p className="text-sm text-muted-foreground/90">{tab.description}</p>}

                {tab.panelSections.map((section, sectionIndex) => (
                  <div
                    key={section.id ?? section.title ?? `${tab.id}-summary`}
                    className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${sectionIndex * 50}ms` }}
                  >
                    {(section.title || section.summary) && (
                      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                          {section.title && (
                            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                              <span className="h-4 w-1 rounded-full bg-primary shrink-0" />
                              {section.title}
                            </h3>
                          )}
                          {section.description && (
                            <p className="text-sm text-muted-foreground pl-3">{section.description}</p>
                          )}
                        </div>
                        {section.summary && (
                          <Card className={cn(
                            "border-border/40 bg-background/50 backdrop-blur-sm",
                            "transition-all duration-200 hover:border-primary/30"
                          )}>
                            <CardContent className="py-3 px-4">
                              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                                {section.summary.label}
                              </div>
                              <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                                {section.summary.value}
                              </div>
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

                {tab.listSections.map((section, sectionIndex) => (
                  <div
                    key={section.id ?? section.title ?? `${tab.id}-list`}
                    className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                    style={{ animationDelay: `${(tab.panelSections.length + sectionIndex) * 50}ms` }}
                  >
                    {(section.title || section.summary) && (
                      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                          {section.title && (
                            <h3 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                              <span className="h-4 w-1 rounded-full bg-primary shrink-0" />
                              {section.title}
                            </h3>
                          )}
                          {section.description && (
                            <p className="text-sm text-muted-foreground pl-3">{section.description}</p>
                          )}
                        </div>
                        {section.summary && (
                          <Card className={cn(
                            "border-border/40 bg-background/50 backdrop-blur-sm",
                            "transition-all duration-200 hover:border-primary/30"
                          )}>
                            <CardContent className="py-3 px-4">
                              <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                                {section.summary.label}
                              </div>
                              <div className="text-base sm:text-lg font-bold text-foreground tabular-nums">
                                {section.summary.value}
                              </div>
                              {section.summary.description && (
                                <p className="mt-1 text-xs text-muted-foreground">{section.summary.description}</p>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </header>
                    )}
                    <WorkspaceListSectionRenderer section={section} />
                  </div>
                ))}

                {tab.familyManagerSections.map((section) => (
                  <FamilyMembershipManager
                    key={section.id ?? `${tab.id}-family-manager`}
                    title={section.title ?? "Family Memberships"}
                    description={section.description ?? undefined}
                    families={familyOptions}
                    memberships={familyMemberships}
                    onChange={handleFamilyMembershipsChange}
                    onCreateFamily={handleCreateFamily}
                  />
                ))}

                {tab.editableSections.length > 0 && (
                  <Accordion
                    type="multiple"
                    className="space-y-3 sm:space-y-4"
                    defaultValue={(() => {
                      // Open the first accordion section by default
                      const firstSection = tab.editableSections[0];
                      if (!firstSection) return [];
                      const firstValue = firstSection.id ?? firstSection.title ?? `${tab.id}-form-section`;
                      return [firstValue];
                    })()}
                  >
                    {tab.editableSections.map((section, sectionIndex) => {
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
                      const fieldRows = groupFieldsIntoRows(sectionFields);
                      const fieldRowHelperMap = buildFieldRowHelperMap(fieldRows);

                      return (
                        <AccordionItem
                          key={accordionValue}
                          value={accordionValue}
                          className={cn(
                            "group relative overflow-hidden",
                            "rounded-xl sm:rounded-2xl border border-border/40",
                            "bg-background/50 backdrop-blur-sm",
                            "transition-all duration-200 hover:border-border/60",
                            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
                          )}
                          style={{ animationDelay: `${(tab.panelSections.length + tab.listSections.length + sectionIndex) * 50}ms` }}
                        >
                          {/* Top accent line */}
                          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/10 group-hover:bg-primary/20 transition-colors" />

                          <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 text-left text-sm sm:text-base font-semibold text-foreground hover:no-underline">
                            <div className="flex w-full flex-col gap-1 text-left">
                              <span className="flex items-center gap-2">
                                <span className="h-3 w-0.5 rounded-full bg-primary/60 shrink-0" />
                                {section.title ?? "Untitled section"}
                              </span>
                              {section.description && (
                                <span className="text-xs sm:text-sm font-normal text-muted-foreground pl-3">
                                  {section.description}
                                </span>
                              )}
                              {section.summary && (
                                <span className="text-xs font-medium text-muted-foreground pl-3">
                                  {section.summary.label}: <span className="text-foreground tabular-nums">{section.summary.value}</span>
                                </span>
                              )}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-border/40 px-4 sm:px-6 pb-4 sm:pb-6 pt-4">
                            <div className="grid gap-6 sm:grid-cols-2">
                              {sectionFields.map((field) => (
                                <FormField
                                  key={field.name}
                                  control={controller.control}
                                  name={field.name as never}
                                  render={({ field: controllerField }) => {
                                    const helperText =
                                      typeof field.helperText === "string" ? field.helperText : "";
                                    const hasHelperText = helperText.trim().length > 0;
                                    const rowHasHelperText = fieldRowHelperMap.get(field.name) ?? false;
                                    const shouldRenderPlaceholder =
                                      rowHasHelperText && !hasHelperText;

                                    return (
                                      <FormItem className={getFieldGridClassName(field.colSpan ?? null)}>
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
                                        {hasHelperText ? (
                                          <FormDescription>{helperText}</FormDescription>
                                        ) : shouldRenderPlaceholder ? (
                                          <FormDescription
                                            aria-hidden="true"
                                            className="select-none opacity-0"
                                          >
                                            Placeholder helper text
                                          </FormDescription>
                                        ) : null}
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }}
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between border-t border-border/40 pt-5 sm:pt-6">
            {form?.cancelAction ? <div>{renderAction(form.cancelAction, "ghost")}</div> : <span className="hidden sm:block" />}
            <Button
              type="submit"
              className={cn(
                "w-full sm:w-auto px-6 sm:px-8 h-10 sm:h-11 font-semibold",
                "transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
              )}
              disabled={controller.formState.isSubmitting}
            >
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

function WorkspaceListSectionRenderer({ section }: { section: WorkspaceListSection }) {
  const items = normalizeList<WorkspaceListItem>(section.items);

  if (items.length === 0) {
    return (
      <Card className={cn(
        "border-dashed border-border/60 bg-muted/20",
        "backdrop-blur-sm"
      )}>
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-10 text-center">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner mb-3">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/60" aria-hidden />
          </div>
          <p className="text-sm text-muted-foreground">
            {section.emptyMessage ?? "No items to display."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <Card className={cn(
        "overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm"
      )}>
        <div className="divide-y divide-border/40">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "group flex items-center justify-between gap-4 px-4 py-3",
                "transition-colors hover:bg-muted/30",
                "animate-in fade-in-0 slide-in-from-left-2 duration-200"
              )}
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="min-w-0 flex-1">
                {item.href ? (
                  <Link
                    href={item.href}
                    className="inline-flex items-center gap-1 font-medium text-primary hover:underline transition-colors"
                  >
                    {item.label}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">{item.label}</span>
                )}
                {item.description && (
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">{item.description}</p>
                )}
              </div>
              {item.badge && (
                <Badge
                  variant={item.badgeVariant ?? "secondary"}
                  className="shrink-0"
                >
                  {item.badge}
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>
      {section.viewAllHref && (
        <div className="text-right">
          <Link
            href={section.viewAllHref}
            className={cn(
              "inline-flex items-center gap-1 text-sm font-medium text-primary",
              "hover:underline transition-colors"
            )}
          >
            {section.viewAllLabel ?? "View all"}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
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
