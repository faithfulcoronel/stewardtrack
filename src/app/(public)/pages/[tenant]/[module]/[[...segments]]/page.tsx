import type { Metadata } from "next";
import { resolvePageMetadata } from "@/lib/metadata/resolver";
import { renderResolvedPage } from "@/lib/metadata/interpreter";

export const revalidate = 120;

interface PageParams {
  tenant: string;
  module: string;
  segments?: string[];
}

type Awaitable<T> = T | Promise<T>;
type PageSearchParams = Record<string, string | string[] | undefined>;

interface PageProps {
  params: Awaitable<PageParams>;
  searchParams: Awaitable<PageSearchParams>;
}

export const metadata: Metadata = {
  title: "Dynamic experience",
};

export default async function DynamicExperiencePage({ params, searchParams }: PageProps) {
  const [resolvedParams, resolvedSearchParams] = await Promise.all([
    Promise.resolve(params),
    Promise.resolve(searchParams),
  ]);

  const tenant = resolvedParams.tenant === "global" ? null : resolvedParams.tenant;
  const routeSegments = resolvedParams.segments ?? [];
  const route = routeSegments.length > 0 ? routeSegments.join("/") : "home";
  const role = getSingle(resolvedSearchParams.role) ?? "guest";
  const variant = getSingle(resolvedSearchParams.variant) ?? null;
  const locale = getSingle(resolvedSearchParams.locale) ?? "en-US";
  const featureFlags = extractFlags(resolvedSearchParams);

  const resolved = await resolvePageMetadata({
    module: resolvedParams.module,
    route,
    tenant,
    role,
    variant,
    locale,
    featureFlags,
  });

  const content = await renderResolvedPage(resolved, {
    role,
    tenant,
    locale,
    featureFlags,
    searchParams: resolvedSearchParams,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 sm:px-12">
      {content}
    </main>
  );
}

function getSingle(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.at(-1);
  }
  return value;
}

function extractFlags(searchParams: PageSearchParams) {
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (!key.startsWith("ff_")) {
      continue;
    }
    const normalized = key.slice(3);
    const raw = getSingle(value) ?? "";
    flags[normalized] = raw === "true" || raw === "1" || raw === "enabled";
  }
  return flags;
}
