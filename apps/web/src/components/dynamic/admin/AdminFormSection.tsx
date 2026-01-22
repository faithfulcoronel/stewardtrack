"use client";

import * as React from "react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeList } from "../shared";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { renderAction } from "../shared";
import type { ActionConfig } from "../shared";
import { AdminLookupQuickCreate } from "./AdminLookupQuickCreate";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { useAdminFormController } from "./useAdminFormController";
import { renderFieldInput, type ControllerRender } from "./fieldRenderers";
import type {
  AdminFormSectionProps,
  FormFieldConfig,
  FormFieldOption,
  FormFieldQuickCreateConfig,
  FieldVisibilityCondition,
} from "./types";
import {
  buildFieldRowHelperMap,
  getFieldGridClassName,
  groupFieldsIntoRows,
} from "./formLayout";
import { useWatch, type Control } from "react-hook-form";
import { useFormValues } from "@/lib/metadata/context";

export type { AdminFormSectionProps, FormFieldConfig, FormFieldOption } from "./types";

/**
 * Check if a field should be visible based on its visibility condition
 */
function checkFieldVisibility(
  condition: FieldVisibilityCondition | null | undefined,
  watchedValue: unknown
): boolean {
  if (!condition) {
    return true; // No condition means always visible
  }

  if (condition.isTruthy) {
    return Boolean(watchedValue);
  }

  if (condition.isFalsy) {
    return !watchedValue;
  }

  if (condition.equals !== undefined) {
    return watchedValue === condition.equals;
  }

  return true;
}

/**
 * Wrapper component that handles conditional field visibility.
 * When no visibleWhen condition is set, renders children directly without any overhead.
 */
function ConditionalField({
  field,
  control,
  children,
}: {
  field: FormFieldConfig;
  control: Control<Record<string, unknown>>;
  children: React.ReactNode;
}) {
  const condition = field.visibleWhen;

  // If no condition, render children directly (backwards compatible - no overhead)
  if (!condition) {
    return <>{children}</>;
  }

  // Only use the hook when there's actually a condition to watch
  return (
    <ConditionalFieldWithWatch condition={condition} control={control}>
      {children}
    </ConditionalFieldWithWatch>
  );
}

/**
 * Inner component that watches a field and conditionally renders children.
 * Separated to ensure useWatch is only called when needed.
 */
function ConditionalFieldWithWatch({
  condition,
  control,
  children,
}: {
  condition: FieldVisibilityCondition;
  control: Control<Record<string, unknown>>;
  children: React.ReactNode;
}) {
  const watchedValue = useWatch({
    control,
    name: condition.field,
  });

  const isVisible = checkFieldVisibility(condition, watchedValue);

  if (!isVisible) {
    return null;
  }

  return <>{children}</>;
}

