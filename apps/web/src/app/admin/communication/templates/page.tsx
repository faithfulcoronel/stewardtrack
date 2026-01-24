/**
 * ================================================================================
 * TEMPLATES LIST PAGE
 * ================================================================================
 *
 * Manage reusable message templates for communication campaigns.
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
  title: "Message Templates | Communication | StewardTrack",
  description: "Manage reusable message templates",
};

export default async function TemplatesListPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderCommunicationPage("templates", resolvedSearchParams ?? {});

  return <div className="space-y-10">{content}</div>;
}
