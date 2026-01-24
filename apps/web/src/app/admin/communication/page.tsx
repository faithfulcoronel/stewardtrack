/**
 * ================================================================================
 * COMMUNICATION DASHBOARD PAGE
 * ================================================================================
 *
 * Central hub for church communication activities including campaigns,
 * templates, and messaging analytics.
 *
 * Uses metadata-driven rendering via XML blueprints.
 *
 * SECURITY: No permission check during testing phase.
 *
 * ================================================================================
 */

import type { Metadata } from "next";

import { renderCommunicationPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Communication Dashboard | StewardTrack",
  description: "Central hub for church communication, campaigns, and messaging",
};

export default async function CommunicationDashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderCommunicationPage("dashboard", resolvedSearchParams ?? {});

  return <div className="space-y-10">{content}</div>;
}
