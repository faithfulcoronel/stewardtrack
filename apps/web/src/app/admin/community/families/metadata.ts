import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";

import { getMembershipContext } from "@/app/admin/members/context";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export async function renderFamiliesPage(route: string, searchParams: PageSearchParams) {
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
