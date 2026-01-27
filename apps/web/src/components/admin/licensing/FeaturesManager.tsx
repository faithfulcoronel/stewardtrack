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
  Download,
  Upload,
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
import {
  generateFeatureImportReport,
  type FeatureImportReportData,
  type FeatureDetail,
  type PermissionDetail,
  type RoleTemplateDetail,
} from '@/lib/pdf';


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

  // Import/Export state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    success: boolean;
    data: {
      features: number;
      permissions: number;
      roleTemplates: number;
      breakdown: {
        features: { add: number; update: number; delete: number };
        permissions: { add: number; update: number; delete: number };
        roleTemplates: { add: number; update: number; delete: number };
      };
    };
    details?: {
      features: FeatureDetail[];
      permissions: PermissionDetail[];
      roleTemplates: RoleTemplateDetail[];
    };
    errors: Array<{ sheet: string; row: number; field: string; message: string }>;
  } | null>(null);
  // Import result errors (strings from database RPC)
  const [importResultErrors, setImportResultErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{
    features_added: number;
    features_updated: number;
    features_deleted: number;
    permissions_added: number;
    permissions_updated: number;
    permissions_deleted: number;
    role_templates_added: number;
    role_templates_updated: number;
    role_templates_deleted: number;
  } | null>(null);
  // Store report data for re-download
  const [importReportData, setImportReportData] = useState<FeatureImportReportData | null>(null);

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

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const response = await fetch('/api/licensing/features/import');
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to download template');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `features-import-template-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to download template');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsImporting(true);
    setImportPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('preview', 'true');

      const response = await fetch('/api/licensing/features/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setImportPreview(data);
    } catch (error) {
      console.error('Error previewing import:', error);
      toast.error('Failed to preview import file');
    } finally {
      setIsImporting(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportResultErrors([]);
    setImportResult(null);
    setImportReportData(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('preview', 'false');

      const response = await fetch('/api/licensing/features/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // Build report data for PDF generation
      const buildReportData = (resultData: typeof data.data, errors: string[]): FeatureImportReportData => {
        const hasErrors = errors.length > 0;
        const hasAnyChanges = resultData && (
          resultData.features_added > 0 ||
          resultData.features_updated > 0 ||
          resultData.features_deleted > 0 ||
          resultData.permissions_added > 0 ||
          resultData.permissions_updated > 0 ||
          resultData.permissions_deleted > 0 ||
          resultData.role_templates_added > 0 ||
          resultData.role_templates_updated > 0 ||
          resultData.role_templates_deleted > 0
        );

        let status: 'success' | 'partial' | 'failed' = 'failed';
        if (!hasErrors && hasAnyChanges) {
          status = 'success';
        } else if (hasErrors && hasAnyChanges) {
          status = 'partial';
        }

        return {
          sourceFile: importFile.name,
          importDate: new Date(),
          status,
          summary: {
            features: {
              added: resultData?.features_added || 0,
              updated: resultData?.features_updated || 0,
              deleted: resultData?.features_deleted || 0,
            },
            permissions: {
              added: resultData?.permissions_added || 0,
              updated: resultData?.permissions_updated || 0,
              deleted: resultData?.permissions_deleted || 0,
            },
            roleTemplates: {
              added: resultData?.role_templates_added || 0,
              updated: resultData?.role_templates_updated || 0,
              deleted: resultData?.role_templates_deleted || 0,
            },
          },
          errors,
          // Include detailed items from the preview for the PDF report
          details: importPreview?.details,
        };
      };

      if (data.success) {
        // Generate PDF report for successful import
        const reportData = buildReportData(data.data, []);
        setImportReportData(reportData);
        generateFeatureImportReport(reportData);

        toast.success(data.message || 'Import completed successfully. Report downloaded.');
        setImportDialogOpen(false);
        setImportFile(null);
        setImportPreview(null);
        setImportResultErrors([]);
        setImportResult(null);
        setImportReportData(null);
        fetchFeatures();
      } else {
        // Store import result data to show partial success
        if (data.data) {
          setImportResult(data.data);
        }

        // Handle import result errors (array of strings from RPC)
        if (data.errors && Array.isArray(data.errors)) {
          setImportResultErrors(data.errors);

          // Generate PDF report for partial failure
          const reportData = buildReportData(data.data, data.errors);
          setImportReportData(reportData);
          generateFeatureImportReport(reportData);

          const errorCount = data.errors.length;
          toast.error(`Import completed with ${errorCount} error${errorCount > 1 ? 's' : ''}. Report downloaded.`);
        } else {
          toast.error(data.error || 'Import failed');
        }
      }
    } catch (error) {
      console.error('Error executing import:', error);
      toast.error('Failed to execute import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportPreview(null);
    setImportResultErrors([]);
    setImportResult(null);
    setImportReportData(null);
  };

  const handleDownloadReport = () => {
    if (importReportData) {
      generateFeatureImportReport(importReportData);
      toast.success('Report downloaded');
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
            >
              {isDownloadingTemplate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Template
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button onClick={() => router.push('/admin/licensing/features/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Feature
            </Button>
          </div>
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

    {/* Import Dialog */}
    <AlertDialog open={importDialogOpen} onOpenChange={handleCloseImportDialog}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Import Features</AlertDialogTitle>
          <AlertDialogDescription>
            Upload an Excel file to import features, permissions, and role templates.
            Download the template first to see the required format.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="mb-4">
            <label htmlFor="import-file" className="sr-only">Choose file</label>
            <Input
              id="import-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>

          {isImporting && !importPreview && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2">Analyzing file...</span>
            </div>
          )}

          {importPreview && (
            <div className="space-y-4">
              {/* Preview Summary */}
              <div className="rounded-lg border p-4">
                <h4 className="font-medium mb-3">Import Preview</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Features</p>
                    <p className="font-medium">{importPreview.data.features} total</p>
                    <div className="text-xs text-muted-foreground">
                      +{importPreview.data.breakdown.features.add} add,
                      ~{importPreview.data.breakdown.features.update} update,
                      -{importPreview.data.breakdown.features.delete} delete
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Permissions</p>
                    <p className="font-medium">{importPreview.data.permissions} total</p>
                    <div className="text-xs text-muted-foreground">
                      +{importPreview.data.breakdown.permissions.add} add,
                      ~{importPreview.data.breakdown.permissions.update} update,
                      -{importPreview.data.breakdown.permissions.delete} delete
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Role Templates</p>
                    <p className="font-medium">{importPreview.data.roleTemplates} total</p>
                    <div className="text-xs text-muted-foreground">
                      +{importPreview.data.breakdown.roleTemplates.add} add,
                      ~{importPreview.data.breakdown.roleTemplates.update} update,
                      -{importPreview.data.breakdown.roleTemplates.delete} delete
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Errors (from preview) */}
              {importPreview.errors.length > 0 && (
                <div className="rounded-lg border border-destructive p-4">
                  <h4 className="font-medium text-destructive mb-2">
                    Validation Errors ({importPreview.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                    {importPreview.errors.map((error, index) => (
                      <div key={index} className="text-destructive">
                        <span className="font-medium">{error.sheet}</span> Row {error.row}:
                        {error.field} - {error.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Result Errors (from actual import) */}
              {importResultErrors.length > 0 && (
                <div className="rounded-lg border border-destructive p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-destructive">
                      Import Errors ({importResultErrors.length})
                    </h4>
                    {importReportData && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadReport}
                      >
                        <Download className="mr-2 h-3 w-3" />
                        Download Report
                      </Button>
                    )}
                  </div>
                  {importResult && (
                    <div className="mb-3 text-sm text-muted-foreground border-b pb-2">
                      <span className="font-medium">Partial result: </span>
                      {importResult.features_added > 0 && `${importResult.features_added} features added, `}
                      {importResult.features_updated > 0 && `${importResult.features_updated} features updated, `}
                      {importResult.permissions_added > 0 && `${importResult.permissions_added} permissions added, `}
                      {importResult.permissions_updated > 0 && `${importResult.permissions_updated} permissions updated, `}
                      {importResult.role_templates_added > 0 && `${importResult.role_templates_added} role templates added, `}
                      {importResult.role_templates_updated > 0 && `${importResult.role_templates_updated} role templates updated`}
                    </div>
                  )}
                  <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                    {importResultErrors.map((error, index) => (
                      <div key={index} className="text-destructive">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Success indicator */}
              {importPreview.success && importPreview.errors.length === 0 && (
                <div className="rounded-lg border border-green-500 bg-green-50 p-4">
                  <div className="flex items-center text-green-700">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    <span className="font-medium">File validated successfully</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isImporting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleExecuteImport}
            disabled={isImporting || !importPreview || !importPreview.success || importPreview.errors.length > 0}
          >
            {isImporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
