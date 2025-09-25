import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileText, Layers } from "lucide-react";

import {
  MetadataRegistry,
  type ManifestEntry,
} from "@/lib/metadata/registry";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Awaitable<T> = T | Promise<T>;

interface PageParams {
  module: string;
}

interface PageProps {
  params: Awaitable<PageParams>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const moduleId = decodeURIComponent(resolvedParams.module);

  return {
    title: `${formatModuleName(moduleId)} module | StewardTrack`,
  };
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const moduleId = decodeURIComponent(resolvedParams.module);

  const registry = new MetadataRegistry();
  const manifest = await registry.readManifest();

  if (!manifest) {
    notFound();
  }

  const entries = Object.values(manifest.entries).filter(
    (entry) => entry.layer.module === moduleId,
  );

  if (entries.length === 0) {
    notFound();
  }

  const groups = groupByRoute(entries);

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <Button variant="ghost" className="px-0" asChild>
          <Link href="/admin/modules" prefetch={false} className="inline-flex items-center gap-2">
            <ArrowLeft className="size-4" />
            Back to modules
          </Link>
        </Button>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Layers className="hidden size-4 sm:block" />
            <span className="font-mono uppercase">{moduleId}</span>
          </div>
          <h1 className="text-3xl font-semibold">{formatModuleName(moduleId)}</h1>
          <p className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "layer" : "layers"} compiled for this module.
          </p>
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id} className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="hidden size-4 sm:block" />
                <span className="font-mono lowercase">{group.route}</span>
              </CardTitle>
              <CardDescription>
                {group.entries.length} {group.entries.length === 1 ? "layer" : "layers"} available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.entries.map((entry) => (
                <LayerRow key={entry.key} entry={entry} />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function groupByRoute(entries: ManifestEntry[]) {
  return Object.values(
    entries.reduce<Record<string, { id: string; route: string; entries: ManifestEntry[] }>>(
      (acc, entry) => {
        const routeId = entry.layer.route;
        const id = `${entry.layer.module}::${routeId}`;
        if (!acc[id]) {
          acc[id] = { id, route: routeId, entries: [] };
        }
        acc[id]!.entries.push(entry);
        return acc;
      },
      {},
    ),
  )
    .map((group) => ({
      ...group,
      entries: group.entries.sort((a, b) => {
        const tenantA = a.layer.tenant ?? "global";
        const tenantB = b.layer.tenant ?? "global";
        if (tenantA === tenantB) {
          if (a.kind === b.kind) {
            return (a.layer.locale ?? "").localeCompare(b.layer.locale ?? "");
          }
          return a.kind.localeCompare(b.kind);
        }
        return tenantA.localeCompare(tenantB);
      }),
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

function LayerRow({ entry }: { entry: ManifestEntry }) {
  const tenant = entry.layer.tenant ?? "global";
  const locale = entry.layer.locale ?? "default";
  const routeSegments = entry.layer.route === "home" ? [] : entry.layer.route.split("/");
  const tenantSegment = entry.layer.tenant ?? "global";
  const href = `/pages/${tenantSegment}/${entry.layer.module}${routeSegments.length ? `/${routeSegments.join("/")}` : ""}`;

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {entry.kind}
            </Badge>
            <Badge variant="outline" className="font-mono uppercase">
              {tenant}
            </Badge>
            <Badge variant="outline" className="font-mono uppercase">
              {locale}
            </Badge>
          </div>
          <p className="font-semibold text-foreground">{entry.sourcePath}</p>
          <p className="text-xs text-muted-foreground">
            Schema v{entry.schemaVersion} - Content v{entry.contentVersion}
          </p>
          {entry.dependsOn && entry.dependsOn.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Depends on: {entry.dependsOn.join(", ")}
            </p>
          ) : null}
        </div>
        <Button variant="ghost" size="icon" className="flex-none" asChild>
          <Link href={href} prefetch={false} target="_blank" rel="noreferrer noopener">
            <ArrowUpRight className="size-4" />
            <span className="sr-only">Open rendered page</span>
          </Link>
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <FileText className="size-3.5" />
        <span>{entry.compiledPath}</span>
      </div>
    </div>
  );
}

function formatModuleName(moduleId: string) {
  return moduleId
    .split(/[-_]/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
