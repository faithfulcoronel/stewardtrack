'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2,
  Building2,
  PlusCircle,
  Edit2,
  History,
  Users,
  ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { AssignLicenseDialog } from './AssignLicenseDialog';
import { LicenseHistoryPanel } from './LicenseHistoryPanel';
import { DeploymentActionsPanel } from './DeploymentActionsPanel';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { TenantForAssignment } from '@/models/licenseAssignment.model';

export function LicenseAssignmentsManager() {
  const [assignments, setAssignments] = useState<TenantForAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/licensing/tenants');
      const result = await response.json();

      if (result.success) {
        setAssignments(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load assignments');
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast.error('Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }

  function handleAssignNew() {
    setSelectedTenantId(undefined);
    setIsDialogOpen(true);
  }

  function handleChangeLicense(tenantId: string) {
    setSelectedTenantId(tenantId);
    setIsDialogOpen(true);
  }

  function handleAssignmentSuccess() {
    loadAssignments();
    setSelectedTenantId(undefined);
  }

  function toggleHistory(tenantId: string) {
    setExpandedTenantId(expandedTenantId === tenantId ? null : tenantId);
  }

  // Count tenants without an assigned offering (orphaned grants potential)
  const tenantsWithNoOffering = useMemo(() => {
    return assignments.filter(
      (a) => !a.current_offering_id && a.feature_count > 0
    ).length;
  }, [assignments]);

  function getTierColor(tier: string | null) {
    if (!tier) return 'bg-muted text-muted-foreground border-border';

    switch (tier.toLowerCase()) {
      case 'starter':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'professional':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'enterprise':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  }

  if (isLoading) {
    return (
      <>
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Deployment Actions Panel */}
      <DeploymentActionsPanel
        tenantsWithNoOffering={tenantsWithNoOffering}
        onRefresh={loadAssignments}
      />

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">License Assignments</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  View and manage tenant license assignments
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleAssignNew} className="w-full sm:w-auto">
              <PlusCircle className="h-4 w-4 mr-2" />
              Assign New License
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Collapsible
                  key={assignment.tenant_id}
                  open={expandedTenantId === assignment.tenant_id}
                  onOpenChange={() => toggleHistory(assignment.tenant_id)}
                >
                  <div className="border border-border rounded-lg overflow-hidden bg-card">
                    {/* Main row */}
                    <div className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                        {/* Tenant */}
                        <div className="sm:col-span-3">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-muted p-2 shrink-0">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate">
                                {assignment.tenant_name}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {assignment.tenant_subdomain}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Offering */}
                        <div className="sm:col-span-3">
                          {assignment.current_offering_name ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {assignment.current_offering_name}
                              </div>
                              {assignment.last_assignment_date && (
                                <div className="text-xs text-muted-foreground">
                                  Assigned {new Date(assignment.last_assignment_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">No offering assigned</span>
                          )}
                        </div>

                        {/* Tier */}
                        <div className="sm:col-span-2 sm:text-center">
                          {assignment.current_offering_tier ? (
                            <Badge
                              variant="outline"
                              className={getTierColor(assignment.current_offering_tier)}
                            >
                              {assignment.current_offering_tier}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>

                        {/* Features */}
                        <div className="sm:col-span-2 sm:text-center">
                          <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
                            <span className="font-semibold text-primary">{assignment.feature_count}</span>
                            <span className="text-xs text-muted-foreground">features</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="sm:col-span-2 flex items-center justify-start sm:justify-end gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm">
                              <History className="h-4 w-4 mr-1" />
                              History
                              <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${expandedTenantId === assignment.tenant_id ? 'rotate-180' : ''}`} />
                            </Button>
                          </CollapsibleTrigger>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeLicense(assignment.tenant_id)}
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {assignment.current_offering_name ? 'Change' : 'Assign'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* History panel */}
                    <CollapsibleContent>
                      <div className="border-t border-border bg-muted/30 p-3 sm:p-4">
                        <LicenseHistoryPanel
                          tenantId={assignment.tenant_id}
                          tenantName={assignment.tenant_name}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto rounded-full bg-muted p-4 w-fit mb-4">
                <Building2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium">No tenants found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Assignments will appear here once tenants are created
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AssignLicenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleAssignmentSuccess}
        preSelectedTenantId={selectedTenantId}
      />
    </>
  );
}
