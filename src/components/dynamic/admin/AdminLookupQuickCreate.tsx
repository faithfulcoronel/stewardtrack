"use client";

import * as React from "react";
import { useForm } from "react-hook-form";

import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AdminLookupQuickCreateProps {
  lookupId?: string | null;
  lookupLabel?: string | null;
  description?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  className?: string;
}

interface FormValues {
  name: string;
  code: string;
}

export function AdminLookupQuickCreate(props: AdminLookupQuickCreateProps) {
  const lookupLabel = props.lookupLabel?.trim() || "Lookup option";
  const submitLabel = props.submitLabel?.trim() || "Save";
  const successMessage = props.successMessage?.trim() || `${lookupLabel} saved`;

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      code: "",
    },
  });

  const [codeEdited, setCodeEdited] = React.useState(false);
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

    const payload = {
      lookupId: props.lookupId ?? "",
      option: {
        id: trimmedCode,
        value: trimmedName,
      },
    };

    const hasOpener = typeof window !== "undefined" && window.opener;

    if (hasOpener) {
      window.opener?.postMessage({ type: "lookup:create", payload }, window.location.origin);
      toast.success(successMessage);
      window.close();
      return;
    }

    toast.success(`${successMessage}. Keep this tab open to copy the new code.`);
  });

  return (
    <Card className={cn("mx-auto w-full max-w-xl rounded-3xl border border-border/50 bg-background/95 shadow-lg", props.className)}>
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg font-semibold text-foreground">{lookupLabel}</CardTitle>
        {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
      </CardHeader>
      <Form {...form}>
        <form className="space-y-0" onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              rules={{ required: "Name is required" }}
              render={({ field }) => (
                <FormItem>
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
                <FormItem>
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
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="submit" className="px-5">
              {submitLabel}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
