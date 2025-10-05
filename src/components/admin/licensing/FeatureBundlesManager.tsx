'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, DataTableColumn } from '@/components/ui/datatable';
import { Plus, Loader2, Pencil, Trash2, Package2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { LicenseFeatureBundleWithFeatures } from '@/models/licenseFeatureBundle.model';
import { CreateBundleDialog } from './CreateBundleDialog';
import { EditBundleDialog } from './EditBundleDialog';

export function FeatureBundlesManager() {
  const [bundles, setBundles] = useState<LicenseFeatureBundleWithFeatures[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingBundle, setEditingBundle] = useState<LicenseFeatureBundleWithFeatures | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    loadBundles();
  }, []);

  async function loadBundles() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/licensing/feature-bundles?withFeatures=true');
      const result = await response.json();

      if (result.success) {
        setBundles(result.data);
      } else {
        toast.error(result.error || 'Failed to load bundles');
      }
    } catch (error) {
      console.error('Error loading bundles:', error);
      toast.error('Failed to load bundles');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this bundle? This action cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/licensing/feature-bundles/${id}`, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Bundle deleted successfully');
        await loadBundles();
      } else {
        toast.error(result.error || 'Failed to delete bundle');
      }
    } catch (error) {
      console.error('Error deleting bundle:', error);
      toast.error('Failed to delete bundle');
    } finally {
      setDeletingId(null);
    }
  }

  function getBundleTypeColor(type: string) {
    switch (type) {
      case 'core':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'add-on':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'module':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'custom':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  const columns: DataTableColumn<LicenseFeatureBundleWithFeatures>[] = [
    {
      id: 'name',
      header: 'Name',
      sortable: true,
      getSortValue: (row) => row.name,
      renderCell: (row) => (
        <div className="flex items-center gap-2">
          <Package2 className="h-4 w-4 text-gray-400" />
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-gray-500">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Type',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.bundle_type,
      renderCell: (row) => (
        <Badge variant="outline" className={getBundleTypeColor(row.bundle_type)}>
          {row.bundle_type}
        </Badge>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      align: 'center',
      sortable: true,
      getSortValue: (row) => row.category,
      renderCell: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.category}
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
        <div className="flex flex-col gap-1 items-center">
          <Badge variant={row.is_active ? 'default' : 'secondary'}>
            {row.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {row.is_system && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs">
              <Shield className="h-3 w-3 mr-1" />
              System
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
            onClick={() => setEditingBundle(row)}
            title="Edit bundle"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={deletingId === row.id || row.is_system}
            onClick={() => handleDelete(row.id)}
            title={row.is_system ? 'System bundles cannot be deleted' : 'Delete bundle'}
          >
            {deletingId === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className={`h-4 w-4 ${row.is_system ? 'text-gray-300' : 'text-red-600'}`} />
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
              <CardTitle>Feature Bundles</CardTitle>
              <CardDescription>
                Manage reusable feature collections for product offerings
              </CardDescription>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bundles.length > 0 ? (
            <DataTable
              data={bundles}
              columns={columns}
              getRowId={(row) => row.id}
              enablePagination={true}
              initialPageSize={10}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Package2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No feature bundles found</p>
              <p className="text-sm">Create your first bundle to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateBundleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={loadBundles}
      />

      {editingBundle && (
        <EditBundleDialog
          bundle={editingBundle}
          open={!!editingBundle}
          onOpenChange={(open) => !open && setEditingBundle(null)}
          onSuccess={loadBundles}
        />
      )}
    </>
  );
}
