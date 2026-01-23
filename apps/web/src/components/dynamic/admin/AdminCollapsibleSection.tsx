"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface AdminCollapsibleSectionProps {
  title?: string;
  description?: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function AdminCollapsibleSection({
  title,
  description,
  defaultOpen = false,
  children,
}: AdminCollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <section className={cn(
        "group relative overflow-hidden",
        "rounded-2xl sm:rounded-3xl border border-border/40",
        "bg-card/50 backdrop-blur-sm shadow-sm",
        "transition-all duration-200 hover:border-border/60"
      )}>
        {/* Top accent line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-0.5 transition-colors",
          isOpen ? "bg-primary/30" : "bg-primary/10 group-hover:bg-primary/20"
        )} />

        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex w-full items-center justify-between p-4 sm:p-6 text-left",
              "transition-colors duration-200 hover:bg-muted/20"
            )}
          >
            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              {title && (
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  <span className="h-4 w-1 rounded-full bg-primary shrink-0" />
                  <span className="truncate">{title}</span>
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-muted-foreground pl-3 line-clamp-2">{description}</p>
              )}
            </div>
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ml-3",
              "bg-muted/30 transition-all duration-200",
              isOpen && "bg-primary/10"
            )}>
              <ChevronDown
                className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-transform duration-200",
                  isOpen && "rotate-180 text-primary"
                )}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/40 p-4 sm:p-6 sm:pt-5 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            {children}
          </div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
