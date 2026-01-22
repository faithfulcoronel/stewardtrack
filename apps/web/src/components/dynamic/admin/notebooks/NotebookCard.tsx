"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { normalizeList } from "../../shared";

export type NotebookVisibility = "private" | "shared" | "tenant";
export type NotebookStatus = "active" | "archived" | "deleted";

export interface NotebookCardData {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  visibility: NotebookVisibility;
  status: NotebookStatus;
  is_pinned?: boolean;
  section_count?: number;
  page_count?: number;
  tags?: string[];
  href: string;
  last_updated?: string;
  owner_name?: string;
}

export interface NotebookCardProps {
  /** Single notebook data */
  notebook?: NotebookCardData | null;
  /** Notebooks array for list mode */
  notebooks?: NotebookCardData[] | { items?: NotebookCardData[] } | null;
  /** Card layout */
  layout?: "grid" | "list";
  /** Number of columns (for grid layout) */
  columns?: number;
  /** Show visibility indicator */
  showVisibility?: boolean;
  /** Show section/page metrics */
  showMetrics?: boolean;
  /** Base URL for notebook links */
  baseUrl?: string;
  /** Additional CSS classes */
  className?: string;
}

const visibilityConfig: Record<NotebookVisibility, { label: string; icon: string; className: string }> = {
  private: {
    label: "Private",
    icon: "🔒",
    className: "bg-muted/50 text-muted-foreground border-muted-foreground/30",
  },
  shared: {
    label: "Shared",
    icon: "🤝",
    className: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  },
  tenant: {
    label: "Tenant-wide",
    icon: "🌐",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
};

function SingleNotebookCard({
  notebook,
  showVisibility = true,
  showMetrics = true,
  className,
}: Omit<NotebookCardProps, "notebooks"> & { notebook: NotebookCardData }) {
  const visibilityInfo = visibilityConfig[notebook.visibility] || visibilityConfig.private;
  const notebookColor = notebook.color || "#4F46E5";
  const notebookIcon = notebook.icon || "📚";

  return (
    <Link href={notebook.href}>
      <Card
        className={cn(
          "group relative overflow-hidden border-border/60",
          "transition-all duration-200",
          "hover:border-border hover:shadow-md cursor-pointer",
          "active:scale-[0.98]",
          notebook.is_pinned && "border-amber-500/40 bg-amber-500/5",
          className
        )}
      >
        {/* Color indicator */}
        <div
          className="absolute left-0 top-0 h-full w-1"
          style={{ backgroundColor: notebookColor }}
        />

        <CardHeader className="space-y-3 pl-4">
          {/* Top row: Icon + Pinned/Visibility badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{notebookIcon}</span>
              {notebook.is_pinned && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs"
                >
                  📌 Pinned
                </Badge>
              )}
            </div>
            {showVisibility && (
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", visibilityInfo.className)}
              >
                {visibilityInfo.icon} {visibilityInfo.label}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div className="space-y-1">
            <h3 className="font-semibold text-lg leading-none tracking-tight group-hover:text-primary transition-colors">
              {notebook.title}
            </h3>
            {notebook.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {notebook.description}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Metrics */}
          {showMetrics && (
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <span>📁</span>
                <span>{notebook.section_count ?? 0} sections</span>
              </div>
              <div className="flex items-center gap-1">
                <span>📄</span>
                <span>{notebook.page_count ?? 0} pages</span>
              </div>
            </div>
          )}

          {/* Tags */}
          {notebook.tags && notebook.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {notebook.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs"
                >
                  {tag}
                </Badge>
              ))}
              {notebook.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{notebook.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
            {notebook.owner_name && (
              <span>By {notebook.owner_name}</span>
            )}
            {notebook.last_updated && (
              <span>{notebook.last_updated}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * NotebookCard Component - Mobile-first notebook display
 *
 * Displays notebooks as cards with:
 * - Visual color coding
 * - Visibility indicators (private/shared/tenant)
 * - Pin indicators
 * - Section/page metrics
 * - Tags
 * - Responsive grid layout
 */
export default function NotebookCard({
  notebook,
  notebooks,
  layout = "grid",
  columns = 3,
  showVisibility = true,
  showMetrics = true,
  baseUrl = "/admin/community/planning/notebooks",
  className,
}: NotebookCardProps) {
  // Handle both single notebook and multiple notebooks
  const notebookList = normalizeList<NotebookCardData>(notebooks || (notebook ? [notebook] : []));

  if (notebookList.length === 0) {
    return null;
  }

  const gridClass = layout === "grid"
    ? `grid gap-4 md:grid-cols-2 lg:grid-cols-${columns}`
    : "flex flex-col gap-4";

  return (
    <div className={cn(gridClass, className)}>
      {notebookList.map((nb) => (
        <SingleNotebookCard
          key={nb.id}
          notebook={nb}
          showVisibility={showVisibility}
          showMetrics={showMetrics}
          className={layout === "list" ? "max-w-none" : undefined}
        />
      ))}
    </div>
  );
}
