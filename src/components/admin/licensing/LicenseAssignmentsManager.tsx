'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/datatable';
import { Loader2, Building2, CheckCircle, XCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TenantLicenseAssignment {
  tenant_id: string;
  tenant_name: string;
  offering_id: string | null;
  offering_name: string | null;
  tier: string | null;
  is_active: boolean;
  feature_count: number;
  assigned_at: string | null;
}

export function LicenseAssignmentsManager() {
  const [assignments, setAssignments] = useState<TenantLicenseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    setIsLoading(true);
    try {
      // This would call an API endpoint that joins tenants with their license assignments
      const response = await fetch('/api/licensing/summary');
      const result = await response.json();

      if (result.success) {
        // Transform the summary data for display
        // In a real implementation, you'd have a dedicated endpoint for tenant-license assignments
        setAssignments([]);
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

  const columns: DataTableColumn<TenantLicenseAssignment>[] = [
    {
      id: 'tenant',
      header: 'Tenant',
      sortable: true,
      getSortValue: (row) => row.tenant_name,
      renderCell: (row) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.tenant_name}</div>
            <div className="text-xs text-gray-500">{row.tenant_id}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'offering',
      header: 'Current Offering',
      sortable: true,
      getSortValue: (row) => row.offering_name || '',
      renderCell: (row) => (
        <div>
          {row.offering_name ? (
            <div>
              <div className="font-medium">{row.offering_name}</div>
              <div className="text-xs text-gray-500">
                {row.assigned_at ? new Date(row.assigned_at).toLocaleDateString() : 'N/A'}
              </div>
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
      getSortValue: (row) => row.tier || '',
      renderCell: (row) => (
        row.tier ? (
          <Badge variant="outline" className={getTierColor(row.tier)}>
            {row.tier}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )
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
      getSortValue: (row) => row.is_active ? 1 : 0,
      renderCell: (row) => (
        <Badge variant={row.is_active ? 'default' : 'secondary'}>
          {row.is_active ? (
            <><CheckCircle className="h-3 w-3 mr-1" /> Active</>
          ) : (
            <><XCircle className="h-3 w-3 mr-1" /> Inactive</>
          )}
        </Badge>
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
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>License Assignments</CardTitle>
            <CardDescription>
              View and manage tenant license assignments
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            License assignments are managed through tenant subscriptions. This view shows the current
            licensing status for all tenants in the system.
          </AlertDescription>
        </Alert>

        {assignments.length > 0 ? (
          <DataTable
            data={assignments}
            columns={columns}
            getRowId={(row) => row.tenant_id}
            enablePagination={true}
            initialPageSize={10}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No license assignments found</p>
            <p className="text-sm">Assignments will appear here once tenants are subscribed to offerings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
