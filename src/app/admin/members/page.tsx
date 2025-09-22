import type { Metadata } from "next";

import { renderMembershipPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Membership dashboard | StewardTrack",
};

export default async function MembershipDashboardPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderMembershipPage("members/dashboard", resolvedSearchParams ?? {});

  return <div className="space-y-10">{content}</div>;
}
