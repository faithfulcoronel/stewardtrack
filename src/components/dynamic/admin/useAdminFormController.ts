"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams, type ReadonlyURLSearchParams } from "next/navigation";

import { normalizeList } from "../shared";
import { executeMetadataAction } from "@/lib/metadata/actions/client";
import { toast } from "sonner";

import type { AdminFormSectionProps, FormFieldConfig } from "./types";
import { AdminFormSubmitHandler, type MetadataActionExecutor, type NavigationService, type NotificationService } from "./submit/AdminFormSubmitHandler";

export function useAdminFormController(props: AdminFormSectionProps) {
  const fields = React.useMemo(() => normalizeList<FormFieldConfig>(props.fields), [props.fields]);
  const defaultValues = React.useMemo(
    () => buildDefaultValues(fields, props.initialValues ?? {}),
    [fields, props.initialValues],
  );

  const form = useForm<Record<string, unknown>>({
    defaultValues,
    mode: "onBlur",
  });

  React.useEffect(() => {
    form.reset(defaultValues);
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
        action: props.submitAction ?? null,
        mode: props.mode ?? null,
        metadataExecutor,
        notifier,
        navigator,
        contextParams,
      }),
    [props.submitAction, props.mode, metadataExecutor, notifier, navigator, contextParams],
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
