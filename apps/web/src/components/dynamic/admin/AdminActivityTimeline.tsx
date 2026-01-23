import React from "react";
import {
  Calendar,
  CalendarDays,
  CheckCircle,
  Circle,
  Clock,
  History,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { normalizeList } from "../shared";

/**
 * Map icon name strings to Lucide icon components.
 */
const iconMap: Record<string, LucideIcon> = {
  CheckCircle,
  Circle,
  Clock,
  Calendar,
  Target,
  TrendingUp,
  Users,
  // Lowercase/kebab-case aliases
  checkcircle: CheckCircle,
  "check-circle": CheckCircle,
  circle: Circle,
  clock: Clock,
  calendar: Calendar,
  target: Target,
  trendingup: TrendingUp,
  "trending-up": TrendingUp,
  users: Users,
};

export interface TimelineEvent {
  id?: string | null;
  title: string;
  description?: string | null;
  date?: string | null;
  timeAgo?: string | null;
  amount?: string | null;
  category?: string | null;
  status?: "completed" | "scheduled" | "attention" | "new" | null;
  icon?: string | null;
}

export interface AdminActivityTimelineProps {
  title?: string;
  description?: string;
  events?: TimelineEvent[] | { items?: TimelineEvent[] } | null;
  accentLabel?: string | null;
  emptyMessage?: string | null;
}

const statusTone: Record<NonNullable<TimelineEvent["status"]>, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  scheduled: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  attention: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  new: "bg-primary/10 text-primary border-primary/30",
};

const statusIcon: Record<NonNullable<TimelineEvent["status"]>, LucideIcon> = {
  completed: CheckCircle,
  scheduled: Calendar,
  attention: Clock,
  new: Circle,
};

export function AdminActivityTimeline(props: AdminActivityTimelineProps) {
  const events = normalizeList<TimelineEvent>(props.events);

  return (
    <section className="space-y-5 sm:space-y-6">
      {(props.title || props.description) && (
        <header className="space-y-1.5 sm:space-y-2">
          {props.title && (
            <h2 className="text-lg sm:text-xl font-semibold text-foreground flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-primary" />
              {props.title}
            </h2>
          )}
          {props.description && (
            <p className="text-sm text-muted-foreground pl-3">{props.description}</p>
          )}
        </header>
      )}

      <Card className={cn(
        "group relative overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm",
        "transition-all duration-300",
        "hover:border-border hover:shadow-lg hover:shadow-primary/5"
      )}>
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 group-hover:bg-primary/40 transition-colors" />

        {props.accentLabel && (
          <CardHeader className="relative pb-0 pt-5 sm:pt-6">
            <Badge
              variant="outline"
              className="w-fit border-primary/40 bg-primary/5 text-primary text-[10px] sm:text-xs uppercase tracking-wide font-medium"
            >
              <History className="h-3 w-3 mr-1.5" />
              {props.accentLabel}
            </Badge>
          </CardHeader>
        )}

        <CardContent className="relative pt-5 sm:pt-6 pb-5 sm:pb-6">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-12 text-center">
              <div className="mb-4 flex size-14 sm:size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner">
                <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground/60" aria-hidden />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {props.emptyMessage ?? "No milestones recorded yet. Key moments in this member's journey will appear here."}
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0 ml-3 sm:ml-4">
              {/* Timeline vertical line */}
              <div className="absolute left-0 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border/60 to-transparent" />

              {events.map((event, index) => {
                const IconFromName = event.icon ? iconMap[event.icon] : null;
                const StatusIcon = event.status ? statusIcon[event.status] : null;
                const EventIcon = IconFromName ?? StatusIcon ?? Circle;

                return (
                  <li
                    key={event.id ?? `${event.title}-${index}`}
                    className={cn(
                      "relative pl-7 sm:pl-8 py-3 sm:py-4",
                      "transition-colors duration-200",
                      "hover:bg-muted/30 rounded-r-lg -mr-4 sm:-mr-6 pr-4 sm:pr-6"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Timeline marker */}
                    <div className={cn(
                      "absolute left-0 top-4 sm:top-5 -translate-x-1/2",
                      "flex size-6 sm:size-7 items-center justify-center",
                      "rounded-full border-2 border-background",
                      "shadow-sm transition-transform duration-200",
                      "hover:scale-110",
                      event.status === "completed" && "bg-emerald-500/20",
                      event.status === "scheduled" && "bg-sky-500/20",
                      event.status === "attention" && "bg-amber-500/20",
                      event.status === "new" && "bg-primary/20",
                      !event.status && "bg-muted/80"
                    )}>
                      <EventIcon
                        className={cn(
                          "size-3 sm:size-3.5",
                          event.status === "completed" && "text-emerald-600 dark:text-emerald-400",
                          event.status === "scheduled" && "text-sky-600 dark:text-sky-400",
                          event.status === "attention" && "text-amber-600 dark:text-amber-400",
                          event.status === "new" && "text-primary",
                          !event.status && "text-muted-foreground"
                        )}
                        aria-hidden
                      />
                    </div>

                    <div className="space-y-1.5 sm:space-y-2">
                      {/* Title and date row */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground leading-snug">
                          {event.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground shrink-0">
                          {event.date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" aria-hidden />
                              {event.date}
                            </span>
                          )}
                          {event.timeAgo && (
                            <span className="flex items-center gap-1 text-muted-foreground/70">
                              <Clock className="h-3 w-3" aria-hidden />
                              {event.timeAgo}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {event.description && (
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {event.description}
                        </p>
                      )}

                      {/* Metadata row */}
                      {(event.amount || event.category || event.status) && (
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
                          {event.amount && (
                            <span className="text-xs sm:text-sm font-semibold text-foreground tabular-nums">
                              {event.amount}
                            </span>
                          )}
                          {event.category && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] sm:text-xs bg-muted/60 hover:bg-muted transition-colors"
                            >
                              {event.category}
                            </Badge>
                          )}
                          {event.status && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "border text-[10px] sm:text-xs font-medium",
                                statusTone[event.status]
                              )}
                            >
                              {labelStatus(event.status)}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function labelStatus(status: NonNullable<TimelineEvent["status"]>): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "scheduled":
      return "Scheduled";
    case "attention":
      return "Needs follow-up";
    case "new":
      return "New";
    default:
      return status;
  }
}
