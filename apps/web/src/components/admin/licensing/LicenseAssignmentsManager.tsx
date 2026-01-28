'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { ColDef, GridReadyEvent, GridApi, ICellRendererParams } from 'ag-grid-community';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DataGrid } from '@/components/ui/datagrid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  PlusCircle,
  Users,
  Trash2,
  AlertTriangle,
  X,
  Search,
  Filter,
  Download,
  History,
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AssignLicenseDialog } from './AssignLicenseDialog';
import { LicenseHistoryPanel } from './LicenseHistoryPanel';
import { DeploymentActionsPanel } from './DeploymentActionsPanel';
import type { TenantForAssignment } from '@/models/licenseAssignment.model';
import {
  generateTenantDeletionReport,
  type TenantDeletionReportData,
  type DeletedTenantDetail,
} from '@/lib/pdf';
import { cn } from '@/lib/utils';

// Badge variants for tier display
const tierVariants: Record<string, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  critical: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
  neutral: 'bg-muted text-muted-foreground border-border/60',
};

export function LicenseAssignmentsManager() {
  const [assignments, setAssignments] = useState<TenantForAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | undefined>(undefined);
  const gridRef = useRef<GridApi | null>(null);

  // History dialog state
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyTenant, setHistoryTenant] = useState<{ id: string; name: string } | null>(null);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

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

  function handleViewHistory(tenantId: string, tenantName: string) {
    setHistoryTenant({ id: tenantId, name: tenantName });
    setHistoryDialogOpen(true);
  }

  // Selection handlers - sync with grid
  function toggleSelectAll() {
    if (!gridRef.current) return;
    if (selectedIds.size === filteredRows.length) {
      gridRef.current.deselectAll();
    } else {
      gridRef.current.selectAll();
    }
  }

  function clearSelection() {
    if (gridRef.current) {
      gridRef.current.deselectAll();
    }
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
            total_failed: selectedTenants.length - (result.data?.total_tenants_deleted || 0),
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

  // Export to CSV
  const handleExport = useCallback(() => {
    if (!gridRef.current) {
      toast.error('Grid not ready');
      return;
    }
    gridRef.current.exportDataAsCsv({
      fileName: `license-assignments-${new Date().toISOString().split('T')[0]}.csv`,
      skipColumnGroupHeaders: true,
      columnKeys: ['tenant_name', 'tenant_subdomain', 'current_offering_name', 'current_offering_tier', 'user_count', 'member_count', 'feature_count', 'last_activity'],
    });
    toast.success('Data exported successfully');
  }, []);

  // Filter rows based on search and tier
  const filteredRows = useMemo(() => {
    return assignments.filter((assignment) => {
      // Search filter
      if (searchText) {
        const search = searchText.toLowerCase();
        const matchesName = assignment.tenant_name.toLowerCase().includes(search);
        const matchesSubdomain = assignment.tenant_subdomain.toLowerCase().includes(search);
        if (!matchesName && !matchesSubdomain) return false;
      }

      // Tier filter
      if (tierFilter !== 'all') {
        if (assignment.current_offering_tier?.toLowerCase() !== tierFilter.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, searchText, tierFilter]);

  // Get selected tenant details for confirmation dialog
  const selectedTenants = useMemo(() => {
    return assignments.filter((a) => selectedIds.has(a.tenant_id));
  }, [assignments, selectedIds]);

  // Count tenants without an assigned offering
  const tenantsWithNoOffering = useMemo(() => {
    return assignments.filter((a) => !a.current_offering_id && a.feature_count > 0).length;
  }, [assignments]);

  // Get tier variant for badge styling
  const getTierVariant = (tier: string | null): string => {
    if (!tier) return 'neutral';
    switch (tier.toLowerCase()) {
      case 'starter':
        return 'success';
      case 'professional':
        return 'info';
      case 'enterprise':
        return 'critical';
      default:
        return 'neutral';
    }
  };

  // Get initials for avatar fallback
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  // Truncate long names
  const truncateName = (name: string, maxLength: number = 30): string => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Format last activity date
  const formatLastActivity = (lastActivity: string | null): string => {
    if (!lastActivity) return 'Never';
    const date = new Date(lastActivity);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Grid column definitions
  const columnDefs = useMemo((): ColDef[] => [
    {
      field: 'selection',
      headerName: '',
      width: 50,
      sortable: false,
      filter: false,
      resizable: false,
      headerCheckboxSelection: true,
      checkboxSelection: true,
      showDisabledCheckboxes: true,
    },
    {
      field: 'tenant_name',
      headerName: 'Tenant',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const data = params.data as TenantForAssignment;
        return (
          <div className="flex items-center gap-3 py-1">
            <Avatar className="h-9 w-9 border-2 border-background shadow-sm ring-1 ring-border/40">
              <AvatarImage src={data.tenant_logo_url || undefined} alt={data.tenant_name} className="object-cover" />
              <AvatarFallback className="text-xs font-semibold uppercase bg-primary/10 text-primary">
                {getInitials(data.tenant_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-foreground truncate">
                {data.tenant_name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {data.tenant_subdomain}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'current_offering_name',
      headerName: 'Offering',
      flex: 1,
      minWidth: 150,
      valueFormatter: (params) => params.value || 'No offering assigned',
    },
    {
      field: 'current_offering_tier',
      headerName: 'Tier',
      width: 130,
      cellRenderer: (params: ICellRendererParams) => {
        const tier = params.value as string | null;
        if (!tier) {
          return <span className="text-muted-foreground">-</span>;
        }
        const variant = getTierVariant(tier);
        return (
          <Badge variant="outline" className={cn('border font-medium', tierVariants[variant])}>
            {tier}
          </Badge>
        );
      },
    },
    {
      field: 'user_count',
      headerName: 'Users',
      width: 90,
      type: 'numericColumn',
      cellClass: 'text-center',
      headerClass: 'ag-header-cell-center',
    },
    {
      field: 'member_count',
      headerName: 'Members',
      width: 100,
      type: 'numericColumn',
      cellClass: 'text-center',
      headerClass: 'ag-header-cell-center',
    },
    {
      field: 'feature_count',
      headerName: 'Features',
      width: 100,
      type: 'numericColumn',
      cellClass: 'text-center',
      headerClass: 'ag-header-cell-center',
    },
    {
      field: 'last_activity',
      headerName: 'Last Activity',
      width: 130,
      valueFormatter: (params) => formatLastActivity(params.value),
      comparator: (a, b) => {
        const dateA = a ? new Date(a).getTime() : 0;
        const dateB = b ? new Date(b).getTime() : 0;
        return dateA - dateB;
      },
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: 'right',
      cellRenderer: (params: ICellRendererParams) => {
        const data = params.data as TenantForAssignment;
        const hasOffering = !!data.current_offering_name;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                handleViewHistory(data.tenant_id, data.tenant_name);
              }}
            >
              <History className="h-3.5 w-3.5" />
              History
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                handleChangeLicense(data.tenant_id);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {hasOffering ? 'Change' : 'Assign'}
            </Button>
          </div>
        );
      },
    },
  ], []);

  // Grid ready handler
  const onGridReady = useCallback((event: GridReadyEvent) => {
    gridRef.current = event.api;
  }, []);

  // Selection changed handler
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current) return;
    const selectedNodes = gridRef.current.getSelectedNodes();
    const newSelectedIds = new Set<string>(
      selectedNodes.map((node) => (node.data as TenantForAssignment).tenant_id)
    );
    setSelectedIds(newSelectedIds);
  }, []);

  // Clear selection when filters change to avoid stale selections
  useEffect(() => {
    if (gridRef.current && selectedIds.size > 0) {
      // Keep only selections that are still in filtered rows
      const filteredTenantIds = new Set(filteredRows.map((r) => r.tenant_id));
      const validSelections = Array.from(selectedIds).filter((id) => filteredTenantIds.has(id));

      if (validSelections.length !== selectedIds.size) {
        // Some selections are no longer visible, clear them from grid
        gridRef.current.forEachNode((node) => {
          const tenantId = (node.data as TenantForAssignment).tenant_id;
          if (validSelections.includes(tenantId)) {
            node.setSelected(true, false, 'api');
          } else {
            node.setSelected(false, false, 'api');
          }
        });
        setSelectedIds(new Set(validSelections));
      }
    }
  }, [filteredRows]); // eslint-disable-line react-hooks/exhaustive-deps

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
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredRows.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
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

      {/* Main Grid Card */}
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
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredRows.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleAssignNew}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Assign New License
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between pb-4 border-b border-border/40 mb-4">
            <div className="flex flex-1 flex-wrap gap-3">
              {/* Search */}
              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px] max-w-sm">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Search className="h-3 w-3" />
                  Search tenants
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="Search by name or subdomain..."
                    className="h-9 pl-9 text-sm bg-background/50 border-border/60"
                  />
                </div>
              </div>

              {/* Tier Filter */}
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3 w-3" />
                  Tier
                </label>
                <Select value={tierFilter} onValueChange={setTierFilter}>
                  <SelectTrigger className="h-9 text-sm bg-background/50 border-border/60">
                    <SelectValue placeholder="All Tiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear filters */}
            {(searchText || tierFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchText('');
                  setTierFilter('all');
                }}
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Button>
            )}
          </div>

          {/* AG Grid */}
          {filteredRows.length > 0 ? (
            <DataGrid
              rowData={filteredRows}
              columnDefs={columnDefs}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              getRowId={(params) => params.data.tenant_id}
              pagination={true}
              paginationPageSize={25}
              paginationPageSizeSelector={[10, 25, 50, 100]}
              rowHeight={64}
              headerHeight={48}
              rowSelection="multiple"
              suppressRowClickSelection={true}
              domLayout="autoHeight"
              animateRows
              suppressCellFocus
              enableCellTextSelection
              ensureDomOrder
              className="min-h-[300px]"
              style={{ width: '100%' }}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-8 sm:p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
                  <Users className="h-6 w-6 text-muted-foreground/60" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {assignments.length === 0 ? 'No tenants found' : 'No matching tenants'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    {assignments.length === 0
                      ? 'Assignments will appear here once tenants are created'
                      : 'Adjust your filters to see a different segment of the data.'}
                  </p>
                </div>
                {(searchText || tierFilter !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 gap-1.5"
                    onClick={() => {
                      setSearchText('');
                      setTierFilter('all');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear all filters
                  </Button>
                )}
              </div>
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

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>License History - {historyTenant?.name}</DialogTitle>
          </DialogHeader>
          {historyTenant && (
            <LicenseHistoryPanel
              tenantId={historyTenant.id}
              tenantName={historyTenant.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete {selectedIds.size} Tenant{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The following tenants and ALL their data will be
              permanently deleted:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-2">
              {selectedTenants.map((tenant) => (
                <div key={tenant.tenant_id} className="flex justify-between items-center text-sm">
                  <span className="font-medium" title={tenant.tenant_name}>
                    {truncateName(tenant.tenant_name)}
                  </span>
                  <span className="text-muted-foreground text-xs">
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
