import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Megaphone } from "lucide-react";
import { promises as fs } from "fs";
import path from "path";

import {
  MetadataRegistry,
  type ManifestEntry,
  type ManifestFile,
} from "@/lib/metadata/registry";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "CTA sections | Flowspace",
};

const ROOT = process.cwd();

interface CtaSample {
  key: string;
  name: string;
  title: string;
  route: string;
  href: string;
  schemaVersion: string;
  contentVersion: string;
  sourcePath: string;
  variant: string;
}

export default async function CtaSectionsPage() {
  const registry = new MetadataRegistry();
  const manifest = await registry.readManifest();

  if (!manifest) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">CTA sections</h1>
          <p className="text-sm text-muted-foreground">
            The metadata registry manifest is empty. Run the metadata compiler to populate CTA samples.
          </p>
        </div>
      </div>
    );
  }

  const samples = await collectCtaSamples(manifest);

  if (samples.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">CTA sections</h1>
          <p className="text-sm text-muted-foreground">
            No CTA blueprints were discovered under the ui-blocks module. Add XML definitions and recompile metadata to see them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">CTA sections</h1>
        <p className="text-sm text-muted-foreground">
          Explore reusable CTA blueprints defined entirely in XML. Click a card to open the rendered page in a new tab.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {samples.map((sample) => (
          <Card key={sample.key} className="border-border/60">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Megaphone className="size-4 text-primary" />
                {sample.name}
              </CardTitle>
              <CardDescription>{sample.title}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Content v{sample.contentVersion}</Badge>
                <Badge variant="outline" className="font-mono uppercase">
                  Schema v{sample.schemaVersion}
                </Badge>
                <Badge variant="outline" className="font-mono lowercase">{sample.route}</Badge>
                <Badge variant="outline" className="capitalize">
                  Variant: {formatVariantLabel(sample.variant)}
                </Badge>
              </div>
              <p className="font-mono text-xs text-muted-foreground">{sample.sourcePath}</p>
            </CardContent>
            <CardFooter className="justify-end">
              <Button variant="ghost" asChild>
                <Link href={sample.href} target="_blank" rel="noreferrer noopener" className="flex items-center gap-2">
                  Preview CTA
                  <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

async function collectCtaSamples(manifest: ManifestFile): Promise<CtaSample[]> {
  const ctaEntries = Object.values(manifest.entries)
    .filter(
      (entry) =>
        entry.kind === "blueprint" &&
        entry.layer.module === "ui-blocks" &&
        entry.layer.route.startsWith("cta/") &&
        (entry.layer.tenant === null || entry.layer.tenant === undefined)
    )
    .sort((a, b) => a.layer.route.localeCompare(b.layer.route));

  const samples: CtaSample[] = [];

  for (const entry of ctaEntries) {
    const details = await readCtaDetails(entry);
    const fallbackName = formatRouteLabel(entry.layer.route);
    samples.push({
      key: entry.key,
      name: fallbackName,
      title: details.title ?? `UI Block CTA - ${fallbackName}`,
      variant: details.variant ?? "split",
      route: entry.layer.route,
      href: buildPreviewHref(entry),
      schemaVersion: entry.schemaVersion,
      contentVersion: entry.contentVersion,
      sourcePath: entry.sourcePath,
    });
  }

  return samples;
}

async function readCtaDetails(entry: ManifestEntry): Promise<{ title: string | null; variant: string | null }> {
  const absolute = path.join(ROOT, entry.compiledPath);
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = JSON.parse(raw) as {
      page?: {
        title?: string;
        regions?: Array<{
          components?: Array<{
            props?: Record<string, { value?: unknown }>;
          }>;
        }>;
      };
    };
    const component = parsed.page?.regions?.[0]?.components?.[0];
    const rawVariant = component?.props?.variant?.value;
    return {
      title: parsed.page?.title ?? null,
      variant: typeof rawVariant === "string" ? rawVariant : null,
    };
  } catch (error) {
    console.error(`Failed to read compiled metadata for ${entry.compiledPath}`, error);
    return { title: null, variant: null };
  }
}

function formatRouteLabel(route: string): string {
  const segments = route.split("/");
  const last = segments.at(-1) ?? route;
  return formatVariantLabel(last);
}

function formatVariantLabel(value: string): string {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function buildPreviewHref(entry: ManifestEntry): string {
  const tenantSegment = entry.layer.tenant ?? "global";
  const routeSegments = entry.layer.route === "home" ? [] : entry.layer.route.split("/");
  const moduleSegment = entry.layer.module;
  const suffix = routeSegments.length ? `/${routeSegments.join("/")}` : "";
  return `/pages/${tenantSegment}/${moduleSegment}${suffix}`;
}
