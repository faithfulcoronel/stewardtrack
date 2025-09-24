"use client";

import * as React from "react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { normalizeList } from "../shared";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { renderAction } from "../shared";

import { useAdminFormController } from "./useAdminFormController";
import { renderFieldInput, type ControllerRender } from "./fieldRenderers";
import type {
  AdminFormSectionProps,
  FormFieldConfig,
  FormFieldOption,
} from "./types";

export type { AdminFormSectionProps, FormFieldConfig, FormFieldOption } from "./types";

export function AdminFormSection(props: AdminFormSectionProps) {
  const { fields, form, handleSubmit } = useAdminFormController(props);
  const [quickCreateOptions, setQuickCreateOptions] = React.useState<Record<string, FormFieldOption[]>>({});

  const augmentedFields = React.useMemo(() => {
    return fields.map((field) => {
      const additional = quickCreateOptions[field.name] ?? [];
      if (!additional.length || field.type !== "select") {
        return field;
      }
      const baseOptions = normalizeList<FormFieldOption>(field.options);
      const merged = [...baseOptions];
      for (const option of additional) {
        if (!merged.some((item) => item.value === option.value)) {
          merged.push(option);
        }
      }
      return {
        ...field,
        options: merged,
      } satisfies FormFieldConfig;
    });
  }, [fields, quickCreateOptions]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleLookupCreated = (event: MessageEvent) => {
      const allowedOrigins = new Set([window.location.origin, "null"]);
      if (!allowedOrigins.has(event.origin)) {
        return;
      }
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "lookup:create") {
        return;
      }
      const payload = (data as { payload?: unknown }).payload;
      if (!payload || typeof payload !== "object") {
        return;
      }
      const lookupId = (payload as { lookupId?: unknown }).lookupId;
      const option = (payload as { option?: unknown }).option;
      if (typeof lookupId !== "string" || !lookupId) {
        return;
      }
      if (!option || typeof option !== "object") {
        return;
      }
      const optionId = (option as { id?: unknown }).id;
      const optionValue = (option as { value?: unknown }).value;
      if (typeof optionId !== "string" || typeof optionValue !== "string") {
        return;
      }

      const targetField = fields.find((field) => field.lookupId === lookupId);
      if (!targetField) {
        return;
      }

      setQuickCreateOptions((previous) => {
        const existingForField = previous[targetField.name] ?? [];
        const baseOptions = normalizeList<FormFieldOption>(targetField.options);
        const exists =
          baseOptions.some((item) => item.value === optionId) ||
          existingForField.some((item) => item.value === optionId);
        if (exists) {
          return previous;
        }
        return {
          ...previous,
          [targetField.name]: [...existingForField, { label: optionValue, value: optionId }],
        } satisfies Record<string, FormFieldOption[]>;
      });

      form.setValue(targetField.name as never, optionId, {
        shouldDirty: true,
        shouldValidate: true,
      });

      const successMessage = targetField.quickCreate?.successMessage;
      toast.success(successMessage ?? `${optionValue} added`);
    };

    window.addEventListener("message", handleLookupCreated);
    return () => window.removeEventListener("message", handleLookupCreated);
  }, [fields, form]);

  const handleQuickCreate = React.useCallback(
    (field: FormFieldConfig) => {
      if (typeof window === "undefined") {
        return;
      }
      const config = field.quickCreate;
      const popupUrl = config?.popupUrl;
      if (!popupUrl) {
        toast.error("Unable to open quick add window.");
        return;
      }
      const width = Math.max(Number(config?.width ?? 480), 320);
      const height = Math.max(Number(config?.height ?? 520), 360);
      const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
      const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
      window.open(
        popupUrl,
        `lookup-create-${field.lookupId ?? field.name}`,
        `width=${Math.round(width)},height=${Math.round(height)},left=${Math.round(left)},top=${Math.round(top)},resizable=yes`
      );
    },
    []
  );

  return (
    <section className="space-y-6">
      {(props.title || props.description) && (
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
                        <div className="flex items-center gap-2">
                          <div className="grow">{renderFieldInput(field, controller as ControllerRender)}</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
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
    </section>
  );
}
