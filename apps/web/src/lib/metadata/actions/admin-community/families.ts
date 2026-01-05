import type { MetadataActionExecution, MetadataActionResult } from '../types';
import { adminCommunityFamiliesHandlers } from '@/lib/metadata/services/admin-community-families';

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizeFamilyPayload(input: unknown): {
  mode: string | null;
  familyId: string | null;
  tenantId: string | null;
  values: Record<string, unknown>;
} {
  if (!input || typeof input !== 'object') {
    return { mode: null, familyId: null, tenantId: null, values: {} };
  }

  const payload = input as Record<string, unknown>;
  const mode = toOptionalString(payload.mode) ?? null;
  const familyId = toOptionalString(payload.familyId) ?? null;
  const tenantId = toOptionalString(payload.tenantId) ?? null;
  const values =
    payload.values && typeof payload.values === 'object' && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : {};

  return { mode, familyId, tenantId, values };
}

function validateFamily(values: Record<string, unknown>): {
  valid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};

  const name = toOptionalString(values.name);
  if (!name) {
    errors.name = ['Family name is required.'];
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function buildRedirectUrl(template: string | null, context: Record<string, unknown>): string | null {
  if (!template) {
    return null;
  }

  let missing = false;
  const rendered = template.replace(/{{\s*([^}]+?)\s*}}/g, (_, expression: string) => {
    const path = expression.trim();
    const value = resolvePath(context, path);
    if (value === undefined || value === null) {
      missing = true;
      return '';
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
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function buildSuccessMessage(config: Record<string, unknown>, mode: string | null): string {
  const explicit = toOptionalString(config.successMessage);
  if (explicit) {
    return explicit;
  }

  const createMessage = toOptionalString(config.createMessage);
  const updateMessage = toOptionalString(config.updateMessage);

  switch (mode) {
    case 'create':
      return createMessage ?? updateMessage ?? 'Family saved.';
    case 'edit':
      return updateMessage ?? createMessage ?? 'Family updated.';
    default:
      return updateMessage ?? createMessage ?? 'Family saved.';
  }
}

async function handleQuickCreateFamily(execution: MetadataActionExecution): Promise<MetadataActionResult> {
  const input = execution.input as { name?: string } | null;
  const name = toOptionalString(input?.name);

  if (!name) {
    return {
      success: false,
      status: 422,
      message: 'Family name is required.',
      errors: { fieldErrors: { name: ['Family name is required.'] } },
    } satisfies MetadataActionResult;
  }

  // Call the actual service handler
  const serviceHandler = adminCommunityFamiliesHandlers['admin-community.families.quickCreate'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.families.quickCreate');
  }

  try {
    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.families.quickCreate',
      role: execution.context.role ?? 'guest',
      config: {},
      params: { name },
    });

    const serviceResult = serviceResultRaw as {
      success?: boolean;
      message?: string;
      family?: { id: string; name: string } | null;
    };

    if (!serviceResult.success || !serviceResult.family) {
      return {
        success: false,
        status: 400,
        message: serviceResult.message ?? 'Failed to create family.',
        errors: {},
      } satisfies MetadataActionResult;
    }

    return {
      success: true,
      status: 200,
      message: serviceResult.message ?? `Family "${name}" created successfully.`,
      data: {
        family: serviceResult.family,
      },
    } satisfies MetadataActionResult;
  } catch (error) {
    console.error('Failed to quick create family via service handler:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to create family. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}

async function handleSaveFamily(execution: MetadataActionExecution): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = normalizeFamilyPayload(execution.input);
  const validation = validateFamily(payload.values);

  if (!validation.valid) {
    return {
      success: false,
      status: 422,
      message: 'Family could not be saved. Review the highlighted fields.',
      errors: { fieldErrors: validation.errors },
    } satisfies MetadataActionResult;
  }

  // Call the actual service handler
  const serviceHandler = adminCommunityFamiliesHandlers['admin-community.families.manage.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.families.manage.save');
  }

  try {
    // Convert values to match ServiceDataSourceRequest params type
    const params: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of Object.entries(payload.values)) {
      if (typeof value === 'string') {
        params[key] = value;
      } else if (Array.isArray(value)) {
        params[key] = value.map(v => String(v));
      } else if (value !== null && value !== undefined) {
        params[key] = String(value);
      } else {
        params[key] = undefined;
      }
    }

    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.families.manage.save',
      role: execution.context.role ?? 'guest',
      config: config,
      params,
    });

    const serviceResult = serviceResultRaw as { familyId?: string; success?: boolean; message?: string };
    const familyId = serviceResult.familyId ?? toOptionalString(execution.context.params.familyId) ?? '';

    const context: Record<string, unknown> = {
      familyId,
      tenantId: payload.tenantId,
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
        familyId,
        updatedAt: new Date().toISOString(),
      },
    } satisfies MetadataActionResult;
  } catch (error) {
    console.error('Failed to save family via service handler:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save family. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}

export const familiesActionHandlers: Record<
  string,
  (execution: MetadataActionExecution) => Promise<MetadataActionResult>
> = {
  'admin-community.families.manage.save': handleSaveFamily,
  'admin-community.families.quickCreate': handleQuickCreateFamily,
};
