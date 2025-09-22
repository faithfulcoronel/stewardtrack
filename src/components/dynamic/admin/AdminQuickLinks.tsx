import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { normalizeList, renderAction, type ActionConfig } from "../shared";

export interface QuickLinkItem {
  id?: string | null;
  title: string;
  description?: string | null;
  href?: string | null;
  badge?: string | null;
  icon?: string | null;
  stat?: string | null;
  footnote?: string | null;
  action?: ActionConfig | null;
}

export interface AdminQuickLinksProps {
  title?: string;
  description?: string;
  links?: QuickLinkItem[] | { items?: QuickLinkItem[] } | null;
  columns?: number | null;
  actions?: ActionConfig[] | { items?: ActionConfig[] } | null;
}

export function AdminQuickLinks(props: AdminQuickLinksProps) {
  const links = normalizeList<QuickLinkItem>(props.links);
  const actions = normalizeList<ActionConfig>(props.actions);
  const columns = props.columns ?? (links.length >= 3 ? 3 : 2);

  return (
    <section className="space-y-6">
      {(props.title || props.description || actions.length > 0) && (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            {props.title && <h2 className="text-xl font-semibold text-foreground">{props.title}</h2>}
            {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-3">{actions.map((action) => renderAction(action, "secondary"))}</div>
          )}
        </header>
      )}
      <div
        className={cn(
          "grid gap-4",
          columns <= 1 ? "grid-cols-1" : undefined,
          columns === 2 ? "md:grid-cols-2" : undefined,
          columns >= 3 ? "lg:grid-cols-3" : undefined,
          columns >= 4 ? "xl:grid-cols-4" : undefined
        )}
      >
        {links.map((link) => {
          const content = (
            <Card
              key={link.id ?? link.title}
              className="relative group flex h-full flex-col justify-between border-border/60 transition hover:border-primary/50 hover:shadow-md"
            >
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    <span className="flex items-center gap-2">
                      {link.icon && <span aria-hidden>{link.icon}</span>}
                      <span>{link.title}</span>
                    </span>
                  </CardTitle>
                  {link.badge && (
                    <Badge variant="outline" className="border-border/60 text-xs uppercase tracking-wide">
                      {link.badge}
                    </Badge>
                  )}
                </div>
                {link.description && <p className="text-sm text-muted-foreground">{link.description}</p>}
              </CardHeader>
              {(link.stat || link.footnote) && (
                <CardContent className="flex flex-col gap-2">
                  {link.stat && <p className="text-sm font-medium text-primary">{link.stat}</p>}
                  {link.footnote && <p className="text-xs text-muted-foreground/80">{link.footnote}</p>}
                </CardContent>
              )}
              {link.action && (
                <CardContent className="border-t border-border/60 bg-muted/40 py-4">
                  <div className="flex justify-end">{renderAction(link.action, "ghost")}</div>
                </CardContent>
              )}
            </Card>
          );

          if (!link.href) {
            return content;
          }

          return (
            <Link
              key={link.id ?? link.title}
              href={link.href}
              className="group block h-full"
              prefetch={false}
            >
              {content}
              <span className="sr-only">Open {link.title}</span>
              <ArrowUpRight className="pointer-events-none absolute right-4 top-4 text-primary opacity-0 transition group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
