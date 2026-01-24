/**
 * ================================================================================
 * CAMPAIGNS LIST PAGE
 * ================================================================================
 *
 * List all communication campaigns with filtering, sorting, and actions.
 *
 * Uses metadata-driven rendering via XML blueprints.
 *
 * SECURITY: No permission check during testing phase.
 *
 * ================================================================================
 */

import type { Metadata } from "next";

import { renderCommunicationPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Campaigns | Communication | StewardTrack",
  description: "Manage your communication campaigns",
};

export default async function CampaignsListPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderCommunicationPage("campaigns", resolvedSearchParams ?? {});

  return <div className="space-y-10">{content}</div>;
}
