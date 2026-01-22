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
      <section className="space-y-4 rounded-3xl border border-border/60 bg-background shadow-sm">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between p-6 text-left transition hover:bg-muted/30"
          >
            <div className="space-y-1">
              {title && (
                <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              )}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/60 p-6 pt-4">{children}</div>
        </CollapsibleContent>
      </section>
    </Collapsible>
  );
}
