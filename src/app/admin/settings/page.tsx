import type { Metadata } from "next";

import { renderAdminSettingsPage, type PageSearchParams } from "./metadata";

type Awaitable<T> = T | Promise<T>;

interface PageProps {
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Admin settings | StewardTrack",
};

export default async function AdminSettingsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await Promise.resolve(searchParams);
  const { content } = await renderAdminSettingsPage("settings/overview", resolvedSearchParams ?? {});

  return <div className="mx-auto w-full max-w-6xl space-y-10 px-4 pb-16 pt-6 sm:px-6 lg:px-8">{content}</div>;
}
