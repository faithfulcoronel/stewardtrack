import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";

import { getSuperAdminSettingsContext } from "./context";

export type PageSearchParams = Record<string, string | string[] | undefined>;

export async function renderSuperAdminSettingsPage(route: string, searchParams: PageSearchParams) {
  const context = await getSuperAdminSettingsContext();

  const resolved = await resolvePageMetadata({
    module: "super-admin-settings",
    route,
    tenant: null, // Super admin settings are tenant-agnostic
    role: context.role,
    locale: context.locale,
    featureFlags: context.featureFlags,
  });

  const content = await renderResolvedPage(resolved, {
    role: context.role,
    tenant: null,
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
          tenant: null,
          locale: context.locale,
          featureFlags: context.featureFlags,
        },
      },
      content,
    ),
  };
}
