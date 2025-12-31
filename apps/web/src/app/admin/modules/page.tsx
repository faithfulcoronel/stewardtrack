import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Layers } from "lucide-react";

import { createMetadataRegistry, type ManifestEntry } from "@/lib/metadata/registry";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Modules | StewardTrack",
};

type ModuleGroup = {
  id: string;
  module: string;
  entryCount: number;
  routeCount: number;
  sampleRoutes: string[];
};

export default async function ModulesPage() {
  const registry = createMetadataRegistry();
  const manifest = await registry.readManifest();
  const groups = manifest ? groupByModule(Object.values(manifest.entries)) : [];

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
          Automatically generated from the metadata registry manifest. Select a module to explore the pages that belong to it.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {groups.map((group) => (
          <Card key={group.id} className="flex h-full flex-col justify-between border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="hidden size-4 sm:block" />
                <span className="capitalize">{group.module}</span>
              </CardTitle>
              <CardDescription>
                {group.entryCount} {group.entryCount === 1 ? "layer" : "layers"} across {group.routeCount} {" "}
                {group.routeCount === 1 ? "route" : "routes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Featured routes</p>
                {group.sampleRoutes.length > 0 ? (
                  <ul className="space-y-1">
                    {group.sampleRoutes.map((route) => (
                      <li key={route} className="flex items-center gap-2 font-mono text-xs uppercase">
                        <FileText className="size-4" />
                        <span>{route}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs">No routes available yet.</p>
                )}
              </div>
              <Button asChild>
                <Link href={`/admin/modules/${encodeURIComponent(group.module)}`} prefetch={false}>
                  View module
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function groupByModule(entries: ManifestEntry[]): ModuleGroup[] {
  const map = new Map<string, { module: string; entryCount: number; routes: Set<string> }>();

  for (const entry of entries) {
    const id = entry.layer.module;
    if (!map.has(id)) {
      map.set(id, { module: entry.layer.module, entryCount: 0, routes: new Set<string>() });
    }

    const group = map.get(id)!;
    group.entryCount += 1;
    const route = entry.layer.route === "home" ? "home" : entry.layer.route;
    group.routes.add(route);
  }

  return Array.from(map.entries())
    .map(([id, group]) => ({
      id,
      module: group.module,
      entryCount: group.entryCount,
      routeCount: group.routes.size,
      sampleRoutes: Array.from(group.routes)
        .sort((a, b) => a.localeCompare(b))
        .slice(0, 3),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
}
