import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  const role = (user?.app_metadata?.role as string | undefined) ?? "admin";
  const tenant = (user?.app_metadata?.tenant as string | undefined) ?? null;
  const locale = (user?.user_metadata?.locale as string | undefined) ?? "en-US";
  const featureFlags =
    (user?.app_metadata?.featureFlags as Record<string, boolean> | undefined) ?? ({} as Record<string, boolean>);

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
