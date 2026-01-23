"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Users,
  Globe,
  Pin,
  FolderOpen,
  FileText,
  Clock,
  ArrowUpRight
} from "lucide-react";
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
  /** Additional CSS classes */
  className?: string;
}

const visibilityConfig: Record<NotebookVisibility, {
  label: string;
  icon: React.ReactNode;
  className: string;
  bgClassName: string;
}> = {
  private: {
    label: "Private",
    icon: <Lock className="h-3 w-3" />,
    className: "text-muted-foreground border-muted-foreground/30",
    bgClassName: "bg-muted/50",
  },
  shared: {
    label: "Shared",
    icon: <Users className="h-3 w-3" />,
    className: "text-sky-600 dark:text-sky-400 border-sky-500/30",
    bgClassName: "bg-sky-500/10",
  },
  tenant: {
    label: "Tenant-wide",
    icon: <Globe className="h-3 w-3" />,
    className: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    bgClassName: "bg-emerald-500/10",
  },
};

function SingleNotebookCard({
  notebook,
  showVisibility = true,
  showMetrics = true,
  className,
}: Omit<NotebookCardProps, "notebooks"> & { notebook: NotebookCardData }) {
  const visibilityInfo = visibilityConfig[notebook.visibility] || visibilityConfig.private;
  const notebookColor = notebook.color || "#6366f1";
  const notebookIcon = notebook.icon || "📚";

  return (
    <Link href={notebook.href} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl">
      <Card
        className={cn(
          "relative overflow-hidden",
          "border-border/40 bg-card/50 backdrop-blur-sm",
          "transition-all duration-300",
          "hover:border-border hover:shadow-lg hover:shadow-primary/5",
          "active:scale-[0.99]",
          notebook.is_pinned && "ring-2 ring-amber-500/20 bg-amber-500/5",
          className
        )}
      >
        {/* Color indicator bar */}
        <div
          className="absolute left-0 top-0 h-full w-1 transition-all duration-300 group-hover:w-1.5"
          style={{ backgroundColor: notebookColor }}
        />

        {/* Gradient overlay on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `linear-gradient(135deg, ${notebookColor}08 0%, transparent 60%)`
          }}
        />

        {/* Arrow indicator */}
        <ArrowUpRight
          className="absolute right-3 top-3 h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />

        <CardHeader className="relative space-y-3 pl-5">
          {/* Top row: Icon + Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-transform duration-300 group-hover:scale-110"
                style={{
                  backgroundColor: `${notebookColor}15`,
                  boxShadow: `0 0 0 1px ${notebookColor}30`
                }}
              >
                {notebookIcon}
              </span>

              {notebook.is_pinned && (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] sm:text-xs font-medium gap-1"
                >
                  <Pin className="h-3 w-3" />
                  <span className="hidden sm:inline">Pinned</span>
                </Badge>
              )}
            </div>

            {showVisibility && (
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] sm:text-xs font-medium gap-1",
                  visibilityInfo.className,
                  visibilityInfo.bgClassName
                )}
              >
                {visibilityInfo.icon}
                <span className="hidden sm:inline">{visibilityInfo.label}</span>
              </Badge>
            )}
          </div>

          {/* Title and description */}
          <div className="space-y-1.5">
            <h3 className="font-semibold text-base sm:text-lg leading-tight text-foreground group-hover:text-primary transition-colors duration-300 pr-6">
              {notebook.title}
            </h3>
            {notebook.description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {notebook.description}
              </p>
            )}
          </div>
        </CardHeader>

        <CardContent className="relative space-y-3 pl-5">
          {/* Metrics */}
          {showMetrics && (
            <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <FolderOpen className="h-3.5 w-3.5" />
                <span>{notebook.section_count ?? 0} sections</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>{notebook.page_count ?? 0} pages</span>
              </div>
            </div>
          )}

          {/* Tags */}
          {notebook.tags && notebook.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {notebook.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] sm:text-xs bg-muted/60 hover:bg-muted transition-colors"
                >
                  {tag}
                </Badge>
              ))}
              {notebook.tags.length > 3 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] sm:text-xs bg-muted/60"
                >
                  +{notebook.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          {(notebook.owner_name || notebook.last_updated) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-2 border-t border-border/40">
              {notebook.owner_name && (
                <span className="flex items-center gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary uppercase">
                    {notebook.owner_name.charAt(0)}
                  </div>
                  <span>By {notebook.owner_name}</span>
                </span>
              )}
              {notebook.last_updated && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {notebook.last_updated}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

/**
 * NotebookCard Component - Mobile-first notebook display
 *
 * Displays notebooks as cards with:
 * - Visual color coding with dynamic accent colors
 * - Visibility indicators (private/shared/tenant)
 * - Pin indicators with animation
 * - Section/page metrics
 * - Tags with overflow handling
 * - Responsive grid layout
 * - Smooth hover animations and transitions
 */
export default function NotebookCard({
  notebook,
  notebooks,
  layout = "grid",
  columns = 3,
  showVisibility = true,
  showMetrics = true,
  className,
}: NotebookCardProps) {
  // Handle both single notebook and multiple notebooks
  const notebookList = normalizeList<NotebookCardData>(notebooks || (notebook ? [notebook] : []));

  if (notebookList.length === 0) {
    return null;
  }

  const gridClass = layout === "grid"
    ? cn(
        "grid gap-3 sm:gap-4",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns >= 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns >= 4 && "xl:grid-cols-4"
      )
    : "flex flex-col gap-3 sm:gap-4";

  return (
    <div className={cn(gridClass, className)}>
      {notebookList.map((nb, index) => (
        <div
          key={nb.id}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <SingleNotebookCard
            notebook={nb}
            showVisibility={showVisibility}
            showMetrics={showMetrics}
            className={layout === "list" ? "max-w-none" : undefined}
          />
        </div>
      ))}
    </div>
  );
}
