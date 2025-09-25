import type { ActionConfig } from "../shared";

export type AdminFormMode = "create" | "edit";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldQuickCreateConfig {
  label?: string | null;
  description?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  action?: ActionConfig | null;
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
    | "tags"
    | "image"
    | null;
  placeholder?: string | null;
  helperText?: string | null;
  options?: FormFieldOption[] | { items?: FormFieldOption[] } | null;
  required?: boolean | null;
  colSpan?: "full" | "half" | "third" | null;
  defaultValue?: unknown;
  lookupId?: string | null;
  quickCreate?: FormFieldQuickCreateConfig | null;
  disabled?: boolean | null;
  readOnly?: boolean | null;
}

export interface AdminFormSectionProps {
  title?: string;
  description?: string;
  fields?: FormFieldConfig[] | { items?: FormFieldConfig[] } | null;
  initialValues?: Record<string, unknown> | null;
  submitLabel?: string | null;
  cancelAction?: ActionConfig | null;
  submitAction?: ActionConfig | null;
  mode?: AdminFormMode | null;
  footnote?: string | null;
}
