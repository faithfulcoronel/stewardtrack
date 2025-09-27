'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Link2,
  Layers,
  Shield,
  Zap,
  Plus,
  Trash2,
  Eye,
  Save,
  X,
  ArrowRight,
  Globe,
  Building,
  Users,
  Settings,
  Info,
  CheckCircle,
  AlertTriangle,
  Code,
  Monitor,
  Smartphone
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

interface BindingNodeProps {
  type: 'surface' | 'role' | 'bundle' | 'feature';
  data: MetadataSurface | Role | PermissionBundle | FeatureCatalog;
  isConnected?: boolean;
  onConnect?: (data: any) => void;
  onDisconnect?: (data: any) => void;
}

interface BindingConnection {
  surface: MetadataSurface;
  role?: Role;
  bundle?: PermissionBundle;
  feature?: FeatureCatalog;
  isActive: boolean;
}

function BindingNode({ type, data, isConnected = false, onConnect, onDisconnect }: BindingNodeProps) {
  const getIcon = () => {
    switch (type) {
      case 'surface': return <Monitor className="h-4 w-4" />;
      case 'role': return <Shield className="h-4 w-4" />;
      case 'bundle': return <Layers className="h-4 w-4" />;
      case 'feature': return <Zap className="h-4 w-4" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'surface': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'role': return 'bg-green-100 text-green-800 border-green-200';
      case 'bundle': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'feature': return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getName = () => {
    if ('title' in data) return data.title || data.blueprint_path;
    return data.name;
  };

  const getSubtext = () => {
    if ('surface_type' in data) return `${data.surface_type} • ${data.module}`;
    if ('scope' in data) return `${data.scope} scope`;
    if ('code' in data && 'category' in data) return `${data.category} • ${data.code}`;
    return '';
  };

  const getSupportIcons = () => {
    if ('supports_mobile' in data && 'supports_desktop' in data) {
      return (
        <div className="flex gap-1">
          {data.supports_desktop && <Monitor className="h-3 w-3 text-gray-500" />}
          {data.supports_mobile && <Smartphone className="h-3 w-3 text-gray-500" />}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`relative p-4 border rounded-lg ${getColor()} ${isConnected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          {getIcon()}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm truncate">{getName()}</p>
            <p className="text-xs text-gray-600 mt-1">{getSubtext()}</p>
            {getSupportIcons()}
          </div>
        </div>
        <div className="flex gap-1">
          {isConnected ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDisconnect?.(data)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onConnect?.(data)}
              className="h-6 w-6 p-0"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {isConnected && (
        <div className="absolute -top-1 -right-1">
          <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
        </div>
      )}
    </div>
  );
}

export function VisualBindingEditor() {
  const [surfaces, setSurfaces] = useState<MetadataSurface[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [bundles, setBundles] = useState<PermissionBundle[]>([]);
  const [features, setFeatures] = useState<FeatureCatalog[]>([]);
  const [bindings, setBindings] = useState<RbacSurfaceBinding[]>([]);
  const [connections, setConnections] = useState<BindingConnection[]>([]);
  const [selectedSurface, setSelectedSurface] = useState<MetadataSurface | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newBinding, setNewBinding] = useState<Partial<CreateSurfaceBindingDto>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState<string>('all');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    buildConnections();
  }, [surfaces, roles, bundles, features, bindings]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [surfacesRes, rolesRes, bundlesRes, featuresRes, bindingsRes] = await Promise.all([
        fetch('/api/rbac/metadata-surfaces'),
        fetch('/api/rbac/roles'),
        fetch('/api/rbac/bundles'),
        fetch('/api/rbac/features'),
        fetch('/api/rbac/surface-bindings')
      ]);

      const [surfacesData, rolesData, bundlesData, featuresData, bindingsData] = await Promise.all([
        surfacesRes.json(),
        rolesRes.json(),
        bundlesRes.json(),
        featuresRes.json(),
        bindingsRes.json()
      ]);

      if (surfacesData.success) setSurfaces(surfacesData.data);
      if (rolesData.success) setRoles(rolesData.data);
      if (bundlesData.success) setBundles(bundlesData.data);
      if (featuresData.success) setFeatures(featuresData.data);
      if (bindingsData.success) setBindings(bindingsData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load binding data');
    } finally {
      setIsLoading(false);
    }
  };

  const buildConnections = () => {
    const connectionMap: BindingConnection[] = [];

    bindings.forEach(binding => {
      const surface = surfaces.find(s => s.id === binding.metadata_blueprint_id);
      if (!surface) return;

      const role = binding.role_id ? roles.find(r => r.id === binding.role_id) : undefined;
      const bundle = binding.bundle_id ? bundles.find(b => b.id === binding.bundle_id) : undefined;
      const feature = binding.required_feature_code ?
        features.find(f => f.code === binding.required_feature_code) : undefined;

      connectionMap.push({
        surface,
        role,
        bundle,
        feature,
        isActive: binding.is_active
      });
    });

    setConnections(connectionMap);
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

  const deleteBinding = async (bindingId: string) => {
    try {
      const response = await fetch(`/api/rbac/surface-bindings/${bindingId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Surface binding deleted successfully');
        loadData();
      } else {
        toast.error(result.error || 'Failed to delete surface binding');
      }
    } catch (error) {
      console.error('Error deleting binding:', error);
      toast.error('Failed to delete surface binding');
    }
  };

  const filteredSurfaces = surfaces.filter(surface => {
    if (searchTerm && !surface.title?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !surface.module.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (phaseFilter !== 'all' && surface.phase !== phaseFilter) {
      return false;
    }
    if (moduleFilter !== 'all' && surface.module !== moduleFilter) {
      return false;
    }
    return true;
  });

  const getConnectionsForSurface = (surfaceId: string) => {
    return connections.filter(conn => conn.surface.id === surfaceId);
  };

  const isConnected = (surface: MetadataSurface, item: Role | PermissionBundle | FeatureCatalog) => {
    return connections.some(conn => {
      if (conn.surface.id !== surface.id) return false;
      if ('scope' in item && conn.role?.id === item.id) return true;
      if ('is_template' in item && conn.bundle?.id === item.id) return true;
      if ('code' in item && 'category' in item && conn.feature?.code === item.code) return true;
      return false;
    });
  };

  const handleConnect = (surface: MetadataSurface, item: Role | PermissionBundle | FeatureCatalog) => {
    const bindingData: CreateSurfaceBindingDto = {
      metadata_blueprint_id: surface.id
    };

    if ('scope' in item) {
      bindingData.role_id = item.id;
    } else if ('is_template' in item) {
      bindingData.bundle_id = item.id;
    } else if ('code' in item && 'category' in item) {
      bindingData.required_feature_code = item.code;
    }

    createBinding(bindingData);
  };

  const handleDisconnect = (surface: MetadataSurface, item: Role | PermissionBundle | FeatureCatalog) => {
    const binding = bindings.find(b => {
      if (b.metadata_blueprint_id !== surface.id) return false;
      if ('scope' in item && b.role_id === item.id) return true;
      if ('is_template' in item && b.bundle_id === item.id) return true;
      if ('code' in item && 'category' in item && b.required_feature_code === item.code) return true;
      return false;
    });

    if (binding) {
      deleteBinding(binding.id);
    }
  };

  const uniquePhases = Array.from(new Set(surfaces.map(s => s.phase)));
  const uniqueModules = Array.from(new Set(surfaces.map(s => s.module)));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Visual Binding Editor
          </h1>
          <p className="text-gray-600">
            Create and manage connections between UI surfaces, roles, bundles, and feature licenses
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Binding
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Surfaces</Label>
              <Input
                id="search"
                placeholder="Search by title or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label>Phase</Label>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Phases</SelectItem>
                  {uniquePhases.map(phase => (
                    <SelectItem key={phase} value={phase}>{phase}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Module</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {uniqueModules.map(module => (
                    <SelectItem key={module} value={module}>{module}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual Binding Interface */}
      <div className="grid grid-cols-12 gap-6">
        {/* Surfaces Column */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                UI Surfaces ({filteredSurfaces.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {filteredSurfaces.map(surface => (
                <BindingNode
                  key={surface.id}
                  type="surface"
                  data={surface}
                  isConnected={getConnectionsForSurface(surface.id).length > 0}
                  onConnect={() => setSelectedSurface(surface)}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Connection Area */}
        <div className="col-span-6">
          {selectedSurface ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5" />
                  Binding Editor - {selectedSurface.title || selectedSurface.blueprint_path}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Surface Info */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-blue-900">
                        {selectedSurface.title || selectedSurface.blueprint_path}
                      </h3>
                      <p className="text-sm text-blue-700">
                        {selectedSurface.surface_type} • {selectedSurface.module} • {selectedSurface.phase}
                      </p>
                      {selectedSurface.feature_code && (
                        <Badge className="mt-2 bg-green-100 text-green-800">
                          <Zap className="h-3 w-3 mr-1" />
                          {selectedSurface.feature_code}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSurface(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Existing Connections */}
                <div>
                  <h4 className="font-medium mb-3">Current Bindings</h4>
                  <div className="space-y-2">
                    {getConnectionsForSurface(selectedSurface.id).map((connection, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          {connection.role && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <Shield className="h-3 w-3 mr-1" />
                              {connection.role.name}
                            </Badge>
                          )}
                          {connection.bundle && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                              <Layers className="h-3 w-3 mr-1" />
                              {connection.bundle.name}
                            </Badge>
                          )}
                          {connection.feature && (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                              <Zap className="h-3 w-3 mr-1" />
                              {connection.feature.name}
                            </Badge>
                          )}
                        </div>
                        <Badge variant={connection.isActive ? 'default' : 'secondary'}>
                          {connection.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    ))}
                    {getConnectionsForSurface(selectedSurface.id).length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No bindings configured for this surface
                      </p>
                    )}
                  </div>
                </div>

                {/* Add New Connections */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <h5 className="font-medium mb-2 text-sm">Roles</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {roles.slice(0, 5).map(role => (
                        <BindingNode
                          key={role.id}
                          type="role"
                          data={role}
                          isConnected={isConnected(selectedSurface, role)}
                          onConnect={() => handleConnect(selectedSurface, role)}
                          onDisconnect={() => handleDisconnect(selectedSurface, role)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2 text-sm">Bundles</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {bundles.slice(0, 5).map(bundle => (
                        <BindingNode
                          key={bundle.id}
                          type="bundle"
                          data={bundle}
                          isConnected={isConnected(selectedSurface, bundle)}
                          onConnect={() => handleConnect(selectedSurface, bundle)}
                          onDisconnect={() => handleDisconnect(selectedSurface, bundle)}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2 text-sm">Features</h5>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {features.slice(0, 5).map(feature => (
                        <BindingNode
                          key={feature.id}
                          type="feature"
                          data={feature}
                          isConnected={isConnected(selectedSurface, feature)}
                          onConnect={() => handleConnect(selectedSurface, feature)}
                          onDisconnect={() => handleDisconnect(selectedSurface, feature)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="h-full flex items-center justify-center">
              <CardContent className="text-center">
                <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">
                  Select a Surface to Edit Bindings
                </h3>
                <p className="text-gray-600">
                  Choose a UI surface from the left panel to configure its role, bundle, and feature connections
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Summary Column */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Binding Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{connections.length}</div>
                <div className="text-sm text-gray-600">Total Bindings</div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Active</span>
                  <span className="font-medium">
                    {connections.filter(c => c.isActive).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Role Bindings</span>
                  <span className="font-medium">
                    {connections.filter(c => c.role).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Bundle Bindings</span>
                  <span className="font-medium">
                    {connections.filter(c => c.bundle).length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Feature Bindings</span>
                  <span className="font-medium">
                    {connections.filter(c => c.feature).length}
                  </span>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Bindings control which users can access specific UI surfaces based on their roles, permissions, and feature licenses.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}