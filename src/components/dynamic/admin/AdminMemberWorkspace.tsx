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
}

export interface AdminMemberWorkspaceProps {
  variant?: "profile" | "manage";
  tabs?: WorkspaceTabConfig[] | { items?: WorkspaceTabConfig[] } | null;
  form?: WorkspaceFormConfig | null;
  emptyState?: { title?: string | null; description?: string | null } | null;
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

interface ManageWorkspaceProps {
  tabs: WorkspaceTabConfig[];
  form: WorkspaceFormConfig | null;
}

function ManageWorkspace({ tabs, form }: ManageWorkspaceProps) {
  const sections = React.useMemo(() => {
    return tabs.flatMap((tab) => normalizeList<WorkspaceSectionConfig>(tab.sections));
  }, [tabs]);

  const formSections = React.useMemo(() => sections.filter(isFormSection), [sections]);

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

  const [quickCreateOptions, setQuickCreateOptions] = React.useState<Record<string, FormFieldOption[]>>({});
  const [activeQuickCreateField, setActiveQuickCreateField] = React.useState<FormFieldConfig | null>(null);

  const augmentedFields = React.useMemo(() => {
    return fields.map((field) => {
      const quickCreate = ensureQuickCreateAction(field);
      let resultField: FormFieldConfig = field;

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
  }, [fields, quickCreateOptions]);

  const fieldMap = React.useMemo(() => {
    const map = new Map<string, FormFieldConfig>();
    for (const field of augmentedFields) {
      map.set(field.name, field);
    }
    return map;
  }, [augmentedFields]);

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
                          return field;
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
                                    <FormItem
                                      className={getFieldClassName(field.colSpan ?? null)}
                                    >
                                      {field.label && (
                                        <FormLabel className="text-sm font-semibold text-foreground">
                                          {field.label}
                                        </FormLabel>
                                      )}
                                      <FormControl>
                                        {field.type === "select" && field.quickCreate ? (
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

