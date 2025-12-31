import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";

import { getAdminSettingsContext } from "./context";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export async function renderAdminSettingsPage(route: string, searchParams: PageSearchParams) {
  const context = await getAdminSettingsContext();

  const resolved = await resolvePageMetadata({
    module: "admin-settings",
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
