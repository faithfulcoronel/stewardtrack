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
  LicenseTier,
  LicenseTierLabels,
  LicenseTierColors,
  getEnumValues,
} from '@/enums/licensing.enums';
import { EditFeatureDialog } from './EditFeatureDialog';

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
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);

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
      <EditFeatureDialog
        feature={editingFeature}
        open={!!editingFeature}
        onOpenChange={(open) => !open && setEditingFeature(null)}
        onSuccess={fetchFeatures}
      />
    </Card>
  );
}
