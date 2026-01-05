"use client";

import React from "react";
import { Loader2 } from "lucide-react";

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
  success: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  info: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border/60",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
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
    <section className="space-y-6">
      <div
        className={cn(
          "grid gap-4",
          columns <= 1 ? "grid-cols-1" : undefined,
          columns === 2 ? "md:grid-cols-2" : undefined,
          columns >= 3 ? "lg:grid-cols-3" : undefined,
        )}
      >
        {panels.map((panel) => (
          <Card key={panel.id ?? panel.title} className="border-border/60">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-foreground">{panel.title}</CardTitle>
                  {panel.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{panel.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {panel.badge && (
                    <Badge
                      variant="outline"
                      className="border-border/60 text-xs uppercase tracking-widest text-muted-foreground"
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
            <CardContent>
              <dl className="grid gap-4 text-sm">
                {normalizeList<DetailItem>(panel.items).map((item) => (
                  <div key={`${panel.id ?? panel.title}-${item.label}`} className="space-y-1">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                      <span className="flex items-center gap-2">
                        {item.icon && <span aria-hidden>{item.icon}</span>}
                        <span>{item.label}</span>
                      </span>
                    </dt>
                    <dd className="text-foreground">
                      {renderValue(item)}
                      {item.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" showCloseButton>
          <DialogHeader>
            <DialogTitle>{dialogState.actionLabel || "Update section"}</DialogTitle>
            <DialogDescription>
              {formState?.helperText ?? dialogState.panelTitle ?? "Edit this member section."}
            </DialogDescription>
          </DialogHeader>

          {status === "loading" && (
            <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span>Loading form…</span>
            </div>
          )}

          {status === "error" && errorMessage && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              {errorMessage}
            </p>
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
        "inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        buttonStyles(variant),
        fullWidth ? "w-full justify-center" : undefined,
      )}
    >
      {label}
    </button>
  );
}

function renderValue(item: DetailItem) {
  const tone = item.variant ?? "neutral";
  switch (item.type) {
    case "badge":
      return (
        <Badge variant="outline" className={cn("border", badgeTone[tone] ?? badgeTone.neutral)}>
          {String(item.value ?? "")}
        </Badge>
      );
    case "link":
      if (!item.href) {
        return <span>{String(item.value ?? "")}</span>;
      }
      return (
        <a href={item.href} className="font-medium text-primary hover:underline">
          {String(item.value ?? item.href)}
        </a>
      );
    case "chips":
      return (
        <div className="flex flex-wrap gap-2">
          {(item.items ?? []).map((chip, index) => (
            <Badge key={`${chip}-${index}`} variant="outline" className="border-border/60 text-xs">
              {chip}
            </Badge>
          ))}
        </div>
      );
    case "multiline":
      return <div className="whitespace-pre-line text-sm text-muted-foreground">{String(item.value ?? "")}</div>;
    case "currency": {
      const amount = Number(item.value ?? 0);
      if (Number.isNaN(amount)) {
        return <span>{String(item.value ?? "")}</span>;
      }
      return (
        <span className="font-medium">
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: amount >= 1000 ? 0 : 2,
          }).format(amount)}
        </span>
      );
    }
    default:
      return <span>{String(item.value ?? "")}</span>;
  }
}
