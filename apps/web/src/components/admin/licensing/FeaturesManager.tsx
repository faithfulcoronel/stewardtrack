'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Plus,
  Search,
  Eye,
  Trash2,
  Filter,
  MoreVertical,
  Loader2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import {
  LicenseTier,
  LicenseTierLabels,
  LicenseTierColors,
  FeatureCategory,
  FeatureCategoryLabels,
  normalizeFeatureCategory
} from '@/enums/licensing.enums';
import {
  getEnumValues
} from '@/enums/helpers';


interface Feature {
  id: string;
  name: string;
  description: string;
  tier?: string | null;
  category: string;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_TIER_BADGE = 'bg-gray-100 text-gray-600';
const DEFAULT_TIER_LABEL = 'Not set';

const getTierPresentation = (tier?: string | null) => {
  if (!tier) {
    return { className: DEFAULT_TIER_BADGE, label: DEFAULT_TIER_LABEL };
  }

  const normalizedTier = tier.trim().toLowerCase() as LicenseTier;

  if (!normalizedTier) {
    return { className: DEFAULT_TIER_BADGE, label: DEFAULT_TIER_LABEL };
  }

  const className = LicenseTierColors[normalizedTier] || 'bg-gray-100 text-gray-800';
  const label = LicenseTierLabels[normalizedTier] || tier.charAt(0).toUpperCase() + tier.slice(1);

  return { className, label };
};

const getCategoryLabel = (category: string): string => {
  const normalizedCategory = normalizeFeatureCategory(category) as FeatureCategory;
  return FeatureCategoryLabels[normalizedCategory] || category.charAt(0).toUpperCase() + category.slice(1);
};

export function FeaturesManager() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState<Feature | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    fetchFeatures();
  }, [statusFilter]);

  useEffect(() => {
    filterFeatures();
  }, [features, searchTerm, tierFilter, categoryFilter]);

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [statusFilter, tierFilter, categoryFilter, searchTerm]);

  const fetchFeatures = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/licensing/features?status=${statusFilter}`);
      if (response.ok) {
        const data = await response.json();
        setFeatures(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterFeatures = () => {
    let filtered = [...features];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(term) ||
          f.description.toLowerCase().includes(term) ||
          f.category.toLowerCase().includes(term)
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((f) => f.tier === tierFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((f) => normalizeFeatureCategory(f.category) === categoryFilter);
    }

    setFilteredFeatures(filtered);
  };

  // Multi-select handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredFeatures.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFeatures.map((f) => f.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const openBulkActionDialog = (action: 'activate' | 'deactivate') => {
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    setIsBulkUpdating(true);
    try {
      const response = await fetch('/api/licensing/features/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { is_active: bulkAction === 'activate' },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || `Successfully ${bulkAction}d ${selectedIds.size} feature(s)`);
        setSelectedIds(new Set());
        fetchFeatures();
      } else {
        toast.error(data.error || `Failed to ${bulkAction} features`);
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error(`An error occurred while ${bulkAction === 'activate' ? 'activating' : 'deactivating'} features`);
    } finally {
      setIsBulkUpdating(false);
      setBulkActionDialogOpen(false);
      setBulkAction(null);
    }
  };

  const openDeleteDialog = (feature: Feature) => {
    setFeatureToDelete(feature);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!featureToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/licensing/features/${featureToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Feature deleted successfully');
        setDeleteDialogOpen(false);
        setFeatureToDelete(null);
        fetchFeatures();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete feature');
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      toast.error('An error occurred while deleting the feature');
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Features with Permissions</CardTitle>
            <CardDescription>
              Manage features and their permission definitions
            </CardDescription>
          </div>
          <Button onClick={() => router.push('/admin/licensing/features/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Feature
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="all">All Status</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              {getEnumValues(LicenseTier).map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {LicenseTierLabels[tier as LicenseTier]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {getEnumValues(FeatureCategory).map((category) => (
                <SelectItem key={category} value={category}>
                  {FeatureCategoryLabels[category as FeatureCategory]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-muted rounded-md">
            <span className="text-sm font-medium">
              {selectedIds.size} feature{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkActionDialog('activate')}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openBulkActionDialog('deactivate')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Deactivate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading features...</p>
          </div>
        ) : filteredFeatures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No features found</p>
            {features.length === 0 && (
              <Button
                variant="outline"
                onClick={() => router.push('/admin/licensing/features/create')}
                className="mt-4"
              >
                Create your first feature
              </Button>
            )}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        filteredFeatures.length > 0 &&
                        selectedIds.size === filteredFeatures.length
                      }
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeatures.map((feature) => {
                  const { className: tierClassName, label: tierLabel } =
                    getTierPresentation(feature.tier);
                  const isSelected = selectedIds.has(feature.id);

                  return (
                    <TableRow
                      key={feature.id}
                      className={isSelected ? 'bg-muted/50' : undefined}
                    >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectOne(feature.id)}
                        aria-label={`Select ${feature.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{feature.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {feature.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getCategoryLabel(feature.category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={tierClassName}>{tierLabel}</Badge>
                    </TableCell>
                    <TableCell>
                      {feature.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/licensing/features/${feature.id}`)
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View & Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(feature)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Results Count */}
        {!isLoading && filteredFeatures.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredFeatures.length} of {features.length} feature(s)
          </div>
        )}
      </CardContent>
    </Card>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Feature</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the feature &quot;{featureToDelete?.name}&quot;?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Bulk Action Confirmation Dialog */}
    <AlertDialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {bulkAction === 'activate' ? 'Activate Features' : 'Deactivate Features'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to {bulkAction} {selectedIds.size} feature{selectedIds.size > 1 ? 's' : ''}?
            {bulkAction === 'deactivate' && (
              <span className="block mt-2 text-amber-600">
                Deactivated features will not be available in the licensing system.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBulkUpdating}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkAction}
            disabled={isBulkUpdating}
          >
            {isBulkUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {bulkAction === 'activate' ? 'Activating...' : 'Deactivating...'}
              </>
            ) : (
              bulkAction === 'activate' ? 'Activate' : 'Deactivate'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
