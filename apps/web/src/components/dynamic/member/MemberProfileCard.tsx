"use client";

import * as React from "react";
import Link from "next/link";
import {
  User,
  Phone,
  Users,
  Heart,
  Calendar,
  Shield,
  ChevronDown,
  ChevronUp,
  Pencil,
  ExternalLink,
} from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type MemberProfileCardVariant =
  | "identity"
  | "contact"
  | "family"
  | "engagement"
  | "serving"
  | "emergency"
  | "admin";

export interface CardDetailItem {
  label: string;
  value?: string | null;
  type?: "text" | "badge" | "link" | "chips" | "date" | null;
  href?: string | null;
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "info" | null;
  hidden?: boolean;
}

export interface MemberProfileCardProps {
  variant: MemberProfileCardVariant;
  /** User's permission codes for determining field visibility and edit access. */
  userPermissions?: string[];
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  items?: CardDetailItem[];
  canEdit?: boolean;
  onEdit?: () => void;
  editHref?: string;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  emptyMessage?: string;
  className?: string;
}

const variantConfig: Record<
  MemberProfileCardVariant,
  { icon: React.ReactNode; title: string; color: string }
> = {
  identity: {
    icon: <User className="h-5 w-5" />,
    title: "Personal Information",
    color: "text-primary",
  },
  contact: {
    icon: <Phone className="h-5 w-5" />,
    title: "Contact Information",
    color: "text-sky-600",
  },
  family: {
    icon: <Users className="h-5 w-5" />,
    title: "Family",
    color: "text-violet-600",
  },
  engagement: {
    icon: <Heart className="h-5 w-5" />,
    title: "Church Life",
    color: "text-rose-600",
  },
  serving: {
    icon: <Calendar className="h-5 w-5" />,
    title: "Serving",
    color: "text-emerald-600",
  },
  emergency: {
    icon: <Shield className="h-5 w-5" />,
    title: "Emergency Contact",
    color: "text-amber-600",
  },
  admin: {
    icon: <Shield className="h-5 w-5" />,
    title: "Administrative",
    color: "text-slate-600",
  },
};

const badgeVariantMap: Record<string, string> = {
  default: "bg-primary/10 text-primary border-primary/30",
  secondary: "bg-muted text-muted-foreground border-border",
  outline: "border-border text-foreground",
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/30",
};

function DetailItemValue({ item }: { item: CardDetailItem }) {
  if (!item.value) {
    return <span className="text-muted-foreground italic">Not provided</span>;
  }

  switch (item.type) {
    case "badge":
      return (
        <Badge
          variant="outline"
          className={cn("border", badgeVariantMap[item.variant ?? "default"])}
        >
          {item.value}
        </Badge>
      );
    case "link":
      return (
        <Link
          href={item.href ?? "#"}
          className="text-primary hover:underline inline-flex items-center gap-1 break-all"
        >
          <span className="break-all">{item.value}</span>
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
        </Link>
      );
    case "chips":
      const chips = item.value.split(",").map((c) => c.trim()).filter(Boolean);
      return (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {chip}
            </Badge>
          ))}
        </div>
      );
    case "date":
      return (
        <span className="text-foreground">
          {new Date(item.value).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      );
    default:
      return <span className="text-foreground break-all">{item.value}</span>;
  }
}

export function MemberProfileCard({
  variant,
  userPermissions: _userPermissions, // Used by parent for permission checks
  title,
  description,
  icon,
  items = [],
  canEdit = false,
  onEdit,
  editHref,
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onToggle,
  emptyMessage,
  className,
}: MemberProfileCardProps) {
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const isCollapsed = controlledCollapsed ?? internalCollapsed;

  const config = variantConfig[variant];
  const displayTitle = title ?? config.title;
  const displayIcon = icon ?? config.icon;

  // Filter out hidden items
  const visibleItems = items.filter((item) => !item.hidden);

  const handleToggle = React.useCallback(() => {
    const newState = !isCollapsed;
    setInternalCollapsed(newState);
    onToggle?.(newState);
  }, [isCollapsed, onToggle]);

  const handleEdit = React.useCallback(() => {
    onEdit?.();
  }, [onEdit]);

  const hasContent = visibleItems.length > 0;

  return (
    <Card className={cn("border-border/60 transition-shadow hover:shadow-sm will-change-auto", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("flex-shrink-0", config.color)}>{displayIcon}</div>
            <div className="min-w-0">
              <h3 className="text-base font-medium text-foreground truncate">
                {displayTitle}
              </h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit && (
              editHref ? (
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                >
                  <Link href={editHref}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEdit}
                  className="h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit</span>
                </Button>
              )
            )}
            {hasContent && visibleItems.length > 3 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggle}
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? "Show all items" : "Show fewer items"}
                className="h-11 w-11 min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground italic py-2" role="status">
            {emptyMessage ?? "No information available"}
          </p>
        ) : (
          <dl className="space-y-3" aria-label={`${displayTitle} details`}>
            {(isCollapsed ? visibleItems.slice(0, 3) : visibleItems).map((item, index) => (
              <div key={index} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                <dt className="text-sm font-medium text-muted-foreground min-w-[120px] sm:max-w-[120px] flex-shrink-0">
                  {item.label}
                </dt>
                <dd className="text-sm flex-1 min-w-0 overflow-hidden">
                  <DetailItemValue item={item} />
                </dd>
              </div>
            ))}
            {isCollapsed && visibleItems.length > 3 && (
              <button
                onClick={handleToggle}
                aria-expanded="false"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2 py-2 min-h-[44px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              >
                + {visibleItems.length - 3} more
              </button>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

export default MemberProfileCard;
