'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Building2,
  PlusCircle,
  Edit2,
  History,
  Users,
  ChevronDown,
  Trash2,
  AlertTriangle,
  UserCheck,
  X,
  Clock,
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
import {
  generateTenantDeletionReport,
  type TenantDeletionReportData,
  type DeletedTenantDetail,
} from '@/lib/pdf';

export function LicenseAssignmentsManager() {
  const [assignments, setAssignments] = useState<TenantForAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');

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
        // Clear selections when reloading
        setSelectedIds(new Set());
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

  // Selection handlers
  function toggleSelection(tenantId: string) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tenantId)) {
        newSet.delete(tenantId);
      } else {
        newSet.add(tenantId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === assignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assignments.map((a) => a.tenant_id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // Bulk delete handler
  async function handleBulkDelete() {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setIsBulkDeleting(true);
    try {
      const response = await fetch('/api/licensing/tenants/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_ids: Array.from(selectedIds) }),
      });

      const result = await response.json();

      if (result.success) {
        // Generate and auto-download PDF report
        const deletionReportData: TenantDeletionReportData = {
          deletionDate: new Date(),
          status:
            result.data?.total_tenants_deleted === selectedTenants.length
              ? 'success'
              : result.data?.total_tenants_deleted > 0
                ? 'partial'
                : 'failed',
          summary: {
            total_requested: selectedTenants.length,
            total_deleted: result.data?.total_tenants_deleted || 0,
            total_failed:
              selectedTenants.length - (result.data?.total_tenants_deleted || 0),
            auth_users_deleted: result.data?.auth_users_deleted || 0,
          },
          tenants: selectedTenants.map((tenant): DeletedTenantDetail => {
            const deletedItem = result.data?.deleted?.find(
              (d: { tenant_id: string }) => d.tenant_id === tenant.tenant_id
            );
            return {
              tenant_id: tenant.tenant_id,
              tenant_name: tenant.tenant_name,
              tenant_subdomain: tenant.tenant_subdomain,
              user_count: tenant.user_count ?? 0,
              member_count: tenant.member_count ?? 0,
              status: deletedItem?.status || 'deleted',
              error: deletedItem?.error,
            };
          }),
        };

        // Auto-download the PDF report
        generateTenantDeletionReport(deletionReportData);

        toast.success(
          result.message || `Deleted ${result.data?.total_tenants_deleted} tenant(s). Report downloaded.`
        );
        setBulkDeleteDialogOpen(false);
        setConfirmText('');
        loadAssignments();
      } else {
        toast.error(result.error || 'Failed to delete tenants');
      }
    } catch (error) {
      console.error('Error deleting tenants:', error);
      toast.error('Failed to delete tenants');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  // Get selected tenant details for confirmation dialog
  const selectedTenants = useMemo(() => {
    return assignments.filter((a) => selectedIds.has(a.tenant_id));
  }, [assignments, selectedIds]);

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

  function formatLastActivity(lastActivity: string | null): string {
    if (!lastActivity) return 'Never';

    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
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

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <Card className="mb-4 border-primary/50 bg-primary/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === assignments.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="font-medium">
                  {selectedIds.size} tenant{selectedIds.size !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                        {/* Checkbox */}
                        <div className="sm:col-span-1 flex items-center justify-center">
                          <Checkbox
                            checked={selectedIds.has(assignment.tenant_id)}
                            onCheckedChange={() => toggleSelection(assignment.tenant_id)}
                          />
                        </div>

                        {/* Tenant */}
                        <div className="sm:col-span-2">
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
                        <div className="sm:col-span-2">
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
                        <div className="sm:col-span-1 sm:text-center">
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

                        {/* User/Member Counts */}
                        <div className="sm:col-span-2 flex items-center gap-3">
                          <div className="flex items-center gap-1 text-xs">
                            <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{assignment.user_count ?? 0}</span>
                            <span className="text-muted-foreground">users</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{assignment.member_count ?? 0}</span>
                            <span className="text-muted-foreground">members</span>
                          </div>
                        </div>

                        {/* Features */}
                        <div className="sm:col-span-1 sm:text-center">
                          <div className="flex sm:flex-col items-center sm:items-center gap-2 sm:gap-0">
                            <span className="font-semibold text-primary">{assignment.feature_count}</span>
                            <span className="text-xs text-muted-foreground">features</span>
                          </div>
                        </div>

                        {/* Last Activity */}
                        <div className="sm:col-span-1 sm:text-center">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{formatLastActivity(assignment.last_activity)}</span>
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedIds.size} Tenant{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  This action cannot be undone. The following tenants and ALL their data will be
                  permanently deleted:
                </p>

                <div className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 space-y-2">
                  {selectedTenants.map((tenant) => (
                    <div key={tenant.tenant_id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{tenant.tenant_name}</span>
                      <span className="text-muted-foreground">
                        {tenant.user_count ?? 0} users, {tenant.member_count ?? 0} members
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Users who only belong to these tenants will also be permanently deleted from the
                    authentication system.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Type <span className="font-bold text-destructive">DELETE</span> to confirm:
                  </label>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="font-mono"
                    autoComplete="off"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={confirmText !== 'DELETE' || isBulkDeleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedIds.size} Tenant{selectedIds.size !== 1 ? 's' : ''}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
