import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readTenantSession, writeTenantSession } from "@/lib/tenant/session-cache";
import { resolveTenantForUser } from "@/lib/tenant/tenant-resolver";

export interface MembershipContext {
  role: string;
  tenant: string | null;
  locale: string;
  featureFlags: Record<string, boolean>;
}

export async function getMembershipContext(): Promise<MembershipContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const role = (user?.app_metadata?.role as string | undefined) ?? "admin";
  let tenant = (user?.app_metadata?.tenant as string | undefined)?.trim() ?? null;
  const locale = (user?.user_metadata?.locale as string | undefined) ?? "en-US";
  const featureFlags =
    (user?.app_metadata?.featureFlags as Record<string, boolean> | undefined) ?? ({} as Record<string, boolean>);

  const currentSessionId = (session?.access_token as string | undefined) ?? null;
  const cachedTenant = await readTenantSession();

  const cachedTenantMatchesSession =
    cachedTenant.tenant &&
    (!cachedTenant.sessionId || !currentSessionId || cachedTenant.sessionId === currentSessionId);

  if (!tenant && cachedTenantMatchesSession) {
    tenant = cachedTenant.tenant?.trim() ?? null;
  }

  if (!tenant) {
    try {
      const { data: tenantData, error: tenantError } = await supabase.rpc("get_current_tenant");

      if (tenantError) {
        throw tenantError;
      }

      const tenantRecord = Array.isArray(tenantData) ? tenantData[0] : tenantData;
      const resolvedTenant = (tenantRecord as { id?: string } | null)?.id ?? null;
      tenant = typeof resolvedTenant === "string" ? resolvedTenant.trim() : null;

      if (tenant && currentSessionId) {
        await writeTenantSession(tenant, currentSessionId);
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to resolve tenant for membership metadata context", error);
      }
    }
  }

  if (!tenant) {
    const { tenant: assignmentTenant, error: assignmentError } = await resolveTenantForUser(
      supabase,
      user?.id ?? null
    );

    tenant = assignmentTenant;

    if (!tenant && assignmentError && process.env.NODE_ENV !== "test") {
      console.error("Failed to resolve tenant from assignments for membership context", assignmentError);
    }

    if (tenant && currentSessionId) {
      await writeTenantSession(tenant, currentSessionId);
    }
  }

  if (!tenant) {
    throw new Error("Failed to determine tenant for membership metadata context");
  }

  return { role, tenant, locale, featureFlags };
}
