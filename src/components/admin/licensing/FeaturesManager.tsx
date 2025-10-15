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
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Filter,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LicenseTier,
  LicenseTierLabels,
  LicenseTierColors,
  FeatureModule,
  FeatureModuleLabels,
  SurfaceType,
  SurfaceTypeLabels,
  getEnumValues,
} from '@/enums/licensing.enums';

interface Feature {
  id: string;
  name: string;
  description: string;
  tier?: string | null;
  category: string;
  surface_id?: string | null;
  surface_type?: string | null;
  module?: string | null;
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

export function FeaturesManager() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: '',
    category: '',
    surface_id: '',
    surface_type: '',
    module: '',
  });

  useEffect(() => {
    fetchFeatures();
  }, []);

  useEffect(() => {
    filterFeatures();
  }, [features, searchTerm, tierFilter, moduleFilter]);

  const fetchFeatures = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/licensing/features');
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
          f.surface_id?.toLowerCase().includes(term)
      );
    }

    // Tier filter
    if (tierFilter !== 'all') {
      filtered = filtered.filter((f) => f.tier === tierFilter);
    }

    // Module filter
    if (moduleFilter !== 'all') {
      filtered = filtered.filter((f) => f.module === moduleFilter);
    }

    setFilteredFeatures(filtered);
  };

  const handleEdit = (feature: Feature) => {
    setEditingFeature(feature);
    setFormData({
      name: feature.name,
      description: feature.description,
      tier: feature.tier || '',
      category: feature.category,
      surface_id: feature.surface_id || '',
      surface_type: feature.surface_type || '',
      module: feature.module || '',
    });
    setError(null);
    setSuccess(null);
    setIsEditDialogOpen(true);
  };

  const handleSaveFeature = async () => {
    if (!editingFeature) return;

    // Validation
    if (!formData.name.trim()) {
      setError('Feature name is required');
      return;
    }

    if (!formData.tier) {
      setError('License tier is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/licensing/features/${editingFeature.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tier: formData.tier,
          category: formData.category,
          surface_id: formData.surface_id || null,
          surface_type: formData.surface_type || null,
          module: formData.module || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update feature');
      }

      setSuccess('Feature updated successfully');
      await fetchFeatures();

      // Close dialog after a short delay to show success message
      setTimeout(() => {
        setIsEditDialogOpen(false);
        setEditingFeature(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (featureId: string) => {
    if (!confirm('Are you sure you want to delete this feature?')) {
      return;
    }

    try {
      const response = await fetch(`/api/licensing/features/${featureId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchFeatures();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete feature');
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('An error occurred while deleting the feature');
    }
  };

  const uniqueModules = Array.from(
    new Set(
      features
        .map((f) => f.module?.trim())
        .filter((module): module is string => Boolean(module))
    )
  ).sort();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Features with Permissions</CardTitle>
            <CardDescription>
              Manage features with surface IDs and permission definitions
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
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
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
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All modules" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modules</SelectItem>
              {uniqueModules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module.charAt(0).toUpperCase() + module.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                  <TableHead>Name</TableHead>
                  <TableHead>Surface ID</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFeatures.map((feature) => {
                  const { className: tierClassName, label: tierLabel } =
                    getTierPresentation(feature.tier);

                  return (
                    <TableRow key={feature.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{feature.name}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {feature.description}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs">{feature.surface_id || 'N/A'}</code>
                    </TableCell>
                    <TableCell>
                      {feature.module ? (
                        <Badge variant="outline" className="capitalize">
                          {feature.module}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
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
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(feature)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Feature
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/admin/licensing/features/${feature.id}/permissions`
                              )
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Manage Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(feature.id)}
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

      {/* Edit Feature Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
            <DialogDescription>
              Update the feature details below. Changes will be reflected immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Feature Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Feature Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Advanced Member Analytics"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe what this feature does..."
                rows={3}
              />
            </div>

            {/* License Tier */}
            <div className="space-y-2">
              <Label htmlFor="tier">
                License Tier <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.tier}
                onValueChange={(value) => setFormData({ ...formData, tier: value })}
              >
                <SelectTrigger id="tier">
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  {getEnumValues(LicenseTier).map((tier) => (
                    <SelectItem key={tier} value={tier}>
                      {LicenseTierLabels[tier as LicenseTier]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., analytics, reporting, communication"
              />
            </div>

            {/* Module */}
            <div className="space-y-2">
              <Label htmlFor="module">Module</Label>
              <Select
                value={formData.module}
                onValueChange={(value) => setFormData({ ...formData, module: value })}
              >
                <SelectTrigger id="module">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent>
                  {getEnumValues(FeatureModule).map((module) => (
                    <SelectItem key={module} value={module}>
                      {FeatureModuleLabels[module as FeatureModule]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Surface ID */}
            <div className="space-y-2">
              <Label htmlFor="surface_id">Surface ID</Label>
              <Input
                id="surface_id"
                value={formData.surface_id}
                onChange={(e) => setFormData({ ...formData, surface_id: e.target.value })}
                placeholder="e.g., members/analytics-dashboard"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for the UI surface this feature controls
              </p>
            </div>

            {/* Surface Type */}
            <div className="space-y-2">
              <Label htmlFor="surface_type">Surface Type</Label>
              <Select
                value={formData.surface_type}
                onValueChange={(value) => setFormData({ ...formData, surface_type: value })}
              >
                <SelectTrigger id="surface_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {getEnumValues(SurfaceType).map((type) => (
                    <SelectItem key={type} value={type}>
                      {SurfaceTypeLabels[type as SurfaceType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveFeature} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
