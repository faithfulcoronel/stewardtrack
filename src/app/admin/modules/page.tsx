import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, FileText, Layers } from "lucide-react";

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

export const metadata: Metadata = {
  title: "Modules | Flowspace",
};

type ManifestGroup = {
  id: string;
  module: string;
  route: string;
  entries: ManifestEntry[];
};

export default async function ModulesPage() {
  const registry = new MetadataRegistry();
  const manifest = await registry.readManifest();
  const groups = manifest ? groupByRoute(Object.values(manifest.entries)) : [];

  if (!manifest || groups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">Metadata modules</h1>
          <p className="text-sm text-muted-foreground">
            No metadata entries were found in the registry manifest. Run the metadata compiler to populate this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Metadata modules</h1>
        <p className="text-sm text-muted-foreground">
          Automatically generated from the metadata registry manifest. Click any layer to open its public rendering.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id} className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="hidden size-4 sm:block" />
                <span className="capitalize">{group.module}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-mono text-sm lowercase">{group.route}</span>
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

function groupByRoute(entries: ManifestEntry[]): ManifestGroup[] {
  const map = new Map<string, ManifestGroup>();

  for (const entry of entries) {
    const id = `${entry.layer.module}::${entry.layer.route}`;
    if (!map.has(id)) {
      map.set(id, {
        id,
        module: entry.layer.module,
        route: entry.layer.route,
        entries: [],
      });
    }
    map.get(id)!.entries.push(entry);
  }

  return Array.from(map.values())
    .sort((a, b) => {
      if (a.module === b.module) {
        return a.route.localeCompare(b.route);
      }
      return a.module.localeCompare(b.module);
    })
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
    }));
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

