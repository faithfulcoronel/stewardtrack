import type {
  CanonicalAction,
  CanonicalComponent,
  CanonicalDataSource,
  PropValue,
} from "./generated/canonical";
import { resolveServiceDataSourceHandler } from "./services";

export interface MetadataEvaluationContext {
  role?: string | null;
  roles?: string[] | null; // Support for multiple roles
  permissions?: string[] | null; // User's permission codes for granular access control
  featureFlags?: Record<string, boolean> | null | undefined;
  searchParams?: Record<string, string | string[] | undefined>;
  // License context (added in Phase 2)
  licenseFeatures?: string[] | null; // Active license features for tenant
  licensedSurfaces?: string[] | null; // Surfaces available under license
  licenseTier?: string | null; // Current license tier (e.g., 'basic', 'professional', 'enterprise')
}

export interface DataScope {
  [key: string]: unknown;
}

export interface ActionScope {
  [key: string]: CanonicalAction & { config: Record<string, unknown> };
}

interface ExpressionScope {
  data: DataScope;
  flags: Record<string, boolean>;
  params: Record<string, string | string[] | undefined>;
  role: string;
  roles: string[];
  permissions: string[]; // User's permission codes for granular access control
  actions: ActionScope;
  // License context for expressions
  licenseFeatures: string[];
  licensedSurfaces: string[];
  licenseTier: string;
}

type ExpressionEvaluator = (scope: ExpressionScope) => unknown;

const expressionCache = new Map<string, ExpressionEvaluator>();

export async function evaluateMetadataDataSources(
  sources: CanonicalDataSource[],
  context: MetadataEvaluationContext,
): Promise<DataScope> {
  const role = context.role ?? "guest";
  const roles = context.roles ?? [role];
  const permissions = context.permissions ?? [];
  const params = context.searchParams ?? {};
  const results: DataScope = {};

  for (const source of sources) {
    if (!isPermittedWithRoles(source.rbac, role, roles, permissions)) {
      continue;
    }

    const config = normalizeRecord(source.config ?? {});

    if (source.kind === "static") {
      results[source.id] = config.value ?? null;
      continue;
    }

    if (source.kind === "http") {
      const url = typeof config.url === "string" ? config.url : "";
      if (!url) {
        continue;
      }
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (response.ok) {
          results[source.id] = await response.json();
        }
      } catch (error) {
        console.error(`Failed to fetch HTTP data source ${source.id}`, toError(error));
      }
      continue;
    }

    if (source.kind === "supabase") {
      console.warn(`Supabase data source ${source.id} not evaluated in this environment.`);
      continue;
    }

    if (source.kind === "service") {
      const handlerId = typeof config.handler === "string" ? config.handler : "";
      if (!handlerId) {
        console.warn(`Service data source ${source.id} is missing a handler identifier.`);
        if (config.value !== undefined) {
          results[source.id] = config.value;
        }
        continue;
      }

      const handler = resolveServiceDataSourceHandler(handlerId);
      if (!handler) {
        console.warn(`No handler registered for service data source ${source.id} (${handlerId}).`);
        if (config.value !== undefined) {
          results[source.id] = config.value;
        }
        continue;
      }

      try {
        const resolved = await handler({
          id: source.id,
          role,
          config,
          params,
        });
        if (resolved !== undefined) {
          results[source.id] = resolved;
        } else if (config.value !== undefined) {
          results[source.id] = config.value;
        }
      } catch (error) {
        console.error(`Failed to evaluate service data source ${source.id}`, toError(error));
        if (config.value !== undefined) {
          results[source.id] = config.value;
        }
      }
      continue;
    }
  }

  return results;
}

export function evaluateMetadataActions(
  actions: CanonicalAction[],
  role: string,
  roles?: string[],
  permissions?: string[],
  params?: Record<string, string | string[] | undefined>,
): ActionScope {
  const effectiveRoles = roles ?? [role];
  const effectivePermissions = permissions ?? [];
  return actions.reduce<ActionScope>((acc, action) => {
    if (!isPermittedWithRoles(action.rbac, role, effectiveRoles, effectivePermissions)) {
      return acc;
    }
    const config = normalizeRecord(action.config ?? {});

    // Interpolate template variables in URL if present
    if (typeof config.url === 'string' && params) {
      config.url = interpolateTemplate(config.url, params);
    }

    acc[action.id] = { ...action, config };
    return acc;
  }, {});
}

/**
 * Interpolate template variables like {{params.householdId}} in a string
 */
function interpolateTemplate(template: string, params: Record<string, string | string[] | undefined>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, expression) => {
    const trimmed = expression.trim();

    // Handle params.* expressions
    if (trimmed.startsWith('params.')) {
      const paramKey = trimmed.substring(7); // Remove 'params.' prefix
      const value = params[paramKey];

      if (value === undefined || value === null) {
        console.warn(`Template variable ${expression} not found in params`);
        return match; // Return original if not found
      }

      // If array, use first value
      return Array.isArray(value) ? value[0] ?? match : String(value);
    }

    // If not a params expression, return original
    return match;
  });
}

export function evaluateMetadataProps(
  props: Record<string, PropValue>,
  dataScope: DataScope,
  actions: ActionScope,
  context: MetadataEvaluationContext,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    result[key] = evaluateMetadataProp(value, dataScope, actions, context);
  }
  return result;
}

