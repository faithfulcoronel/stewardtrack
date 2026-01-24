"use client";

import React from "react";
import { Loader2, Edit3, ExternalLink, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { normalizeList, buttonStyles } from "../shared";
import type { ActionConfig } from "../shared";
import { AdminFormSection } from "./AdminFormSection";
import type { AdminFormMode, FormFieldConfig } from "./types";

export interface DetailItem {
  label: string;
  value?: string | number | null;
  type?: "text" | "badge" | "link" | "chips" | "multiline" | "currency" | null;
  href?: string | null;
  icon?: string | null;
  variant?: string | null;
  description?: string | null;
  items?: string[] | null;
}

export interface DetailPanel {
  id?: string | null;
  title: string;
  description?: string | null;
  items?: DetailItem[] | { items?: DetailItem[] } | null;
  badge?: string | null;
  columns?: number | null;
  action?: ActionConfig | null;
}

export interface AdminDetailPanelsProps {
  panels?: DetailPanel[] | { items?: DetailPanel[] } | null;
  columns?: number | null;
}

interface PanelActionPayload {
  actionId: string;
  memberId: string;
  panelTitle: string | null;
  actionLabel: string;
}

interface ManageSectionFormState {
  fields: FormFieldConfig[];
  initialValues: Record<string, unknown>;
  submitAction: ActionConfig | null;
  submitLabel: string | null;
  mode: AdminFormMode | null;
  footnote: string | null;
  helperText: string | null;
}

interface ManageSectionResponsePayload {
  data: {
    actionId: string;
    memberId: string;
    fields: FormFieldConfig[];
    initialValues: Record<string, unknown>;
    submitAction: ActionConfig | null;
    submitLabel: string | null;
    mode: AdminFormMode | null;
    footnote: string | null;
    helperText: string | null;
  };
}

const badgeTone: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
  critical: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const initialDialogState: PanelActionPayload & { open: boolean } = {
  open: false,
  actionId: "",
  memberId: "",
  panelTitle: null,
  actionLabel: "",
};

export function AdminDetailPanels(props: AdminDetailPanelsProps) {
  const panels = normalizeList<DetailPanel>(props.panels);
  const columns = props.columns ?? (panels.length >= 3 ? 3 : 2);

  const [dialogState, setDialogState] = React.useState(initialDialogState);
  const [formState, setFormState] = React.useState<ManageSectionFormState | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const handleOpenAction = React.useCallback((payload: PanelActionPayload) => {
    setDialogState({ open: true, ...payload });
  }, []);

  const handleDialogOpenChange = React.useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setDialogState(initialDialogState);
      setFormState(null);
      setStatus("idle");
      setErrorMessage(null);
    } else {
      setDialogState((previous) => ({ ...previous, open: true }));
    }
  }, []);

  React.useEffect(() => {
    if (!dialogState.open || !dialogState.actionId || !dialogState.memberId) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      actionId: dialogState.actionId,
      memberId: dialogState.memberId,
    });

    setStatus("loading");
    setErrorMessage(null);
    setFormState(null);

    fetch(`/api/admin/members/manage-section?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.json().catch(() => ({}));
          const errorText = typeof message?.error === "string" ? message.error : "Unable to load the edit form.";
          throw new Error(errorText);
        }
        return response.json() as Promise<ManageSectionResponsePayload>;
      })
      .then((payload) => {
        if (
          !dialogState.open ||
          payload.data.actionId !== dialogState.actionId ||
          payload.data.memberId !== dialogState.memberId
        ) {
          return;
        }
        setFormState({
          fields: payload.data.fields,
          initialValues: payload.data.initialValues,
          submitAction: payload.data.submitAction,
          submitLabel: payload.data.submitLabel,
          mode: payload.data.mode,
          footnote: payload.data.footnote,
          helperText: payload.data.helperText,
        });
        setStatus("idle");
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "Unable to load the edit form.");
      });

    return () => {
      controller.abort();
    };
  }, [dialogState]);

  const contextParams = React.useMemo(() => {
    if (!dialogState.memberId) {
      return null;
    }
    return { memberId: dialogState.memberId } satisfies Record<string, string>;
  }, [dialogState.memberId]);

  return (
    <section className="space-y-5 sm:space-y-6">
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          columns <= 1 && "grid-cols-1",
          columns === 2 && "grid-cols-1 md:grid-cols-2",
          columns >= 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {panels.map((panel, index) => (
          <Card
            key={panel.id ?? panel.title}
            className={cn(
              "group relative overflow-hidden",
              "border-border/40 bg-card/50 backdrop-blur-sm",
              "transition-all duration-300",
              "hover:border-border hover:shadow-lg hover:shadow-primary/5"
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 group-hover:bg-primary/40 transition-colors" />

            <CardHeader className="relative space-y-3 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                    <span className="h-4 w-1 rounded-full bg-primary shrink-0" />
                    <span className="truncate">{panel.title}</span>
                  </CardTitle>
                  {panel.description && (
                    <p className="text-sm text-muted-foreground pl-3 line-clamp-2">{panel.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {panel.badge && (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-muted/50 text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground font-medium"
                    >
                      {panel.badge}
                    </Badge>
                  )}
                  {panel.action && (
                    <div className="hidden sm:block">
                      <DetailPanelActionButton panel={panel} onOpen={handleOpenAction} />
                    </div>
                  )}
                </div>
              </div>
              {panel.action && (
                <div className="sm:hidden">
                  <DetailPanelActionButton panel={panel} onOpen={handleOpenAction} fullWidth />
                </div>
              )}
            </CardHeader>

            <CardContent className="relative pt-0">
              <dl className="grid gap-3 sm:gap-4 text-sm">
                {normalizeList<DetailItem>(panel.items).map((item, itemIndex) => (
                  <div
                    key={`${panel.id ?? panel.title}-${item.label}`}
                    className="group/item space-y-1 rounded-lg p-2.5 sm:p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    style={{ animationDelay: `${(index * 50) + (itemIndex * 30)}ms` }}
                  >
                    <dt className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                      <span className="flex items-center gap-1.5">
                        {item.icon && <span aria-hidden className="text-sm">{item.icon}</span>}
                        <span>{item.label}</span>
                      </span>
                    </dt>
                    <dd className="text-foreground font-medium">
                      {renderValue(item)}
                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground font-normal">{item.description}</p>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogState.open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-2xl" showCloseButton>
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              {dialogState.actionLabel || "Update section"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {formState?.helperText ?? dialogState.panelTitle ?? "Edit this member section."}
            </DialogDescription>
          </DialogHeader>

          {status === "loading" && (
            <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
              <span>Loading form...</span>
            </div>
          )}

          {status === "error" && errorMessage && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
            </div>
          )}

          {status === "idle" && formState && (
            <AdminFormSection
              key={`${dialogState.actionId}-${dialogState.memberId}`}
              title={dialogState.panelTitle ?? dialogState.actionLabel}
              description={formState.helperText ?? undefined}
              hideHeader
              fields={formState.fields}
              initialValues={formState.initialValues}
              submitLabel={formState.submitLabel ?? undefined}
              submitAction={formState.submitAction ?? null}
              cancelAction={null}
              mode={formState.mode ?? null}
              footnote={formState.footnote ?? undefined}
              contextParams={contextParams}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function DetailPanelActionButton({
  panel,
  onOpen,
  fullWidth,
}: {
  panel: DetailPanel;
  onOpen: (payload: PanelActionPayload) => void;
  fullWidth?: boolean;
}) {
  const action = panel.action;
  const config = action?.config ?? {};
  const href = typeof config.url === "string" ? config.url : "#";
  const label = typeof config.label === "string" ? config.label : "Edit";
  const variant = typeof config.variant === "string" ? config.variant : "ghost";

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (typeof window === "undefined") {
        return;
      }

      let memberId: string | null = null;
      try {
        const parsed = new URL(href, window.location.origin);
        memberId = parsed.searchParams.get("memberId");
      } catch {
        memberId = null;
      }

      if (!action?.id || !memberId) {
        window.location.href = href;
        return;
      }

      onOpen({
        actionId: action.id,
        memberId,
        panelTitle: panel.title ?? null,
        actionLabel: label,
      });
    },
    [action?.id, href, label, onOpen, panel.title],
  );

  if (!action) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium",
        "transition-all duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "active:scale-[0.98]",
        buttonStyles(variant),
        fullWidth && "w-full justify-center",
      )}
    >
      <Edit3 className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function renderValue(item: DetailItem) {
  const tone = item.variant ?? "neutral";

  if (item.value === null || item.value === undefined || item.value === "") {
    return <span className="text-muted-foreground/50">—</span>;
  }

  switch (item.type) {
    case "badge":
      return (
        <Badge variant="outline" className={cn("border font-medium", badgeTone[tone] ?? badgeTone.neutral)}>
          {String(item.value ?? "")}
        </Badge>
      );
    case "link":
      if (!item.href) {
        return <span>{String(item.value ?? "")}</span>;
      }
      return (
        <a
          href={item.href}
          className="inline-flex items-center gap-1 text-primary hover:underline group/link"
        >
          <span>{String(item.value ?? item.href)}</span>
          <ExternalLink className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </a>
      );
    case "chips":
      return (
        <div className="flex flex-wrap gap-1.5">
          {(item.items ?? []).length === 0 ? (
            <span className="text-muted-foreground/50">—</span>
          ) : (
            (item.items ?? []).map((chip, index) => (
              <Badge
                key={`${chip}-${index}`}
                variant="secondary"
                className="text-[10px] sm:text-xs bg-muted/60 hover:bg-muted transition-colors"
              >
                {chip}
              </Badge>
            ))
          )}
        </div>
      );
    case "multiline":
      return (
        <div className="whitespace-pre-line text-sm text-muted-foreground leading-relaxed">
          {String(item.value ?? "")}
        </div>
      );
    case "currency": {
      const amount = Number(item.value ?? 0);
      if (Number.isNaN(amount)) {
        return <span>{String(item.value ?? "")}</span>;
      }
      return (
        <span className="font-semibold tabular-nums text-foreground">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: amount >= 1000 ? 0 : 2,
          }).format(amount)}
        </span>
      );
    }
    default:
      return <span>{String(item.value ?? "")}</span>;
  }
}
