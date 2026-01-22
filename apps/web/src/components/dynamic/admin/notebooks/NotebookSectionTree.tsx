"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface NotebookPageData {
  id: string;
  title: string;
  is_favorite?: boolean;
  tags?: string[];
  updated_at?: string;
  href: string;
}

export interface NotebookSectionData {
  id: string;
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  is_collapsed?: boolean;
  sort_order?: number;
  page_count?: number;
  pages: NotebookPageData[];
}

export interface NotebookSectionTreeProps {
  /** Title for the section tree */
  title?: string;
  /** Description */
  description?: string;
  /** Sections with pages */
  sections?: NotebookSectionData[] | { items?: NotebookSectionData[] } | null;
  /** Empty state configuration */
  emptyState?: {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
  };
  /** Allow collapse/expand */
  allowCollapse?: boolean;
  /** Show page count */
  showPageCount?: boolean;
  /** Enable drag-and-drop reordering */
  enableReorder?: boolean;
  /** Additional CSS classes */
  className?: string;
}

function NotebookSection({
  section,
  allowCollapse = true,
  showPageCount = true,
}: {
  section: NotebookSectionData;
  allowCollapse?: boolean;
  showPageCount?: boolean;
}) {
  const [isCollapsed, setIsCollapsed] = useState(section.is_collapsed ?? false);
  const sectionColor = section.color || "#6B7280";
  const sectionIcon = section.icon || "📁";

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          "bg-muted/30 hover:bg-muted/50 transition-colors",
          "text-left"
        )}
        disabled={!allowCollapse}
      >
        <div className="flex items-center gap-3 flex-1">
          {allowCollapse && (
            <div className="text-muted-foreground">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          )}
          <div
            className="w-1 h-8 rounded-full"
            style={{ backgroundColor: sectionColor }}
          />
          <span className="text-xl">{sectionIcon}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-base">{section.title}</h4>
            {section.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {section.description}
              </p>
            )}
          </div>
        </div>
        {showPageCount && (
          <Badge variant="secondary" className="ml-2">
            {section.pages.length} pages
          </Badge>
        )}
      </button>

      {/* Pages list */}
      {!isCollapsed && section.pages.length > 0 && (
        <div className="divide-y divide-border/40">
          {section.pages.map((page) => (
            <Link
              key={page.id}
              href={page.href}
              className={cn(
                "block p-3 pl-14 hover:bg-muted/30 transition-colors",
                "group"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {page.is_favorite && (
                    <span className="text-amber-500 flex-shrink-0">⭐</span>
                  )}
                  <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    📄 {page.title}
                  </span>
                </div>
                {page.updated_at && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {page.updated_at}
                  </span>
                )}
              </div>
              {page.tags && page.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {page.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {/* Empty state for section */}
      {!isCollapsed && section.pages.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          <p className="text-sm">No pages in this section yet.</p>
        </div>
      )}
    </div>
  );
}

/**
 * NotebookSectionTree Component - OneNote-style hierarchical navigation
 *
 * Displays notebooks in a collapsible tree structure with:
 * - Sections with color coding
 * - Pages within sections
 * - Favorite indicators
 * - Tags
 * - Collapse/expand functionality
 */
export default function NotebookSectionTree({
  title,
  description,
  sections,
  emptyState,
  allowCollapse = true,
  showPageCount = true,
  enableReorder = false,
  className,
}: NotebookSectionTreeProps) {
  // Normalize sections input
  const sectionList = Array.isArray(sections)
    ? sections
    : (sections as any)?.items
    ? (sections as any).items
    : [];

  return (
    <Card className={cn("border-border/60", className)}>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {sectionList.length === 0 && emptyState ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
            <p className="text-muted-foreground mb-4">{emptyState.description}</p>
            {emptyState.actionLabel && emptyState.actionHref && (
              <Button asChild>
                <Link href={emptyState.actionHref}>
                  {emptyState.actionLabel}
                </Link>
              </Button>
            )}
          </div>
        ) : (
          sectionList.map((section) => (
            <NotebookSection
              key={section.id}
              section={section}
              allowCollapse={allowCollapse}
              showPageCount={showPageCount}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