export function evaluateMetadataProp(
  prop: PropValue,
  dataScope: DataScope,
  actions: ActionScope,
  context: MetadataEvaluationContext,
): unknown {
  const role = context.role ?? "guest";
  const roles = context.roles ?? [role];
  const permissions = context.permissions ?? [];
  const licenseFeatures = context.licenseFeatures ?? [];
  const licensedSurfaces = context.licensedSurfaces ?? [];
  const licenseTier = context.licenseTier ?? "basic";

  switch (prop.kind) {
    case "static":
      return prop.value;
    case "binding": {
      const source = dataScope[prop.source];
      const resolved = resolvePath(source, prop.path);
      return resolved ?? prop.fallback ?? null;
    }
    case "expression": {
      const scope: ExpressionScope = {
        data: dataScope,
        flags: context.featureFlags ?? {},
        params: context.searchParams ?? {},
        role,
        roles,
        permissions,
        actions,
        licenseFeatures,
        licensedSurfaces,
        licenseTier,
      };
      try {
        return evaluateExpression(prop.expression, scope);
      } catch (error) {
        console.error(`Failed to evaluate expression ${prop.expression}`, toError(error));
        return prop.fallback ?? null;
      }
    }
    case "action":
      return actions[prop.actionId] ?? null;
    default:
      return null;
  }
}

function evaluateExpression(expression: string, scope: ExpressionScope): unknown {
  const evaluator = getExpressionEvaluator(expression);
  return evaluator(scope);
}

function getExpressionEvaluator(expression: string): ExpressionEvaluator {
  let evaluator = expressionCache.get(expression);
  if (!evaluator) {
    evaluator = compileExpression(expression);
    expressionCache.set(expression, evaluator);
  }
  return evaluator;
}

function compileExpression(expression: string): ExpressionEvaluator {
  try {
    const compiled = new Function(
      "data",
      "flags",
      "params",
      "role",
      "roles",
      "actions",
      "licenseFeatures",
      "licensedSurfaces",
      "licenseTier",
      `"use strict"; return (${expression});`,
    ) as (
      data: DataScope,
      flags: Record<string, boolean>,
      params: Record<string, string | string[] | undefined>,
      role: string,
      roles: string[],
      actions: ActionScope,
      licenseFeatures: string[],
      licensedSurfaces: string[],
      licenseTier: string,
    ) => unknown;

    return (scope) => compiled(
      scope.data,
      scope.flags,
      scope.params,
      scope.role,
      scope.roles,
      scope.actions,
      scope.licenseFeatures,
      scope.licensedSurfaces,
      scope.licenseTier
    );
  } catch (error) {
    const err = toError(error);
    console.error(`Failed to compile expression ${expression}`, err);
    return () => {
      throw err;
    };
  }
}

export function resolvePath(source: unknown, pathExpression?: string | null): unknown {
  if (!pathExpression || pathExpression === "$") {
    return source;
  }
  const cleaned = pathExpression.replace(/^\$\.?/, "");
  if (!cleaned) {
    return source;
  }
  const segments = cleaned.split(".");
  let current: unknown = source;
  for (const segment of segments) {
    if (!isObjectRecord(current)) {
      return null;
    }
    current = current[segment];
  }
  return current;
}

function normalizeRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(record).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const normalizedKey = camelCase(key);
    acc[normalizedKey] = value;
    return acc;
  }, {});
}

function camelCase(value: string): string {
  return value
    .replace(/[-_\s]+(.)?/g, (_, chr) => (chr ? chr.toUpperCase() : ""))
    .replace(/^(.)/, (match) => match.toLowerCase());
}

export function isPermitted(
  rbac:
    | CanonicalAction["rbac"]
    | CanonicalComponent["rbac"]
    | CanonicalDataSource["rbac"],
  role: string,
): boolean {
  if (!rbac) {
    return true;
  }
  if (rbac.deny?.includes(role)) {
    return false;
  }
  if (rbac.allow && !rbac.allow.includes(role)) {
    return false;
  }
  return true;
}

export function isPermittedWithRoles(
  rbac:
    | CanonicalAction["rbac"]
    | CanonicalComponent["rbac"]
    | CanonicalDataSource["rbac"],
  primaryRole: string,
  roles: string[],
  permissions?: string[],
): boolean {
  if (!rbac) {
    return true;
  }

  // Check if any role is explicitly denied
  if (rbac.deny) {
    for (const role of roles) {
      if (rbac.deny.includes(role)) {
        return false;
      }
    }
  }

  // If allow list is specified, at least one role must be in it
  if (rbac.allow && rbac.allow.length > 0) {
    let hasAllowedRole = false;
    for (const role of roles) {
      if (rbac.allow.includes(role)) {
        hasAllowedRole = true;
        break;
      }
    }
    if (!hasAllowedRole) {
      return false;
    }
  }

  // Check permission requirements if specified
  if (rbac.requirePermissions && permissions) {
    const requiredPerms = rbac.requirePermissions.split(',').map((p: string) => p.trim());
    // User must have at least one of the required permissions
    const hasRequiredPermission = requiredPerms.some((reqPerm: string) =>
      permissions.includes(reqPerm)
    );
    if (!hasRequiredPermission) {
      return false;
    }
  }

  return true;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Check if user has access to a feature based on license
 *
 * @param featureCode - The feature code from metadata
 * @param context - Evaluation context with license features
 * @returns true if user has access, false otherwise
 */
export function hasFeatureAccess(
  featureCode: string | null | undefined,
  context: MetadataEvaluationContext,
): boolean {
  // No feature code means public/unrestricted access
  if (!featureCode) {
    return true;
  }

  // Core foundation features are always accessible
  if (featureCode === 'core-foundation') {
    return true;
  }

  // Check if tenant has the required feature
  const licenseFeatures = context.licenseFeatures ?? [];
  return licenseFeatures.includes(featureCode);
}
