"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Church,
  DollarSign,
  FileText,
  FolderOpen,
  Heart,
  MessageSquare,
  Settings,
  Shield,
  Target,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { normalizeList, renderAction, type ActionConfig } from "../shared";

/**
 * Map icon name strings to Lucide icon components.
 * Add more icons as needed.
 */
const iconMap: Record<string, LucideIcon> = {
  FolderOpen,
  BarChart3,
  Calendar,
  Users,
  DollarSign,
  MessageSquare,
  Settings,
  Shield,
  FileText,
  Heart,
  BookOpen,
  Bell,
  Church,
  Target,
  Zap,
  // Lowercase aliases for flexibility
  folderopen: FolderOpen,
  barchart3: BarChart3,
  calendar: Calendar,
  users: Users,
  "dollar-sign": DollarSign,
  "message-square": MessageSquare,
  settings: Settings,
  shield: Shield,
  "file-text": FileText,
  heart: Heart,
  book: BookOpen,
  bell: Bell,
  church: Church,
  target: Target,
  zap: Zap,
};

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
    <section className="space-y-5 sm:space-y-6">
      {(props.title || props.description || actions.length > 0) && (
        <header className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            {props.title && (
              <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-primary" />
                {props.title}
              </h2>
            )}
            {props.description && (
              <p className="text-sm text-muted-foreground pl-3">{props.description}</p>
            )}
          </div>
          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {actions.map((action) => renderAction(action, "secondary"))}
            </div>
          )}
        </header>
      )}

      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          columns <= 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 sm:grid-cols-2",
          columns >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
          columns >= 4 && "xl:grid-cols-4"
        )}
      >
        {links.map((link, index) => {
          const Icon = link.icon ? iconMap[link.icon] : null;

          const cardContent = (
            <Card
              className={cn(
                "group relative flex h-full flex-col justify-between overflow-hidden",
                "border-border/40 bg-card/50 backdrop-blur-sm",
                "transition-all duration-300",
                "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
                "active:scale-[0.99]"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-bl-full" />

              <CardHeader className="relative space-y-3 pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base font-semibold text-foreground">
                    <span className="flex items-center gap-2.5">
                      {Icon && (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                      <span className="group-hover:text-primary transition-colors">{link.title}</span>
                    </span>
                  </CardTitle>

                  {link.badge && (
                    <Badge
                      variant="outline"
                      className="border-border/40 bg-muted/50 text-[10px] sm:text-xs uppercase tracking-wide font-medium shrink-0"
                    >
                      {link.badge}
                    </Badge>
                  )}
                </div>

                {link.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {link.description}
                  </p>
                )}
              </CardHeader>

              {(link.stat || link.footnote) && (
                <CardContent className="relative flex flex-col gap-1.5 pt-0 pb-4">
                  {link.stat && (
                    <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" />
                      {link.stat}
                    </p>
                  )}
                  {link.footnote && (
                    <p className="text-xs text-muted-foreground/70">{link.footnote}</p>
                  )}
                </CardContent>
              )}

              {link.action && (
                <CardContent className="relative border-t border-border/40 bg-muted/30 py-3 mt-auto">
                  <div className="flex justify-end">
                    {renderAction(link.action, "ghost")}
                  </div>
                </CardContent>
              )}

              {/* Arrow indicator for linked cards */}
              {link.href && (
                <ArrowUpRight
                  className="absolute right-3 top-3 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              )}
            </Card>
          );

          if (!link.href) {
            return <div key={link.id ?? link.title}>{cardContent}</div>;
          }

          return (
            <Link
              key={link.id ?? link.title}
              href={link.href}
              className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl"
              prefetch={false}
            >
              {cardContent}
              <span className="sr-only">Open {link.title}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
