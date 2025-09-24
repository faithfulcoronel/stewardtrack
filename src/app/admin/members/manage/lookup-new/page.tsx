import type { Metadata } from "next";

import { renderMembershipPage, type PageSearchParams } from "../../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Quick add lookup | StewardTrack",
};

export default async function LookupQuickCreatePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderMembershipPage("members/manage/lookup-new", resolvedSearchParams ?? {});

  return <div className="min-h-screen bg-muted/30 px-6 py-10">{content}</div>;
}
