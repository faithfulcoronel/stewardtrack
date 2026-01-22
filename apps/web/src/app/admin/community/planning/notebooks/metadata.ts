/**
 * ================================================================================
 * NOTEBOOKS METADATA RENDERER
 * ================================================================================
 *
 * This file provides the metadata rendering function for Notebooks pages.
 * It serves as the bridge between Next.js page components and the metadata system.
 *
 * METADATA ARCHITECTURE FLOW:
 *   1. Page component calls renderNotebooksPage(route, searchParams)
 *   2. This function resolves the XML blueprint from the registry
 *   3. Applies overlays based on tenant/role/locale context
 *   4. Renders the resolved metadata as React components
 *   5. Wraps content in MetadataClientProvider for context access
 *
 * USAGE IN PAGE COMPONENTS:
 *   import { renderNotebooksPage } from "../metadata";
 *
 *   const { content } = await renderNotebooksPage("planning/notebooks", searchParams);
 *   return <div>{content}</div>;
 *
 * ROUTE PARAMETER:
 *   The route corresponds to the XML blueprint file path under admin-community module:
 *   - "planning/notebooks"           -> planning-notebooks.xml
 *   - "planning/notebooks/detail"    -> planning-notebooks-detail.xml
 *
 * SEARCH PARAMS:
 *   URL search params are passed to service handlers via request.params.
 *   Common params include:
 *   - notebookId: For detail/edit pages
 *   - filter: For filtering (mine, shared)
 *   - pageId: For page detail views
 *
 * ================================================================================
 */

import React from "react";

import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";
import { MetadataClientProvider } from "@/lib/metadata/context";

import { getMembershipContext } from "@/app/admin/members/context";

export type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * Renders a notebooks page from XML metadata.
 *
 * @param route - The page route (e.g., "planning/notebooks")
 * @param searchParams - URL search parameters to pass to handlers
 * @returns Object containing rendered React content
 */
export async function renderNotebooksPage(route: string, searchParams: PageSearchParams) {
  // Get current user context (tenant, role, feature flags)
  const context = await getMembershipContext();

  // Resolve the XML blueprint with overlays applied
  const resolved = await resolvePageMetadata({
    module: "admin-community",
    route,
    tenant: context.tenant,
    role: context.role,
    locale: context.locale,
    featureFlags: context.featureFlags,
  });

  // Render the resolved metadata as React components
  const content = await renderResolvedPage(resolved, {
    role: context.role,
    tenant: context.tenant,
    locale: context.locale,
    featureFlags: context.featureFlags,
    searchParams,
  });

  // Wrap in provider for client-side context access
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
