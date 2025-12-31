import Link from "next/link";

import { cn } from "@/lib/utils";

export type ActionConfig = {
  id?: string | null;
  kind?: string | null;
  config?: Record<string, unknown> | null;
};

export function ActionsRow({
  primary,
  secondary,
  className,
}: {
  primary?: ActionConfig | null;
  secondary?: ActionConfig | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      {renderAction(primary, "primary")}
      {renderAction(secondary, "ghost")}
    </div>
  );
}

export function renderAction(action: ActionConfig | null | undefined, fallbackVariant: string) {
  if (!action) {
    return null;
  }
  const config = action.config ?? {};
  const href = typeof config.url === "string" ? config.url : "#";
  const label = typeof config.label === "string" ? config.label : "Learn more";
  const variant = typeof config.variant === "string" ? config.variant : fallbackVariant;
  return (
    <Link
      key={action.id ?? label}
      href={href}
      className={cn(
        "inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        buttonStyles(variant)
      )}
    >
      {label}
    </Link>
  );
}

export function buttonStyles(variant: string) {
  switch (variant) {
    case "ghost":
      return "bg-transparent text-foreground ring-offset-background hover:bg-muted/60 focus-visible:ring-muted";
    case "secondary":
      return "bg-background text-foreground border border-border/60 hover:bg-muted/60 focus-visible:ring-primary/40";
    case "primary":
    default:
      return "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/40";
  }
}

export function normalizeList<T>(value: unknown): T[] {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object" && "items" in (value as Record<string, unknown>)) {
    const items = (value as { items?: unknown }).items;
    return Array.isArray(items) ? (items as T[]) : [];
  }
  if (typeof value === "string") {
    return [value as unknown as T];
  }
  return [];
}
