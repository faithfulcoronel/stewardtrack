'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Link2,
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Shield,
  Globe,
  Building,
  Users,
  Zap,
  CheckCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  Code,
  Layers
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import type {
  RbacSurfaceBinding,
  MetadataSurface,
  Role,
  PermissionBundle,
  FeatureCatalog,
  CreateSurfaceBindingDto
} from '@/models/rbac.model';

interface SurfaceBindingWithDetails extends RbacSurfaceBinding {
  role?: Role;
  bundle?: PermissionBundle;
  surface?: MetadataSurface;
  feature?: FeatureCatalog;
}

interface SurfaceBindingStats {
  totalBindings: number;
  activeBindings: number;
  roleBindings: number;
  bundleBindings: number;
  licensedFeatures: number;
  unboundSurfaces: number;
}

export function SurfaceBindingManager() {
  const [bindings, setBindings] = useState<SurfaceBindingWithDetails[]>([]);
  const [filteredBindings, setFilteredBindings] = useState<SurfaceBindingWithDetails[]>([]);
  const [surfaces, setSurfaces] = useState<MetadataSurface[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [bundles, setBundles] = useState<PermissionBundle[]>([]);
  const [features, setFeatures] = useState<FeatureCatalog[]>([]);
  const [stats, setStats] = useState<SurfaceBindingStats>({
    totalBindings: 0,
    activeBindings: 0,
    roleBindings: 0,
    bundleBindings: 0,
    licensedFeatures: 0,
    unboundSurfaces: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBinding, setSelectedBinding] = useState<SurfaceBindingWithDetails | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingBinding, setEditingBinding] = useState<SurfaceBindingWithDetails | null>(null);
  const [deletingBinding, setDeletingBinding] = useState<SurfaceBindingWithDetails | null>(null);
  const [newBinding, setNewBinding] = useState<Partial<CreateSurfaceBindingDto>>({});
  const [editBinding, setEditBinding] = useState<Partial<CreateSurfaceBindingDto>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBindings();
  }, [bindings, searchTerm, typeFilter, statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [bindingsRes, surfacesRes, rolesRes, bundlesRes, featuresRes] = await Promise.all([
        fetch('/api/rbac/surface-bindings'),
        fetch('/api/rbac/metadata-surfaces'),
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/bundles'),
        fetch('/api/rbac/features')
      ]);

      const [bindingsData, surfacesData, rolesData, bundlesData, featuresData] = await Promise.all([
        bindingsRes.json(),
        surfacesRes.json(),
        rolesRes.json(),
        bundlesRes.json(),
        featuresRes.json()
      ]);

      if (bindingsData.success) {
        const enrichedBindings = bindingsData.data.map((binding: RbacSurfaceBinding) => ({
          ...binding,
          role: rolesData.success ? rolesData.data.find((r: Role) => r.id === binding.role_id) : undefined,
          bundle: bundlesData.success ? bundlesData.data.find((b: PermissionBundle) => b.id === binding.bundle_id) : undefined,
          surface: surfacesData.success ? surfacesData.data.find((s: MetadataSurface) => s.id === binding.metadata_blueprint_id) : undefined,
          feature: featuresData.success ? featuresData.data.find((f: FeatureCatalog) => f.code === binding.required_feature_code) : undefined
        }));
        setBindings(enrichedBindings);
        calculateStats(enrichedBindings, surfacesData.success ? surfacesData.data : []);
      }

      if (surfacesData.success) setSurfaces(surfacesData.data);
      if (rolesData.success) setRoles(rolesData.data);
      if (bundlesData.success) setBundles(bundlesData.data);
      if (featuresData.success) setFeatures(featuresData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load surface binding data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (bindingList: SurfaceBindingWithDetails[], surfaceList: MetadataSurface[]) => {
    const activeBindings = bindingList.filter(b => b.is_active).length;
    const roleBindings = bindingList.filter(b => b.role_id).length;
    const bundleBindings = bindingList.filter(b => b.bundle_id).length;
    const licensedFeatures = new Set(bindingList.filter(b => b.required_feature_code).map(b => b.required_feature_code)).size;
    const boundSurfaceIds = new Set(bindingList.map(b => b.metadata_blueprint_id).filter(Boolean));
    const unboundSurfaces = surfaceList.filter(s => !boundSurfaceIds.has(s.id)).length;

    setStats({
      totalBindings: bindingList.length,
      activeBindings,
      roleBindings,
      bundleBindings,
      licensedFeatures,
      unboundSurfaces
    });
  };

  const filterBindings = () => {
    let filtered = bindings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(binding =>
        binding.role?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        binding.bundle?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        binding.surface?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        binding.required_feature_code?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(binding => {
        switch (typeFilter) {
          case 'role': return binding.role_id;
          case 'bundle': return binding.bundle_id;
          case 'feature': return binding.required_feature_code;
          default: return true;
        }
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(binding => {
        switch (statusFilter) {
          case 'active': return binding.is_active;
          case 'inactive': return !binding.is_active;
          default: return true;
        }
      });
    }

    setFilteredBindings(filtered);
  };

  const getScopeIcon = (scope?: string) => {
    switch (scope) {
      case 'system': return <Globe className="h-4 w-4" />;
      case 'campus': return <Building className="h-4 w-4" />;
      case 'ministry': return <Users className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getScopeColor = (scope?: string) => {
    switch (scope) {
      case 'system': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'tenant': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'campus': return 'bg-green-100 text-green-800 border-green-200';
      case 'ministry': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPhaseColor = (phase?: string) => {
    switch (phase) {
      case 'foundation': return 'bg-gray-100 text-gray-800';
      case 'role-management': return 'bg-blue-100 text-blue-800';
      case 'surface-binding': return 'bg-green-100 text-green-800';
      case 'delegated': return 'bg-purple-100 text-purple-800';
      case 'operations': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const createBinding = async (bindingData: CreateSurfaceBindingDto) => {
    try {
      const response = await fetch('/api/rbac/surface-bindings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bindingData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Surface binding created successfully');
        loadData();
        setShowCreateDialog(false);
        setNewBinding({});
      } else {
        toast.error(result.error || 'Failed to create surface binding');
      }
    } catch (error) {
      console.error('Error creating binding:', error);
      toast.error('Failed to create surface binding');
    }
  };

  const updateBinding = async (bindingId: string, bindingData: Partial<CreateSurfaceBindingDto>) => {
    try {
      const response = await fetch(`/api/rbac/surface-bindings/${bindingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bindingData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Surface binding updated successfully');
        loadData();
        setShowEditDialog(false);
        setEditingBinding(null);
        setEditBinding({});
      } else {
        toast.error(result.error || 'Failed to update surface binding');
      }
    } catch (error) {
      console.error('Error updating binding:', error);
      toast.error('Failed to update surface binding');
    }
  };

  const handleEditBinding = (binding: SurfaceBindingWithDetails) => {
    setEditingBinding(binding);
    setEditBinding({
      metadata_blueprint_id: binding.metadata_blueprint_id,
      role_id: binding.role_id,
      bundle_id: binding.bundle_id,
      required_feature_code: binding.required_feature_code
    });
    setShowEditDialog(true);
  };

  const handleDeleteBinding = (binding: SurfaceBindingWithDetails) => {
    setDeletingBinding(binding);
    setShowDeleteDialog(true);
  };

  const confirmDeleteBinding = async () => {
    if (!deletingBinding) return;

    try {
      const response = await fetch(`/api/rbac/surface-bindings/${deletingBinding.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Surface binding deleted successfully');
        loadData();
        setShowDeleteDialog(false);
        setDeletingBinding(null);
      } else {
        toast.error(result.error || 'Failed to delete surface binding');
      }
    } catch (error) {
      console.error('Error deleting binding:', error);
      toast.error('Failed to delete surface binding');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-12 bg-gray-200 rounded mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Surface Binding Manager
          </h1>
          <p className="text-gray-600">
            Manage metadata surface connections to roles, bundles, and feature licensing
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Binding
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bindings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalBindings}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Link2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-green-600">{stats.activeBindings} active</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Role Bindings</p>
                <p className="text-3xl font-bold text-blue-600">{stats.roleBindings}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Direct role connections</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bundle Bindings</p>
                <p className="text-3xl font-bold text-purple-600">{stats.bundleBindings}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Permission bundle connections</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Licensed Features</p>
                <p className="text-3xl font-bold text-green-600">{stats.licensedFeatures}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Feature-gated surfaces</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unbound Surfaces</p>
                <p className="text-3xl font-bold text-orange-600">{stats.unboundSurfaces}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-gray-500">Require binding</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Health</p>
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <span className="text-lg font-semibold text-green-600">HEALTHY</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Settings className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="bindings" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="bindings">Surface Bindings ({filteredBindings.length})</TabsTrigger>
            <TabsTrigger value="surfaces">Metadata Surfaces ({surfaces.length})</TabsTrigger>
            <TabsTrigger value="licensing">Feature Licensing</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="bindings">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search bindings..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Binding Type</Label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="role">Role Bindings</SelectItem>
                      <SelectItem value="bundle">Bundle Bindings</SelectItem>
                      <SelectItem value="feature">Feature Bindings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bindings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Surface Bindings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surface</TableHead>
                    <TableHead>Binding</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBindings.map((binding) => (
                    <TableRow key={binding.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">
                            {binding.surface?.title || 'Unknown Surface'}
                          </span>
                          <div className="text-xs text-gray-500">
                            {binding.surface?.surface_type || 'unknown'} • {binding.surface?.module || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {binding.role && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Shield className="h-3 w-3 mr-1" />
                              {binding.role.name}
                            </Badge>
                          )}
                          {binding.bundle && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              <Layers className="h-3 w-3 mr-1" />
                              {binding.bundle.name}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getScopeColor(binding.role?.scope || binding.bundle?.scope)}>
                          {getScopeIcon(binding.role?.scope || binding.bundle?.scope)}
                          <span className="ml-1">{binding.role?.scope || binding.bundle?.scope || 'unknown'}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPhaseColor(binding.surface?.phase)}>
                          {binding.surface?.phase || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {binding.required_feature_code ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Zap className="h-3 w-3 mr-1" />
                            {binding.required_feature_code}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">No license required</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={binding.is_active ? 'default' : 'secondary'}>
                          {binding.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedBinding(binding)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditBinding(binding)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteBinding(binding)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {filteredBindings.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No surface bindings found matching your criteria</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="surfaces">
          <Card>
            <CardHeader>
              <CardTitle>Metadata Surfaces</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surface</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Feature Code</TableHead>
                    <TableHead>Binding Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surfaces.map((surface) => {
                    const isBound = bindings.some(b => b.metadata_blueprint_id === surface.id);
                    return (
                      <TableRow key={surface.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{surface.title || surface.blueprint_path}</span>
                            {surface.route && (
                              <div className="text-xs text-gray-500 font-mono">{surface.route}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{surface.module}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{surface.surface_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPhaseColor(surface.phase)}>
                            {surface.phase}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {surface.feature_code ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              <Code className="h-3 w-3 mr-1" />
                              {surface.feature_code}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {isBound ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Bound
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Unbound
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="licensing">
          <Card>
            <CardHeader>
              <CardTitle>Feature Licensing Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Feature licensing controls which UI surfaces are available to tenants based on their subscription and entitlements.
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Phase</TableHead>
                    <TableHead>Bound Surfaces</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => {
                    const boundSurfaces = bindings.filter(b => b.required_feature_code === feature.code);
                    return (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <span className="font-mono text-sm">{feature.code}</span>
                        </TableCell>
                        <TableCell>{feature.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{feature.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getPhaseColor(feature.phase)}>
                            {feature.phase}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{boundSurfaces.length} surfaces</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={feature.is_active ? 'default' : 'secondary'}>
                            {feature.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Binding Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Surface Binding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="surface">Surface</Label>
              <Select
                value={newBinding.metadata_blueprint_id || ''}
                onValueChange={(value) => setNewBinding({...newBinding, metadata_blueprint_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a surface..." />
                </SelectTrigger>
                <SelectContent>
                  {surfaces.map(surface => (
                    <SelectItem key={surface.id} value={surface.id}>
                      {surface.title || surface.blueprint_path} ({surface.module})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="role">Role (Optional)</Label>
              <Select
                value={newBinding.role_id || 'none'}
                onValueChange={(value) => setNewBinding({...newBinding, role_id: value === 'none' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} ({role.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bundle">Bundle (Optional)</Label>
              <Select
                value={newBinding.bundle_id || 'none'}
                onValueChange={(value) => setNewBinding({...newBinding, bundle_id: value === 'none' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bundle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No bundle</SelectItem>
                  {bundles.map(bundle => (
                    <SelectItem key={bundle.id} value={bundle.id}>
                      {bundle.name} ({bundle.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feature">Feature Code (Optional)</Label>
              <Select
                value={newBinding.required_feature_code || 'none'}
                onValueChange={(value) => setNewBinding({...newBinding, required_feature_code: value === 'none' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a feature..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No feature requirement</SelectItem>
                  {features.map(feature => (
                    <SelectItem key={feature.id} value={feature.code}>
                      {feature.name} ({feature.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You must specify either a role or bundle (or both). Feature codes are optional and control license-based access.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!newBinding.metadata_blueprint_id) {
                  toast.error('Please select a surface');
                  return;
                }
                if (!newBinding.role_id && !newBinding.bundle_id) {
                  toast.error('Please select either a role or bundle');
                  return;
                }
                createBinding(newBinding as CreateSurfaceBindingDto);
              }}
              disabled={!newBinding.metadata_blueprint_id || (!newBinding.role_id && !newBinding.bundle_id)}
            >
              Create Binding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Binding Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Surface Binding</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-surface">Surface</Label>
              <Select
                value={editBinding.metadata_blueprint_id || ''}
                onValueChange={(value) => setEditBinding({...editBinding, metadata_blueprint_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a surface..." />
                </SelectTrigger>
                <SelectContent>
                  {surfaces.map(surface => (
                    <SelectItem key={surface.id} value={surface.id}>
                      {surface.title || surface.blueprint_path} ({surface.module})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-role">Role (Optional)</Label>
              <Select
                value={editBinding.role_id || 'none'}
                onValueChange={(value) => setEditBinding({...editBinding, role_id: value === 'none' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No role</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} ({role.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-bundle">Bundle (Optional)</Label>
              <Select
                value={editBinding.bundle_id || 'none'}
                onValueChange={(value) => setEditBinding({...editBinding, bundle_id: value === 'none' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bundle..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No bundle</SelectItem>
                  {bundles.map(bundle => (
                    <SelectItem key={bundle.id} value={bundle.id}>
                      {bundle.name} ({bundle.scope})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-feature">Feature Code (Optional)</Label>
              <Select
                value={editBinding.required_feature_code || 'none'}
                onValueChange={(value) => setEditBinding({...editBinding, required_feature_code: value === 'none' ? undefined : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a feature..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No feature requirement</SelectItem>
                  {features.map(feature => (
                    <SelectItem key={feature.id} value={feature.code}>
                      {feature.name} ({feature.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You must specify either a role or bundle (or both). Feature codes are optional and control license-based access.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!editBinding.metadata_blueprint_id) {
                  toast.error('Please select a surface');
                  return;
                }
                if (!editBinding.role_id && !editBinding.bundle_id) {
                  toast.error('Please select either a role or bundle');
                  return;
                }
                if (editingBinding) {
                  updateBinding(editingBinding.id, editBinding);
                }
              }}
              disabled={!editBinding.metadata_blueprint_id || (!editBinding.role_id && !editBinding.bundle_id)}
            >
              Update Binding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. The surface binding will be permanently deleted.
              </AlertDescription>
            </Alert>

            {deletingBinding && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">You are about to delete the following surface binding:</p>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="text-sm">
                    <p className="font-medium">
                      Surface: {deletingBinding.surface?.title || deletingBinding.surface?.blueprint_path || 'Unknown'}
                    </p>
                    {deletingBinding.role && (
                      <p>Role: {deletingBinding.role.name} ({deletingBinding.role.scope})</p>
                    )}
                    {deletingBinding.bundle && (
                      <p>Bundle: {deletingBinding.bundle.name} ({deletingBinding.bundle.scope})</p>
                    )}
                    {deletingBinding.required_feature_code && (
                      <p>Feature: {deletingBinding.required_feature_code}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <p className="text-sm text-gray-600">
              Are you sure you want to proceed with this deletion?
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeletingBinding(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteBinding}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Binding
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Binding Detail Dialog */}
      {selectedBinding && (
        <Dialog open={!!selectedBinding} onOpenChange={() => setSelectedBinding(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Surface Binding Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Surface Information</Label>
                  <div className="mt-2 space-y-2">
                    <p className="font-medium">{selectedBinding.surface?.title || 'Unknown Surface'}</p>
                    <p className="text-sm text-gray-600">{selectedBinding.surface?.description}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{selectedBinding.surface?.surface_type}</Badge>
                      <Badge variant="outline" className={getPhaseColor(selectedBinding.surface?.phase)}>
                        {selectedBinding.surface?.phase}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium text-gray-600">Binding Configuration</Label>
                  <div className="mt-2 space-y-2">
                    {selectedBinding.role && (
                      <div>
                        <span className="text-sm text-gray-600">Role:</span>
                        <Badge className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                          <Shield className="h-3 w-3 mr-1" />
                          {selectedBinding.role.name}
                        </Badge>
                      </div>
                    )}
                    {selectedBinding.bundle && (
                      <div>
                        <span className="text-sm text-gray-600">Bundle:</span>
                        <Badge className="ml-2 bg-purple-50 text-purple-700 border-purple-200">
                          <Layers className="h-3 w-3 mr-1" />
                          {selectedBinding.bundle.name}
                        </Badge>
                      </div>
                    )}
                    {selectedBinding.required_feature_code && (
                      <div>
                        <span className="text-sm text-gray-600">Feature:</span>
                        <Badge className="ml-2 bg-green-50 text-green-700 border-green-200">
                          <Zap className="h-3 w-3 mr-1" />
                          {selectedBinding.required_feature_code}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedBinding.surface?.blueprint_path && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Blueprint Path</Label>
                  <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                    <p className="font-mono text-sm">{selectedBinding.surface.blueprint_path}</p>
                  </div>
                </div>
              )}

              {selectedBinding.surface?.route && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Route</Label>
                  <div className="mt-2 bg-gray-50 p-3 rounded-lg">
                    <p className="font-mono text-sm">{selectedBinding.surface.route}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}