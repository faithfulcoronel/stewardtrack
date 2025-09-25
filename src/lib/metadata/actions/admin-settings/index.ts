import type { MetadataActionExecution, MetadataActionResult } from "../types";

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === "string" ? entry : String(entry ?? "")))
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function toOptionalString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function buildSuccessMessage(config: Record<string, unknown>, mode: string | null): string {
  const explicit = toOptionalString(config.successMessage);
  if (explicit) {
    return explicit;
  }

  const createMessage = toOptionalString(config.createMessage);
  const updateMessage = toOptionalString(config.updateMessage);

  switch (mode) {
    case "create":
      return createMessage ?? updateMessage ?? "Settings saved.";
    case "edit":
      return updateMessage ?? createMessage ?? "Settings updated.";
    default:
      return updateMessage ?? createMessage ?? "Settings saved.";
  }
}

function buildRedirectUrl(template: string | null, context: Record<string, unknown>): string | null {
  if (!template) {
    return null;
  }

  let missing = false;
  const rendered = template.replace(/{{\s*([^}]+?)\s*}}/g, (_, expression: string) => {
    const value = resolvePath(context, expression.trim());
    if (value === undefined || value === null) {
      missing = true;
      return "";
    }
    const asString = String(value);
    if (!asString) {
      missing = true;
    }
    return asString;
  });

  if (missing) {
    return null;
  }

  return rendered;
}

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  const segments = path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function normalizeSettingsPayload(input: unknown): {
  mode: string | null;
  tenantId: string | null;
  values: Record<string, unknown>;
} {
  if (!input || typeof input !== "object") {
    return { mode: null, tenantId: null, values: {} };
  }

  const payload = input as Record<string, unknown>;
  const mode = toOptionalString(payload.mode) ?? null;
  const tenantId = toOptionalString(payload.tenantId) ?? null;
  const values =
    payload.values && typeof payload.values === "object" && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : {};

  return { mode, tenantId, values };
}

function validateSettings(values: Record<string, unknown>): {
  valid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  const ministryName = toOptionalString(values.ministryName);
  if (!ministryName) {
    errors.ministryName = ["Enter the ministry or organization name."];
  }

  const contactEmail = toOptionalString(values.contactEmail);
  if (!contactEmail) {
    errors.contactEmail = ["Provide a best contact email so notifications reach your team."];
  }

  const timeZone = toOptionalString(values.timeZone);
  if (!timeZone) {
    errors.timeZone = ["Choose the primary time zone for your ministry."];
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function normalizeFeatureToggles(value: unknown): string[] {
  const toggles = toStringArray(value);
  if (toggles.length) {
    return toggles;
  }
  return ["online-check-in", "care-plan-workflows", "sabbath-mode"];
}

async function handleSaveAdminSettings(execution: MetadataActionExecution): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = normalizeSettingsPayload(execution.input);
  const validation = validateSettings(payload.values);

  if (!validation.valid) {
    return {
      success: false,
      status: 422,
      message: "Settings could not be saved. Review the highlighted fields.",
      errors: { fieldErrors: validation.errors },
    } satisfies MetadataActionResult;
  }

  const toggles = normalizeFeatureToggles(payload.values.featureFlags);
  const tenantId = payload.tenantId ?? toOptionalString(execution.context.params.tenant) ?? "demo-tenant";

  const context: Record<string, unknown> = {
    tenantId,
    params: execution.context.params,
    data: payload.values,
  };

  const redirectTemplate =
    toOptionalString(config.redirectUrl) ?? toOptionalString(config.redirectTemplate) ?? null;
  const redirectUrl = buildRedirectUrl(redirectTemplate, context);

  const message = buildSuccessMessage(config, payload.mode);

  return {
    success: true,
    status: 200,
    message,
    redirectUrl,
    data: {
      tenantId,
      updatedAt: new Date().toISOString(),
      featureFlags: toggles,
    },
  } satisfies MetadataActionResult;
}

export const adminSettingsActionHandlers: Record<string, (execution: MetadataActionExecution) => Promise<MetadataActionResult>> = {
  "admin-settings.settings.overview.save": handleSaveAdminSettings,
};
