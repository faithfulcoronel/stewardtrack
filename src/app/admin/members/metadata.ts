import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readTenantSession, writeTenantSession } from "@/lib/tenant/session-cache";

export type PageSearchParams = Record<string, string | string[] | undefined>;

interface MembershipContext {
  role: string;
  tenant: string | null;
  locale: string;
  featureFlags: Record<string, boolean>;
}

async function getMembershipContext(): Promise<MembershipContext> {
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
        console.error("Failed to resolve tenant for membership metadata context", error);
      }
    }
  }

  if (!tenant) {
    throw new Error("Failed to determine tenant for membership metadata context");
  }
  return { role, tenant, locale, featureFlags };
}

export async function renderMembershipPage(route: string, searchParams: PageSearchParams) {
  const context = await getMembershipContext();

  const resolved = await resolvePageMetadata({
    module: "admin-community",
    route,
    tenant: context.tenant,
    role: context.role,
    locale: context.locale,
    featureFlags: context.featureFlags,
  });

  const content = await renderResolvedPage(resolved, {
    role: context.role,
    tenant: context.tenant,
    locale: context.locale,
    featureFlags: context.featureFlags,
    searchParams,
  });

  return {
    content: React.createElement(
      MetadataClientProvider,
      {
        value: {
          role: context.role,
          tenant: context.tenant,
          locale: context.locale,
          featureFlags: context.featureFlags,
        },
      },
      content,
    ),
  };
}
