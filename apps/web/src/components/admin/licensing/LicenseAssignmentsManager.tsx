'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/datatable';
import { Loader2, Building2, CheckCircle, XCircle, PlusCircle, Edit2, History } from 'lucide-react';
import { toast } from 'sonner';
import { AssignLicenseDialog } from './AssignLicenseDialog';
import { LicenseHistoryPanel } from './LicenseHistoryPanel';
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

  function getTierColor(tier: string | null) {
    if (!tier) return 'bg-gray-100 text-gray-800 border-gray-200';

    switch (tier.toLowerCase()) {
      case 'starter':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'professional':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getStatusColor(status: string) {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'suspended':
        return 'destructive';
      default:
        return 'secondary';
    }
  }

  const columns: DataTableColumn<TenantForAssignment>[] = [
    {
      id: 'tenant',
      header: 'Church',
      sortable: true,
      getSortValue: (row) => row.tenant_name,
      renderCell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.tenant_name}</div>
            <div className="text-xs text-gray-500">{row.tenant_subdomain}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'offering',
      header: 'Current Offering',
      sortable: true,
      getSortValue: (row) => row.current_offering_name || '',
      renderCell: (row) => (
        <div>
          {row.current_offering_name ? (
            <div>
              <div className="font-medium">{row.current_offering_name}</div>
              {row.last_assignment_date && (
                <div className="text-xs text-gray-500">
                  Assigned {new Date(row.last_assignment_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ) : (
            <span className="text-gray-400">No offering assigned</span>
          )}
        </div>
      ),
    },
    {
      id: 'tier',
      header: 'Tier',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.current_offering_tier || '',
      renderCell: (row) =>
        row.current_offering_tier ? (
          <Badge variant="outline" className={getTierColor(row.current_offering_tier)}>
            {row.current_offering_tier}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      id: 'features',
      header: 'Active Features',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.feature_count,
      renderCell: (row) => (
        <div className="text-center">
          <div className="font-medium">{row.feature_count}</div>
          <div className="text-xs text-gray-500">features</div>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.subscription_status,
      renderCell: (row) => (
        <Badge variant={getStatusColor(row.subscription_status)}>
          {row.subscription_status === 'active' ? (
            <CheckCircle className="h-3 w-3 mr-1" />
          ) : (
            <XCircle className="h-3 w-3 mr-1" />
          )}
          {row.subscription_status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'right',
      renderCell: (row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleHistory(row.tenant_id)}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleChangeLicense(row.tenant_id)}
          >
            <Edit2 className="h-4 w-4 mr-1" />
            {row.current_offering_name ? 'Change' : 'Assign'}
          </Button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>License Assignments</CardTitle>
              <CardDescription>
                View and manage tenant license assignments
              </CardDescription>
            </div>
            <Button onClick={handleAssignNew}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Assign New License
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length > 0 ? (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <Collapsible
                  key={assignment.tenant_id}
                  open={expandedTenantId === assignment.tenant_id}
                  onOpenChange={() => toggleHistory(assignment.tenant_id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    {/* Main row */}
                    <div className="p-4 bg-white hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* Tenant */}
                        <div className="col-span-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{assignment.tenant_name}</div>
                              <div className="text-xs text-gray-500">
                                {assignment.tenant_subdomain}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Offering */}
                        <div className="col-span-3">
                          {assignment.current_offering_name ? (
                            <div>
                              <div className="font-medium">{assignment.current_offering_name}</div>
                              {assignment.last_assignment_date && (
                                <div className="text-xs text-gray-500">
                                  Assigned{' '}
                                  {new Date(assignment.last_assignment_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No offering assigned</span>
                          )}
                        </div>

                        {/* Tier */}
                        <div className="col-span-2 text-center">
                          {assignment.current_offering_tier ? (
                            <Badge
                              variant="outline"
                              className={getTierColor(assignment.current_offering_tier)}
                            >
                              {assignment.current_offering_tier}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>

                        {/* Features */}
                        <div className="col-span-2 text-center">
                          <div className="font-medium">{assignment.feature_count}</div>
                          <div className="text-xs text-gray-500">features</div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-end gap-2">
                          <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm">
                              <History className="h-4 w-4 mr-1" />
                              History
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
                      <div className="border-t bg-gray-50 p-4">
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
            <div className="text-center py-12 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No tenants found</p>
              <p className="text-sm">Assignments will appear here once tenants are created</p>
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
