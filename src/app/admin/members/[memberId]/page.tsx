import type { Metadata } from "next";

import { renderMembershipPage, type PageSearchParams } from "../metadata";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  memberId: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Member profile | StewardTrack",
};

export default async function MemberProfilePage({ params, searchParams }: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    Promise.resolve(params),
    Promise.resolve(searchParams),
  ]);

  const aggregatedSearchParams: PageSearchParams = {
    ...resolvedSearchParams,
    memberId: resolvedParams.memberId,
  };

  const { content } = await renderMembershipPage("members/profile", aggregatedSearchParams);

  return <div className="space-y-10">{content}</div>;
}
