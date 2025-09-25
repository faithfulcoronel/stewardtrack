import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readTenantSession } from "@/lib/tenant/session-cache";

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
      const { data, error } = await supabase.rpc("get_current_tenant");
      if (error) {
        throw error;
      }

      const tenantRecord = Array.isArray(data) ? data[0] : data;
      const resolvedTenant = (tenantRecord as { id?: string } | null)?.id ?? null;
      const normalizedTenant = typeof resolvedTenant === "string" ? resolvedTenant.trim() : null;
      tenant = normalizedTenant || tenant;
    } catch (error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Failed to determine tenant for metadata context", error);
      }
    }
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
