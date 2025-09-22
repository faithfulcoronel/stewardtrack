"use client";

import React from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { normalizeList, renderAction, type ActionConfig } from "../shared";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldConfig {
  name: string;
  label?: string | null;
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "select"
    | "textarea"
    | "currency"
    | "number"
    | "toggle"
    | "multiline"
    | null;
  placeholder?: string | null;
  helperText?: string | null;
  options?: FormFieldOption[] | { items?: FormFieldOption[] } | null;
  required?: boolean | null;
  colSpan?: "full" | "half" | "third" | null;
  defaultValue?: unknown;
}

export interface AdminFormSectionProps {
  title?: string;
  description?: string;
  fields?: FormFieldConfig[] | { items?: FormFieldConfig[] } | null;
  initialValues?: Record<string, unknown> | null;
  submitLabel?: string | null;
  cancelAction?: ActionConfig | null;
  submitAction?: ActionConfig | null;
  mode?: "create" | "edit" | null;
  footnote?: string | null;
}

export function AdminFormSection(props: AdminFormSectionProps) {
  const fields = React.useMemo(() => normalizeList<FormFieldConfig>(props.fields), [props.fields]);
  const defaultValues = React.useMemo(() => {
    const values: Record<string, unknown> = {};
    for (const field of fields) {
      const incoming = props.initialValues?.[field.name];
      if (incoming !== undefined) {
        values[field.name] = incoming;
        continue;
      }
      if (field.defaultValue !== undefined) {
        values[field.name] = field.defaultValue;
        continue;
      }
      values[field.name] = field.type === "toggle" ? false : "";
    }
    return values;
  }, [fields, props.initialValues]);

  const form = useForm<Record<string, unknown>>({
    defaultValues,
    mode: "onBlur",
  });

  React.useEffect(() => {
    form.reset(defaultValues);
  }, [form, defaultValues]);

  const onSubmit = React.useCallback(
    (values: Record<string, unknown>) => {
      console.info("Membership form submitted", {
        mode: props.mode ?? "create",
        values,
      });
      if (props.submitAction?.config && typeof props.submitAction.config.url === "string") {
        window.location.href = String(props.submitAction.config.url);
        return;
      }
      const message = props.mode === "edit" ? "Member record updated." : "New member record drafted.";
      alert(message);
    },
    [props.mode, props.submitAction?.config]
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
          onSubmit={form.handleSubmit(onSubmit)}
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
                      field.colSpan === "third" && "sm:col-span-2 lg:col-span-1"
                    )}
                  >
                    {field.label && <FormLabel className="text-sm font-semibold text-foreground">{field.label}</FormLabel>}
                    <FormControl>{renderFieldInput(field, controller)}</FormControl>
                    {field.helperText && <FormDescription>{field.helperText}</FormDescription>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6">
            {props.cancelAction ? <div>{renderAction(props.cancelAction, "ghost")}</div> : <span />}
            <Button type="submit" className="px-6">
              {props.submitLabel ?? (props.mode === "edit" ? "Save changes" : "Save member")}
            </Button>
          </div>
        </form>
      </Form>

      {props.footnote && <p className="text-xs text-muted-foreground/80">{props.footnote}</p>}
    </section>
  );
}

type ControllerRender = {
  value: unknown;
  onChange: (value: unknown) => void;
};

function renderFieldInput(field: FormFieldConfig, controller: ControllerRender) {
  const basePlaceholder = field.placeholder ?? "";

  switch (field.type) {
    case "textarea":
    case "multiline":
      return (
        <Textarea
          value={String(controller.value ?? "")}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
          className="min-h-[120px]"
        />
      );
    case "select": {
      const options = normalizeList<FormFieldOption>(field.options);
      return (
        <Select value={String(controller.value ?? "")} onValueChange={(value) => controller.onChange(value)}>
          <SelectTrigger>
            <SelectValue placeholder={basePlaceholder || "Choose"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case "toggle":
      return (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <Switch
            checked={Boolean(controller.value)}
            onCheckedChange={(checked) => controller.onChange(checked)}
          />
          <span className="text-sm text-muted-foreground">{basePlaceholder || "Enable"}</span>
        </div>
      );
    case "currency":
      return (
        <Input
          type="number"
          min={0}
          step="0.01"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "0.00"}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={controller.value ? String(controller.value) : ""}
          onChange={(event) => controller.onChange(event.target.value)}
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
        />
      );
    case "email":
      return (
        <Input
          type="email"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "name@example.com"}
        />
      );
    case "tel":
      return (
        <Input
          type="tel"
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder || "(000) 000-0000"}
        />
      );
    case "text":
    default:
      return (
        <Input
          value={controller.value === undefined ? "" : String(controller.value)}
          onChange={(event) => controller.onChange(event.target.value)}
          placeholder={basePlaceholder}
        />
      );
  }
}
