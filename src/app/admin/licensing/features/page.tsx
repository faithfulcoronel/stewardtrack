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

interface Feature {
  id: string;
  name: string;
  description: string;
  tier: string;
  category: string;
  surface_id: string;
  surface_type: string;
  module: string;
  is_active: boolean;
  created_at: string;
}

const TIER_COLORS: Record<string, string> = {
  essential: 'bg-gray-100 text-gray-800',
  professional: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
  premium: 'bg-amber-100 text-amber-800',
};
const formatTier = (tier?: string) => {
  const trimmed = tier?.trim();

  if (!trimmed) {
    return {
      className: "bg-gray-100 text-gray-800",
      label: "Unknown",
    };
  }

  const normalized = trimmed.toLowerCase();

  return {
    className: TIER_COLORS[normalized] || "bg-gray-100 text-gray-800",
    label: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
  };
};

export default function FeaturesListPage() {
  const router = useRouter();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [filteredFeatures, setFilteredFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

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
          f.surface_id.toLowerCase().includes(term)
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
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Manage features in the licensing catalog
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
                <SelectItem value="essential">Essential</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
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
                      formatTier(feature.tier);

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
                          <code className="text-xs">{feature.surface_id}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {feature.module}
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
                                View Details
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
      </Card>
    </div>
  );
}