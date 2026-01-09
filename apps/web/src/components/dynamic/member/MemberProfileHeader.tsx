"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, MoreVertical, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface MetricItem {
  id?: string;
  label: string;
  value: string;
  description?: string;
  tone?: "positive" | "warning" | "info" | "neutral" | null;
}

export interface ActionItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  icon?: React.ReactNode;
}

export interface MemberProfileHeaderProps {
  member: {
    id?: string;
    firstName: string;
    lastName: string;
    preferredName?: string | null;
    photoUrl?: string | null;
    stage?: string | null;
    stageVariant?: "success" | "warning" | "info" | "neutral" | null;
    center?: string | null;
    membershipType?: string | null;
    joinDate?: string | null;
  };
  /** User's permission codes for determining field visibility. */
  userPermissions?: string[];
  metrics?: MetricItem[];
  actions?: ActionItem[];
  backHref?: string;
  backLabel?: string;
  onPhotoChange?: () => void;
  className?: string;
}

const stageBadgeStyles: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

const metricToneStyles: Record<string, string> = {
  positive: "text-emerald-600",
  warning: "text-amber-600",
  info: "text-sky-600",
  neutral: "text-muted-foreground",
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function MemberProfileHeader({
  member,
  userPermissions = [],
  metrics = [],
  actions = [],
  backHref,
  backLabel = "Back",
  onPhotoChange,
  className,
}: MemberProfileHeaderProps) {
  const displayName = member.preferredName
    ? `${member.preferredName} ${member.lastName}`
    : `${member.firstName} ${member.lastName}`;

  const fullName = `${member.firstName} ${member.lastName}`;
  const showPreferredName = member.preferredName && member.preferredName !== member.firstName;

  // Determine visibility based on permissions
  const canViewAdminFields = userPermissions.some(p =>
    ["members:view", "members:manage"].includes(p)
  );

  const canEditPhoto = onPhotoChange && userPermissions.some(p =>
    ["members:edit_self", "members:edit"].includes(p)
  );

  // Filter metrics based on viewer role
  const visibleMetrics = metrics.slice(0, 3); // Show max 3 metrics

  // Separate primary action from menu actions
  const primaryAction = actions.find((a) => a.variant === "default" || !a.variant);
  const menuActions = actions.filter((a) => a !== primaryAction);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Navigation */}
      {backHref && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="gap-2 text-muted-foreground">
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </Button>
        </div>
      )}

      {/* Profile Header */}
      <div className="rounded-2xl border border-border/60 bg-card p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Avatar and Info */}
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {/* Avatar */}
            <div className="relative group">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-background shadow-lg">
                <AvatarImage src={member.photoUrl ?? undefined} alt={displayName} />
                <AvatarFallback className="text-2xl font-medium bg-primary/10 text-primary">
                  {getInitials(member.firstName, member.lastName)}
                </AvatarFallback>
              </Avatar>
              {canEditPhoto && (
                <button
                  onClick={onPhotoChange}
                  className="absolute bottom-0 right-0 rounded-full bg-primary p-2 text-primary-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Change photo"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Name and Details */}
            <div className="text-center sm:text-left space-y-2">
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{displayName}</h1>
                {showPreferredName && (
                  <p className="text-sm text-muted-foreground">
                    Legal name: {fullName}
                  </p>
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                {member.stage && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border",
                      stageBadgeStyles[member.stageVariant ?? "neutral"]
                    )}
                  >
                    {member.stage}
                  </Badge>
                )}
                {member.center && (
                  <Badge variant="secondary" className="text-xs">
                    {member.center}
                  </Badge>
                )}
                {member.membershipType && canViewAdminFields && (
                  <Badge variant="outline" className="text-xs">
                    {member.membershipType}
                  </Badge>
                )}
              </div>

              {/* Join Date */}
              {member.joinDate && canViewAdminFields && (
                <p className="text-sm text-muted-foreground">
                  Member since{" "}
                  {new Date(member.joinDate).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                  })}
                </p>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center justify-center gap-2 sm:justify-end">
            {primaryAction && (
              primaryAction.href ? (
                <Button variant="default" size="sm" asChild className="gap-2">
                  <Link href={primaryAction.href}>
                    {primaryAction.icon}
                    {primaryAction.label}
                  </Link>
                </Button>
              ) : (
                <Button
                  variant="default"
                  size="sm"
                  onClick={primaryAction.onClick}
                  className="gap-2"
                >
                  {primaryAction.icon ?? <Pencil className="h-4 w-4" />}
                  {primaryAction.label}
                </Button>
              )
            )}
            {menuActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">More actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuActions.map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={action.onClick}
                      asChild={!!action.href}
                      className={action.variant === "destructive" ? "text-destructive" : ""}
                    >
                      {action.href ? (
                        <Link href={action.href} className="flex items-center gap-2">
                          {action.icon}
                          {action.label}
                        </Link>
                      ) : (
                        <span className="flex items-center gap-2">
                          {action.icon}
                          {action.label}
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Metrics */}
        {visibleMetrics.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border/60">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:flex lg:gap-8">
              {visibleMetrics.map((metric, index) => (
                <div key={metric.id ?? index} className="text-center lg:text-left">
                  <p className="text-2xl font-semibold text-foreground">{metric.value}</p>
                  <p
                    className={cn(
                      "text-sm",
                      metric.tone ? metricToneStyles[metric.tone] : "text-muted-foreground"
                    )}
                  >
                    {metric.label}
                  </p>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {metric.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MemberProfileHeader;
