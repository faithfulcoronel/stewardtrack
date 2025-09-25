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
} from "./types";

export type { AdminFormSectionProps, FormFieldConfig, FormFieldOption } from "./types";

export function AdminFormSection(props: AdminFormSectionProps) {
  const { fields, form, handleSubmit, formErrors } = useAdminFormController(props);
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

      form.setValue(field.name as never, option.value, {
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
          className="space-y-8 rounded-3xl border border-border/60 bg-background p-6 shadow-sm"
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
              <FormField
                key={field.name}
                control={form.control}
                name={field.name as never}
                render={({ field: controller }) => (
                  <FormItem
                    className={cn(
                      "space-y-3",
                      field.colSpan === "full" && "sm:col-span-2",
                      field.colSpan === "third" && "sm:col-span-2 lg:col-span-1",
                    )}
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
                    {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
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
