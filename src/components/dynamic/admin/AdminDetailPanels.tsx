import Link from "next/link";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { normalizeList } from "../shared";

export interface DetailItem {
  label: string;
  value?: string | number | null;
  type?: "text" | "badge" | "link" | "chips" | "multiline" | "currency" | null;
  href?: string | null;
  icon?: string | null;
  variant?: string | null;
  description?: string | null;
  items?: string[] | null;
}

export interface DetailPanel {
  id?: string | null;
  title: string;
  description?: string | null;
  items?: DetailItem[] | { items?: DetailItem[] } | null;
  badge?: string | null;
  columns?: number | null;
}

export interface AdminDetailPanelsProps {
  panels?: DetailPanel[] | { items?: DetailPanel[] } | null;
  columns?: number | null;
}

const badgeTone: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  info: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

export function AdminDetailPanels(props: AdminDetailPanelsProps) {
  const panels = normalizeList<DetailPanel>(props.panels);
  const columns = props.columns ?? (panels.length >= 3 ? 3 : 2);

  return (
    <section className="space-y-6">
      <div
        className={cn(
          "grid gap-4",
          columns <= 1 ? "grid-cols-1" : undefined,
          columns === 2 ? "md:grid-cols-2" : undefined,
          columns >= 3 ? "lg:grid-cols-3" : undefined
        )}
      >
        {panels.map((panel) => (
          <Card key={panel.id ?? panel.title} className="border-border/60">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-foreground">{panel.title}</CardTitle>
                {panel.badge && (
                  <Badge variant="outline" className="border-border/60 text-xs uppercase tracking-widest text-muted-foreground">
                    {panel.badge}
                  </Badge>
                )}
              </div>
              {panel.description && <p className="text-sm text-muted-foreground">{panel.description}</p>}
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 text-sm">
                {normalizeList<DetailItem>(panel.items).map((item) => (
                  <div key={`${panel.id ?? panel.title}-${item.label}`} className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      <span className="flex items-center gap-2">
                        {item.icon && <span aria-hidden>{item.icon}</span>}
                        <span>{item.label}</span>
                      </span>
                    </dt>
                    <dd className="text-foreground">
                      {renderValue(item)}
                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function renderValue(item: DetailItem) {
  const tone = item.variant ?? "neutral";
  switch (item.type) {
    case "badge":
      return (
        <Badge variant="outline" className={cn("border", badgeTone[tone] ?? badgeTone.neutral)}>
          {String(item.value ?? "")}
        </Badge>
      );
    case "link":
      if (!item.href) {
        return <span>{String(item.value ?? "")}</span>;
      }
      return (
        <Link href={item.href} className="font-medium text-primary hover:underline" prefetch={false}>
          {String(item.value ?? item.href)}
        </Link>
      );
    case "chips":
      return (
        <div className="flex flex-wrap gap-2">
          {(item.items ?? []).map((chip, index) => (
            <Badge key={`${chip}-${index}`} variant="outline" className="border-border/60 text-xs">
              {chip}
            </Badge>
          ))}
        </div>
      );
    case "multiline":
      return (
        <div className="whitespace-pre-line text-sm text-muted-foreground">
          {String(item.value ?? "")}
        </div>
      );
    case "currency": {
      const amount = Number(item.value ?? 0);
      if (Number.isNaN(amount)) {
        return <span>{String(item.value ?? "")}</span>;
      }
      return (
        <span className="font-medium">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: amount >= 1000 ? 0 : 2,
          }).format(amount)}
        </span>
      );
    }
    default:
      return <span>{String(item.value ?? "")}</span>;
  }
}
