"use client";

import * as React from "react";

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { renderAction } from "../shared";

import { useAdminFormController } from "./useAdminFormController";
import { renderFieldInput, type ControllerRender } from "./fieldRenderers";
import type { AdminFormSectionProps } from "./types";

export type { AdminFormSectionProps, FormFieldConfig, FormFieldOption } from "./types";

export function AdminFormSection(props: AdminFormSectionProps) {
  const { fields, form, handleSubmit } = useAdminFormController(props);

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
            {fields.map((field) => (
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
                    <FormControl>{renderFieldInput(field, controller as ControllerRender)}</FormControl>
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
