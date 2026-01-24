/**
 * ================================================================================
 * CAMPAIGN PROFILE PAGE
 * ================================================================================
 *
 * Detailed view of a single campaign with analytics and recipient list.
 *
 * Uses metadata-driven rendering via XML blueprints.
 *
 * SECURITY: No permission check during testing phase.
 *
 * ================================================================================
 */

import type { Metadata } from "next";

import { renderCommunicationPage, type PageSearchParams } from "../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  params: Awaitable<{ id: string }>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Campaign Details | Communication | StewardTrack",
  description: "View campaign details and analytics",
};

export default async function CampaignProfilePage({ params, searchParams }: PageProps) {
  const { id } = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  // Pass the campaign ID to the metadata system via search params
  const paramsWithId = {
    ...resolvedSearchParams,
    campaignId: id,
  };

  const { content } = await renderCommunicationPage("campaigns/profile", paramsWithId ?? {});

  return <div className="space-y-10">{content}</div>;
}
