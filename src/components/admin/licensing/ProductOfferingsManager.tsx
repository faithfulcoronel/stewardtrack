'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/datatable';
import { Plus, Loader2, Pencil, Trash2, Package } from 'lucide-react';
import { toast } from 'sonner';
import { ProductOfferingComplete } from '@/models/productOffering.model';
import { LicenseTier, LicenseTierColors, LicenseTierLabels } from '@/enums/licensing.enums';

export function ProductOfferingsManager() {
  const [offerings, setOfferings] = useState<ProductOfferingComplete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadOfferings();
  }, []);

  async function loadOfferings() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/licensing/product-offerings?complete=true');
      const result = await response.json();

      if (result.success) {
        setOfferings(result.data);
      } else {
        toast.error(result.error || 'Failed to load offerings');
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      toast.error('Failed to load offerings');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this offering? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/licensing/product-offerings/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Offering deleted successfully');
        await loadOfferings();
      } else {
        toast.error(result.error || 'Failed to delete offering');
      }
    } catch (error) {
      console.error('Error deleting offering:', error);
      toast.error('Failed to delete offering');
    } finally {
      setDeletingId(null);
    }
  }

  function getTierColor(tier: string) {
    const normalizedTier = tier.toLowerCase() as LicenseTier;
    if (normalizedTier in LicenseTierColors) {
      return LicenseTierColors[normalizedTier];
    }
    return 'bg-gray-100 text-gray-800';
  }

  function getTierLabel(tier: string) {
    const normalizedTier = tier.toLowerCase() as LicenseTier;
    if (normalizedTier in LicenseTierLabels) {
      return LicenseTierLabels[normalizedTier];
    }
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  }

  const columns: DataTableColumn<ProductOfferingComplete>[] = [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      getSortValue: (row) => row.name,
      renderCell: (row) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-gray-500">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'tier',
      header: 'Tier',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.tier,
      renderCell: (row) => (
        <Badge variant="outline" className={getTierColor(row.tier)}>
          {getTierLabel(row.tier)}
        </Badge>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.offering_type,
      renderCell: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.offering_type}
        </Badge>
      ),
    },
    {
      id: 'features',
      header: 'Features',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.feature_count || 0,
      renderCell: (row) => (
        <div className="text-center">
          <div className="font-medium">{row.feature_count || 0}</div>
          <div className="text-xs text-gray-500">
            {row.bundle_count || 0} {row.bundle_count === 1 ? 'bundle' : 'bundles'}
          </div>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      align: 'right',
      sortable: true,
      getSortValue: (row) => row.base_price || 0,
      renderCell: (row) => (
        <div className="text-right">
          {row.base_price !== null && row.base_price !== undefined ? (
            <div>
              <div className="font-medium">
                ${row.base_price.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {row.billing_cycle || 'N/A'}
              </div>
            </div>
          ) : (
            <span className="text-gray-400">Custom</span>
          )}
        </div>
      ),
    },
    {
      id: 'limits',
      header: 'Limits',
      align: 'center',
      renderCell: (row) => (
        <div className="text-sm">
          <div>Users: {row.max_users || 'Unlimited'}</div>
          <div className="text-xs text-gray-500">
            Tenants: {row.max_tenants || 'Unlimited'}
          </div>
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
        <div className="flex flex-col gap-1 items-center">
          <Badge variant={row.is_active ? 'default' : 'secondary'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {row.is_featured && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
              Featured
            </Badge>
          )}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      align: 'center',
      renderCell: (row) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/admin/licensing/offerings/${row.id}/edit`)}
            title="Edit offering"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={deletingId === row.id}
            onClick={() => handleDelete(row.id)}
            title="Delete offering"
          >
            {deletingId === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4 text-red-600" />
            )}
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
              <CardTitle>Product Offerings</CardTitle>
              <CardDescription>
                Manage subscription plans and pricing tiers
              </CardDescription>
            </div>
            <Button onClick={() => router.push('/admin/licensing/offerings/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Offering
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {offerings.length > 0 ? (
            <DataTable
              data={offerings}
              columns={columns}
              getRowId={(row) => row.id}
              enablePagination={true}
              initialPageSize={10}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No product offerings found</p>
              <p className="text-sm">Create your first offering to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

    </>
  );
}
