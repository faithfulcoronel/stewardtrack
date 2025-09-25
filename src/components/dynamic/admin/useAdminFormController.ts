"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

import { normalizeList } from "../shared";
import { executeMetadataAction } from "@/lib/metadata/actions/execute";
import { useMetadataClientContext } from "@/lib/metadata/context";
import { toast } from "sonner";

import type { AdminFormSectionProps, FormFieldConfig } from "./types";
import { AdminFormSubmitHandler, type MetadataActionExecutor, type NavigationService, type NotificationService } from "./submit/AdminFormSubmitHandler";

function isTagsField(field: FormFieldConfig): boolean {
  return field.type === "tags" || field.name === "tags";
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item ?? "")))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }
  if (value === null || value === undefined) {
    return [];
  }
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeImage(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "object") {
    const candidate = (value as { url?: unknown }).url;
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      return trimmed.length > 0 ? trimmed : null;
    }
  }
  return null;
}

export function useAdminFormController(props: AdminFormSectionProps) {
  const fields = React.useMemo(() => normalizeList<FormFieldConfig>(props.fields), [props.fields]);
  const defaultValues = React.useMemo(
    () => buildDefaultValues(fields, props.initialValues ?? {}),
    [fields, props.initialValues],
  );

  const metadataContext = useMetadataClientContext();

  const form = useForm<Record<string, unknown>>({
    defaultValues,
    mode: "onBlur",
  });

  const [formErrors, setFormErrors] = React.useState<string[]>([]);

  React.useEffect(() => {
    form.reset(defaultValues);
    form.clearErrors();
    setFormErrors([]);
  }, [form, defaultValues]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const contextParams = React.useMemo(() => buildContextParams(searchParams), [searchParams]);

  const navigator = React.useMemo<NavigationService>(
    () => ({
      push: (url: string) => router.push(url),
    }),
    [router],
  );

  const notifier = React.useMemo<NotificationService>(
    () => ({
      success: (message: string) => toast.success(message),
      error: (message: string) => toast.error(message),
    }),
    [],
  );

  const metadataExecutor = React.useMemo<MetadataActionExecutor>(() => executeMetadataAction, []);

  const submitHandler = React.useMemo(
    () =>
      new AdminFormSubmitHandler({
        form,
        action: props.submitAction ?? null,
        mode: props.mode ?? null,
        metadataExecutor,
        notifier,
        navigator,
        contextParams,
        role: metadataContext.role ?? null,
        onFormErrors: setFormErrors,
      }),
    [
      form,
      props.submitAction,
      props.mode,
      metadataExecutor,
      notifier,
      navigator,
      contextParams,
      metadataContext.role,
    ],
  );

  const handleSubmit = React.useMemo(
    () =>
      form.handleSubmit(async (values) => {
        await submitHandler.handleSubmit(values);
      }),
    [form, submitHandler],
  );

  return {
    fields,
    form,
    handleSubmit,
    formErrors,
  };
}

function buildDefaultValues(
  fields: FormFieldConfig[],
  initialValues: Record<string, unknown>,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const incoming = initialValues[field.name];
    if (incoming !== undefined) {
      if (isTagsField(field)) {
        values[field.name] = normalizeTags(incoming);
      } else if (field.type === "image") {
        values[field.name] = normalizeImage(incoming);
      } else {
        values[field.name] = incoming;
      }
      continue;
    }
    if (field.defaultValue !== undefined) {
      if (isTagsField(field)) {
        values[field.name] = normalizeTags(field.defaultValue);
      } else if (field.type === "image") {
        values[field.name] = normalizeImage(field.defaultValue);
      } else {
        values[field.name] = field.defaultValue;
      }
      continue;
    }
    if (isTagsField(field)) {
      values[field.name] = [];
      continue;
    }
    if (field.type === "image") {
      values[field.name] = null;
      continue;
    }
    values[field.name] = field.type === "toggle" ? false : "";
  }

  return values;
}

function buildContextParams(
  params: URLSearchParams | ReadonlyURLSearchParams | null | undefined,
): Record<string, string | string[]> {
  if (!params) {
    return {};
  }

  const result: Record<string, string | string[]> = {};
  params.forEach((value, key) => {
    if (result[key] === undefined) {
      result[key] = value;
      return;
    }
    const current = result[key];
    if (Array.isArray(current)) {
      current.push(value);
    } else {
      result[key] = [current, value];
    }
  });
  return result;
}