export function AdminFormSection(props: AdminFormSectionProps) {
  const { fields, form, handleSubmit, formErrors } = useAdminFormController(props);
  const [quickCreateOptions, setQuickCreateOptions] = React.useState<Record<string, FormFieldOption[]>>({});
  const [activeQuickCreateField, setActiveQuickCreateField] = React.useState<FormFieldConfig | null>(null);
  // Track which derived fields have been manually edited by user
  const [manuallyEditedDerivedFields, _setManuallyEditedDerivedFields] = React.useState<Set<string>>(new Set());

  // Handle deriveSlugFrom: auto-generate slug fields from source fields
  React.useEffect(() => {
    // Build a map of source fields to their dependent derived fields
    const deriveMappings: Array<{ sourceField: string; targetField: string }> = [];
    for (const field of fields) {
      if (field.deriveSlugFrom) {
        deriveMappings.push({
          sourceField: field.deriveSlugFrom,
          targetField: field.name,
        });
      }
    }

    if (deriveMappings.length === 0) return;

    // Subscribe to form value changes
    const subscription = form.watch((values, { name }) => {
      if (!name) return;

      // Check if the changed field is a source for any derived field
      for (const mapping of deriveMappings) {
        if (mapping.sourceField === name && !manuallyEditedDerivedFields.has(mapping.targetField)) {
          const sourceValue = values[mapping.sourceField];
          if (typeof sourceValue === 'string') {
            const slugValue = slugify(sourceValue);
            form.setValue(mapping.targetField as never, slugValue as never, {
              shouldDirty: true,
            });
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [fields, form, manuallyEditedDerivedFields]);

  // Publish form values to context for sibling components (e.g., RegistrationFormBuilder)
  const formValuesContext = useFormValues();
  React.useEffect(() => {
    if (!formValuesContext) return;

    const subscription = form.watch((values) => {
      // Update context with all form values
      for (const [key, value] of Object.entries(values)) {
        formValuesContext.setValue(key, value);
      }
    });

    // Initial sync
    const currentValues = form.getValues();
    for (const [key, value] of Object.entries(currentValues)) {
      formValuesContext.setValue(key, value);
    }

    return () => subscription.unsubscribe();
  }, [form, formValuesContext]);

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

  const fieldRows = React.useMemo(() => {
    return groupFieldsIntoRows(augmentedFields);
  }, [augmentedFields]);

  const fieldRowHelperMap = React.useMemo(() => {
    return buildFieldRowHelperMap(fieldRows);
  }, [fieldRows]);

  const handleQuickCreate = React.useCallback(
    (field: FormFieldConfig) => {
      const lookupId = field.lookupId?.trim();
      if (!lookupId) {
        toast.error("Unable to determine the lookup context.");
        return;
      }

      if (!field.quickCreate?.action) {
        toast.error("Quick add is not available for this field.");
        return;
      }

      const quickCreate = ensureQuickCreateAction(field);
      setActiveQuickCreateField({
        ...field,
        ...(quickCreate ? { quickCreate } : {}),
      });
    },
    []
  );

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

      form.setValue(field.name as never, option.value as never, {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [form]
  );

  const shouldRenderHeader = !props.hideHeader && Boolean(props.title || props.description);

  return (
    <section className="space-y-6">
      {shouldRenderHeader && (
        <header className="space-y-2">
          {props.title && <h2 className="text-xl font-semibold text-foreground">{props.title}</h2>}
          {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
        </header>
      )}

      <Form {...form}>
        <form
          onSubmit={handleSubmit}
          className="space-y-8 rounded-3xl border border-border/60 bg-card p-6 shadow-sm"
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
          <div className="grid gap-6 sm:grid-cols-2">
            {augmentedFields.map((field) => (
              <ConditionalField
                key={field.name}
                field={field}
                control={form.control as Control<Record<string, unknown>>}
              >
                <FormField
                  control={form.control}
                  name={field.name as never}
                  required={field.required === true}
                  rules={field.required === true ? { required: `${field.label ?? field.name} is required` } : undefined}
                  render={({ field: controller }) => {
                    // Hidden fields don't need the FormItem wrapper - just render the input
                    if (field.type === "hidden") {
                      return renderFieldInput(field, controller as ControllerRender);
                    }

                    return (
                      <FormItem
                        className={cn("space-y-3", getFieldGridClassName(field.colSpan ?? null))}
                      >
                      {field.label && <FormLabel className="text-sm font-semibold text-foreground">{field.label}</FormLabel>}
                      <FormControl>
                        {field.type === "select" && field.quickCreate ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex-none">
                              {renderFieldInput(field, controller as ControllerRender)}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="shrink-0"
                              aria-label={field.quickCreate.label ?? `Add new ${field.label ?? "option"}`}
                              onClick={() => handleQuickCreate(field)}
                            >
                              <Plus className="size-4" aria-hidden="true" />
                              <span className="sr-only">{field.quickCreate.label ?? "Add"}</span>
                            </Button>
                          </div>
                        ) : (
                          renderFieldInput(field, controller as ControllerRender)
                        )}
                      </FormControl>
                      {(() => {
                        const helperText = typeof field.helperText === "string" ? field.helperText : "";
                        const hasHelperText = helperText.trim().length > 0;
                        const rowHasHelperText = fieldRowHelperMap.get(field.name) ?? false;
                        const shouldRenderPlaceholder = rowHasHelperText && !hasHelperText;

                        if (hasHelperText) {
                          return <FormDescription>{helperText}</FormDescription>;
                        }

                        if (shouldRenderPlaceholder) {
                          return (
                            <FormDescription aria-hidden="true" className="select-none opacity-0">
                              Placeholder helper text
                            </FormDescription>
                          );
                        }

                        return null;
                      })()}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              </ConditionalField>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
            {props.cancelAction ? <div>{renderAction(props.cancelAction, "ghost")}</div> : <span />}
            <Button type="submit" className="px-6" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
                ? "Saving..."
                : props.submitLabel ?? (props.mode === "edit" ? "Save changes" : "Submit")}
            </Button>
          </div>
        </form>
      </Form>

      {props.footnote && <p className="text-xs text-muted-foreground/80">{props.footnote}</p>}

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
  };

  return {
    ...quickCreate,
    action,
  } satisfies FormFieldQuickCreateConfig;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
