import type { Metadata } from "next";

import { renderMembershipPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Manage member | StewardTrack",
};

export default async function ManageMemberPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderMembershipPage("members/manage", resolvedSearchParams ?? {});

  return <div className="space-y-10">{content}</div>;
}
