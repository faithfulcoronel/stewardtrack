import type { MetadataActionHandler } from '../types';
import type { MetadataActionExecution, MetadataActionResult } from '../types';
import { adminCommunityCarePlansHandlers } from '@/lib/metadata/services/admin-community-careplans';

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizeCarePlanPayload(input: unknown): {
  mode: string | null;
  carePlanId: string | null;
  values: Record<string, unknown>;
} {
  if (!input || typeof input !== 'object') {
    return { mode: null, carePlanId: null, values: {} };
  }

  const payload = input as Record<string, unknown>;
  const mode = toOptionalString(payload.mode) ?? null;
  const carePlanId = toOptionalString(payload.carePlanId) ?? null;
  const values =
    payload.values && typeof payload.values === 'object' && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : {};

  return { mode, carePlanId, values };
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
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

/**
 * Handle care plan save action
 * Wraps the service handler to provide proper action execution context
 */
async function handleSaveCarePlan(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const serviceHandler = adminCommunityCarePlansHandlers['admin-community.careplans.manage.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.careplans.manage.save');
  }

  const payload = normalizeCarePlanPayload(execution.input);
  const config = (execution.config ?? {}) as Record<string, unknown>;

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

    // Add carePlanId from payload if present
    if (payload.carePlanId) {
      params.carePlanId = payload.carePlanId;
    }

    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.careplans.manage.save',
      role: execution.context.role ?? 'guest',
      config: config,
      params,
    });

    const serviceResult = serviceResultRaw as {
      success?: boolean;
      carePlanId?: string;
      redirect?: string;
      message?: string;
    };

    const carePlanId = serviceResult.carePlanId ??
      toOptionalString(execution.context.params?.carePlanId as unknown) ??
      '';

    const context: Record<string, unknown> = {
      carePlanId,
      params: execution.context.params,
      data: payload.values,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      toOptionalString(serviceResult.redirect) ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: 'Care plan saved successfully',
      redirectUrl,
      data: {
        carePlanId,
        id: carePlanId,
        updatedAt: new Date().toISOString(),
      },
    } satisfies MetadataActionResult;
  } catch (error) {
    console.error('Failed to save care plan via service handler:', error);
    return {
      success: false,
      status: 500,
      message: error instanceof Error ? error.message : 'Failed to save care plan. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}

export const carePlansActionHandlers: Record<string, MetadataActionHandler> = {
  'admin-community.careplans.manage.save': handleSaveCarePlan,
};
