import type { ActionConfig } from "../shared";

export type AdminFormMode = "create" | "edit";

export interface FormFieldOption {
  label: string;
  value: string;
  description?: string;
}

export interface FormFieldQuickCreateConfig {
  label?: string | null;
  description?: string | null;
  submitLabel?: string | null;
  successMessage?: string | null;
  action?: ActionConfig | null;
}

/** Condition for conditional field visibility based on another field's value */
export interface FieldVisibilityCondition {
  /** The field name to watch */
  field: string;
  /** The value(s) that make this field visible */
  equals?: unknown;
  /** Show when the watched field is truthy */
  isTruthy?: boolean;
  /** Show when the watched field is falsy */
  isFalsy?: boolean;
}

/** Configuration for displaying a reason when a field is disabled */
export interface FieldDisabledReason {
  /** Message explaining why the field is disabled */
  message: string;
  /** Optional link to resolve the disabled state */
  link?: {
    href: string;
    label: string;
  } | null;
}

export interface FormFieldConfig {
  name: string;
  label?: string | null;
  type?:
    | "text"
    | "email"
    | "tel"
    | "date"
    | "datetime"
    | "select"
    | "combobox"
    | "textarea"
    | "richtext"
    | "currency"
    | "number"
    | "toggle"
    | "multiline"
    | "tags"
    | "image"
    | "hidden"
    | "color"
    | "icon"
    | "time"
    | "datetime-range"
    | "recurrence"
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
  /** Reason why the field is disabled - shown in tooltip */
  disabledReason?: FieldDisabledReason | null;
  readOnly?: boolean | null;
  /** Auto-generate this field's value as a slug from another field (e.g., 'name') */
  deriveSlugFrom?: string | null;
  /** Placeholder for combobox search input */
  searchPlaceholder?: string | null;
  /** Message shown when no results found in combobox */
  emptyMessage?: string | null;
  /** Conditional visibility - show field only when condition is met */
  visibleWhen?: FieldVisibilityCondition | null;
}

export interface AdminFormSectionProps {
  title?: string;
  description?: string;
  hideHeader?: boolean | null;
  fields?: FormFieldConfig[] | { items?: FormFieldConfig[] } | null;
  initialValues?: Record<string, unknown> | null;
  submitLabel?: string | null;
  cancelAction?: ActionConfig | null;
  submitAction?: ActionConfig | null;
  mode?: AdminFormMode | null;
  footnote?: string | null;
  contextParams?: Record<string, string | string[]> | null;
}
