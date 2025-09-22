import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { normalizeList } from "../shared";

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
}

const statusTone: Record<NonNullable<TimelineEvent["status"]>, string> = {
  completed: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  scheduled: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  attention: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  new: "bg-primary/15 text-primary border-primary/30",
};

export function AdminActivityTimeline(props: AdminActivityTimelineProps) {
  const events = normalizeList<TimelineEvent>(props.events);

  return (
    <section className="space-y-6">
      {(props.title || props.description) && (
        <header className="space-y-2">
          {props.title && <h2 className="text-xl font-semibold text-foreground">{props.title}</h2>}
          {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
        </header>
      )}
      <Card className="border-border/60">
        {props.accentLabel && (
          <CardHeader className="pb-0">
            <Badge variant="outline" className="w-fit border-primary/40 text-primary">
              {props.accentLabel}
            </Badge>
          </CardHeader>
        )}
        <CardContent className="pt-6">
          <ol className="relative space-y-6 border-l border-border/60 pl-6">
            {events.map((event, index) => (
              <li key={event.id ?? `${event.title}-${index}`} className="ml-2 space-y-2">
                <div className="absolute -left-[0.65rem] mt-1 flex size-3 items-center justify-center rounded-full border border-border/60 bg-background">
                  <span className="text-[10px] leading-none">{event.icon ?? "•"}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{event.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {event.date && <span>{event.date}</span>}
                    {event.timeAgo && <span>{event.timeAgo}</span>}
                  </div>
                </div>
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground/90">
                  {event.amount && <span className="font-medium text-foreground">{event.amount}</span>}
                  {event.category && <span>{event.category}</span>}
                  {event.status && (
                    <Badge variant="outline" className={cn("border", statusTone[event.status])}>
                      {labelStatus(event.status)}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ol>
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
