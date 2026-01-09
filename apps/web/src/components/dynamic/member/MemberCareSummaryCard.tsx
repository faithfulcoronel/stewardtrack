"use client";

import * as React from "react";
import Link from "next/link";
import { Heart, GraduationCap, ArrowRight } from "lucide-react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CarePlanSummary {
  id: string;
  status: string;
  statusVariant?: "success" | "warning" | "info" | "neutral" | null;
  assignedTo?: string | null;
  followUpDate?: string | null;
}

export interface DiscipleshipPlanSummary {
  id: string;
  mentor?: string | null;
  nextStep?: string | null;
  currentPathway?: string | null;
}

export interface MemberCareSummaryCardProps {
  memberId: string;
  carePlan?: CarePlanSummary | null;
  discipleshipPlan?: DiscipleshipPlanSummary | null;
  /** User's permission codes for determining visibility. */
  userPermissions?: string[];
  className?: string;
}

const statusBadgeStyles: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

function formatDate(dateString: string | null | undefined): string | null {
  if (!dateString) return null;
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export function MemberCareSummaryCard({
  memberId: _memberId,
  carePlan,
  discipleshipPlan,
  userPermissions = [],
  className,
}: MemberCareSummaryCardProps) {
  // Determine visibility using permissions
  const canViewCareOrDiscipleship = userPermissions.some(p =>
    ["care:view", "discipleship:view", "members:manage"].includes(p)
  );

  // This card is only visible if user has care/discipleship permissions
  if (!canViewCareOrDiscipleship) {
    return null;
  }

  const hasCarePlan = !!carePlan;
  const hasDiscipleshipPlan = !!discipleshipPlan;
  const hasContent = hasCarePlan || hasDiscipleshipPlan;

  return (
    <Card className={cn("border-border/60 col-span-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-rose-500" />
          <h3 className="text-base font-medium text-foreground">
            Care & Discipleship
          </h3>
          <Badge variant="outline" className="ml-auto text-xs">
            Read-only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasContent ? (
          <p className="text-sm text-muted-foreground italic py-4">
            No active care or discipleship plans for this member.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Care Plan Summary */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4 text-rose-500" />
                  Care Plan
                </h4>
                {hasCarePlan && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "border text-xs",
                      statusBadgeStyles[carePlan.statusVariant ?? "neutral"]
                    )}
                  >
                    {carePlan.status}
                  </Badge>
                )}
              </div>

              {hasCarePlan ? (
                <>
                  <dl className="space-y-2 text-sm">
                    {carePlan.assignedTo && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Assigned to</dt>
                        <dd className="text-foreground font-medium">
                          {carePlan.assignedTo}
                        </dd>
                      </div>
                    )}
                    {carePlan.followUpDate && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Follow-up</dt>
                        <dd className="text-foreground">
                          {formatDate(carePlan.followUpDate)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full justify-between text-primary hover:text-primary h-11 min-h-[44px] touch-manipulation"
                  >
                    <Link
                      href={`/admin/community/care-plans/${carePlan.id}`}
                    >
                      View Care Plan
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No active care plan
                </p>
              )}
            </div>

            {/* Discipleship Plan Summary */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-violet-500" />
                  Discipleship Journey
                </h4>
              </div>

              {hasDiscipleshipPlan ? (
                <>
                  <dl className="space-y-2 text-sm">
                    {discipleshipPlan.mentor && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Mentor</dt>
                        <dd className="text-foreground font-medium">
                          {discipleshipPlan.mentor}
                        </dd>
                      </div>
                    )}
                    {discipleshipPlan.currentPathway && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Pathway</dt>
                        <dd className="text-foreground">
                          {discipleshipPlan.currentPathway}
                        </dd>
                      </div>
                    )}
                    {discipleshipPlan.nextStep && (
                      <div>
                        <dt className="text-muted-foreground mb-1">Next Step</dt>
                        <dd className="text-foreground text-xs bg-muted/50 rounded p-2">
                          {discipleshipPlan.nextStep}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <Button
                    variant="ghost"
                    asChild
                    className="w-full justify-between text-primary hover:text-primary h-11 min-h-[44px] touch-manipulation"
                  >
                    <Link
                      href={`/admin/community/discipleship-plans/${discipleshipPlan.id}`}
                    >
                      View Discipleship Plan
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No active discipleship plan
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MemberCareSummaryCard;
