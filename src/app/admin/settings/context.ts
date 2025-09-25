import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readTenantSession, writeTenantSession } from "@/lib/tenant/session-cache";

export interface AdminSettingsContext {
  role: string;
  tenant: string | null;
  locale: string;
  featureFlags: Record<string, boolean>;
}

export async function getAdminSettingsContext(): Promise<AdminSettingsContext> {
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

  if (!tenant && cachedTenant.sessionId && cachedTenant.sessionId === currentSessionId) {
    tenant = cachedTenant.tenant;
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
        console.error("Failed to resolve tenant for admin settings metadata context", error);
      }
    }
  }

  if (!tenant) {
    throw new Error("Failed to determine tenant for admin settings metadata context");
  }

  return { role, tenant, locale, featureFlags };
}
