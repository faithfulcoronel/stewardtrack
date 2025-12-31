/**
 * ================================================================================
 * DISCIPLESHIP PLAN SAVE ACTION HANDLER
 * ================================================================================
 *
 * This action handler wraps the service handler for saving discipleship plans.
 * It converts the action execution context to a service request format.
 *
 * HANDLER ID: admin-community.discipleship.manage.save
 *
 * INPUT FORMAT:
 *   {
 *     mode: 'create' | 'edit',
 *     discipleshipPlanId?: string,
 *     values: {
 *       memberId: string,
 *       pathway: string,
 *       nextStep?: string,
 *       mentorName?: string,
 *       smallGroup?: string,
 *       targetDate?: string,
 *       status?: string,
 *       notes?: string,
 *     }
 *   }
 *
 * OUTPUT FORMAT (success):
 *   {
 *     success: true,
 *     status: 200,
 *     message: 'Discipleship plan saved successfully',
 *     redirectUrl: '/admin/community/discipleship-plans/{id}',
 *     data: { discipleshipPlanId, id, updatedAt }
 *   }
 *
 * ================================================================================
 */

import type { MetadataActionHandler } from '../../types';
import type { MetadataActionExecution, MetadataActionResult } from '../../types';
import { adminCommunityDiscipleshipHandlers } from '@/lib/metadata/services/admin-community-discipleship';

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function normalizeDiscipleshipPlanPayload(input: unknown): {
  mode: string | null;
  discipleshipPlanId: string | null;
  values: Record<string, unknown>;
} {
  if (!input || typeof input !== 'object') {
    return { mode: null, discipleshipPlanId: null, values: {} };
  }

  const payload = input as Record<string, unknown>;
  const mode = toOptionalString(payload.mode) ?? null;
  const discipleshipPlanId = toOptionalString(payload.discipleshipPlanId) ?? null;
  const values =
    payload.values && typeof payload.values === 'object' && !Array.isArray(payload.values)
      ? (payload.values as Record<string, unknown>)
      : {};

  return { mode, discipleshipPlanId, values };
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
 * Handle discipleship plan save action
 * Wraps the service handler to provide proper action execution context
 */
export async function handleSaveDiscipleshipPlan(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const serviceHandler = adminCommunityDiscipleshipHandlers['admin-community.discipleship.manage.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-community.discipleship.manage.save');
  }

  const payload = normalizeDiscipleshipPlanPayload(execution.input);
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

    // Add discipleshipPlanId from payload if present
    if (payload.discipleshipPlanId) {
      params.discipleshipPlanId = payload.discipleshipPlanId;
    }

    const serviceResultRaw = await serviceHandler({
      id: 'admin-community.discipleship.manage.save',
      role: execution.context.role ?? 'guest',
      config: config,
      params,
    });

    const serviceResult = serviceResultRaw as {
      success?: boolean;
      discipleshipPlanId?: string;
      redirect?: string;
      message?: string;
    };

    const discipleshipPlanId = serviceResult.discipleshipPlanId ??
      toOptionalString(execution.context.params?.discipleshipPlanId as unknown) ??
      '';

    const context: Record<string, unknown> = {
      discipleshipPlanId,
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
      message: 'Discipleship plan saved successfully',
      redirectUrl,
      data: {
        discipleshipPlanId,
        id: discipleshipPlanId,
        updatedAt: new Date().toISOString(),
      },
    } satisfies MetadataActionResult;
  } catch (error) {
    console.error('Failed to save discipleship plan via service handler:', error);
    return {
      success: false,
      status: 500,
      message: error instanceof Error ? error.message : 'Failed to save discipleship plan. Please try again.',
      errors: {},
    } satisfies MetadataActionResult;
  }
}
