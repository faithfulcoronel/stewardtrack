"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import type { ActionConfig } from "../shared";
import type { FormFieldOption } from "./types";
import { executeMetadataAction } from "@/lib/metadata/actions/client";
import { useMetadataClientContext } from "@/lib/metadata/context";

export interface AdminLookupQuickCreateProps {
  lookupId?: string | null;
  lookupLabel?: string | null;
  description?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  action?: ActionConfig | null;
  className?: string;
  onCancel?: () => void;
  onSuccess?: (option: FormFieldOption) => void;
}

interface FormValues {
  name: string;
  code: string;
}

export function AdminLookupQuickCreate(props: AdminLookupQuickCreateProps) {
  const lookupLabel = props.lookupLabel?.trim() || "Lookup option";
  const submitLabel = props.submitLabel?.trim() || "Save";
  const successMessage = props.successMessage?.trim() || `${lookupLabel} saved`;
  const lookupId = props.lookupId?.trim() ?? "";
  const { role } = useMetadataClientContext();

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const [codeEdited, setCodeEdited] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const nameValue = form.watch("name");

  React.useEffect(() => {
    if (!codeEdited) {
      form.setValue("code", slugify(nameValue), { shouldDirty: true });
    }
  }, [codeEdited, form, nameValue]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const trimmedName = values.name.trim();
    const trimmedCode = values.code.trim();

    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }

    if (!trimmedCode) {
      toast.error("Code is required.");
      return;
    }

    if (!lookupId) {
      toast.error("Lookup context was not provided.");
      return;
    }

    if (!props.action) {
      toast.error("The quick add action is not configured.");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await executeMetadataAction(props.action, {
        input: {
          lookupId,
          name: trimmedName,
          code: trimmedCode,
        },
        context: {
          role,
        },
      });

      const option = extractOption(result?.data) ?? {
        label: trimmedName,
        value: trimmedCode,
      };

      toast.success(successMessage);
      props.onSuccess?.(option);
      form.reset();
      setCodeEdited(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the lookup option.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className={cn("space-y-6", props.className)}>
      <DialogHeader className="space-y-2 text-left">
        <DialogTitle className="text-xl font-semibold text-foreground">Add {lookupLabel.toLowerCase()}</DialogTitle>
        {props.description && <DialogDescription>{props.description}</DialogDescription>}
      </DialogHeader>
      <Form {...form}>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <FormField
            control={form.control}
            name="name"
            rules={{ required: "Name is required" }}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={`e.g. New ${lookupLabel.toLowerCase()}`} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            rules={{ required: "Code is required" }}
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(event) => {
                      setCodeEdited(true);
                      field.onChange(event.target.value);
                    }}
                    placeholder="auto-generated"
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">Auto-generated from the name. Adjust if needed before saving.</p>
              </FormItem>
            )}
          />

          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="ghost" onClick={props.onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" className="px-5" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function extractOption(data: unknown): FormFieldOption | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const option = (data as { option?: unknown }).option;
  if (!option || typeof option !== "object") {
    return null;
  }

  const value = (option as { id?: unknown }).id;
  const label = (option as { value?: unknown }).value;

  if (typeof value !== "string" || !value) {
    return null;
  }

  return {
    value,
    label: typeof label === "string" && label.trim() ? label : value,
  } satisfies FormFieldOption;
}
