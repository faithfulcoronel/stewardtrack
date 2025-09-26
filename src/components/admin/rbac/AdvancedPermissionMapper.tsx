'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Map,
  Layers,
  Shield,
  Key,
  Eye,
  Edit,
  Save,
  Plus,
  Trash2,
  Search,
  Filter,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
  Globe,
  Building,
  Users,
  Zap,
  Code,
  Target,
  Network
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type {
  Permission,
  PermissionBundle,
  Role,
  MetadataSurface,
  FeatureCatalog,
  BundleWithPermissions,
  RoleWithPermissions
} from '@/models/rbac.model';

interface PermissionNode {
  id: string;
  name: string;
  code: string;
  module: string;
  category: string;
  description?: string;
  isActive: boolean;
}

interface MappingConnection {
  id: string;
  source: {
    type: 'permission' | 'bundle' | 'role' | 'surface';
    id: string;
    name: string;
  };
  target: {
    type: 'permission' | 'bundle' | 'role' | 'surface';
    id: string;
    name: string;
  };
  relationship: 'contains' | 'requires' | 'enables' | 'restricts';
  isActive: boolean;
}

interface MappingStats {
  totalPermissions: number;
  totalBundles: number;
  totalRoles: number;
  totalSurfaces: number;
  orphanedPermissions: number;
  complexRoles: number;
  featureGatedSurfaces: number;
}

export function AdvancedPermissionMapper() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [bundles, setBundles] = useState<BundleWithPermissions[]>([]);
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [surfaces, setSurfaces] = useState<MetadataSurface[]>([]);
  const [features, setFeatures] = useState<FeatureCatalog[]>([]);
  const [connections, setConnections] = useState<MappingConnection[]>([]);
  const [stats, setStats] = useState<MappingStats>({
    totalPermissions: 0,
    totalBundles: 0,
    totalRoles: 0,
    totalSurfaces: 0,
    orphanedPermissions: 0,
    complexRoles: 0,
    featureGatedSurfaces: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [relationshipFilter, setRelationshipFilter] = useState<string>('all');
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [visualizationMode, setVisualizationMode] = useState<'hierarchy' | 'network' | 'matrix'>('hierarchy');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    buildConnections();
    calculateStats();
  }, [permissions, bundles, roles, surfaces]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [permRes, bundleRes, roleRes, surfaceRes, featureRes] = await Promise.all([
        fetch('/api/rbac/permissions'),
        fetch('/api/rbac/bundles?includeStats=true'),
        fetch('/api/rbac/roles?includeStats=true'),
        fetch('/api/rbac/metadata-surfaces'),
        fetch('/api/rbac/features')
      ]);

      const [permData, bundleData, roleData, surfaceData, featureData] = await Promise.all([
        permRes.json(),
        bundleRes.json(),
        roleRes.json(),
        surfaceRes.json(),
        featureRes.json()
      ]);

      if (permData.success) setPermissions(permData.data);
      if (bundleData.success) setBundles(bundleData.data);
      if (roleData.success) setRoles(roleData.data);
      if (surfaceData.success) setSurfaces(surfaceData.data);
      if (featureData.success) setFeatures(featureData.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load permission mapping data');
    } finally {
      setIsLoading(false);
    }
  };

  const buildConnections = () => {
    const connectionList: MappingConnection[] = [];

    // Bundle -> Permission connections
    bundles.forEach(bundle => {
      bundle.permissions?.forEach(permission => {
        connectionList.push({
          id: `bundle-${bundle.id}-permission-${permission.id}`,
          source: { type: 'bundle', id: bundle.id, name: bundle.name },
          target: { type: 'permission', id: permission.id, name: permission.name },
          relationship: 'contains',
          isActive: true
        });
      });
    });

    // Role -> Bundle connections
    roles.forEach(role => {
      role.bundles?.forEach(bundle => {
        connectionList.push({
          id: `role-${role.id}-bundle-${bundle.id}`,
          source: { type: 'role', id: role.id, name: role.name },
          target: { type: 'bundle', id: bundle.id, name: bundle.name },
          relationship: 'contains',
          isActive: true
        });
      });

      // Direct Role -> Permission connections
      role.permissions?.forEach(permission => {
        connectionList.push({
          id: `role-${role.id}-permission-${permission.id}`,
          source: { type: 'role', id: role.id, name: role.name },
          target: { type: 'permission', id: permission.id, name: permission.name },
          relationship: 'contains',
          isActive: true
        });
      });
    });

    // Surface -> Feature connections
    surfaces.forEach(surface => {
      if (surface.feature_code) {
        const feature = features.find(f => f.code === surface.feature_code);
        if (feature) {
          connectionList.push({
            id: `surface-${surface.id}-feature-${feature.code}`,
            source: { type: 'surface', id: surface.id, name: surface.title || surface.blueprint_path },
            target: { type: 'permission', id: feature.id, name: feature.name },
            relationship: 'requires',
            isActive: true
          });
        }
      }
    });

    setConnections(connectionList);
  };

  const calculateStats = () => {
    const orphanedPermissions = permissions.filter(permission =>
      !connections.some(conn =>
        conn.target.type === 'permission' && conn.target.id === permission.id
      )
    ).length;

    const complexRoles = roles.filter(role =>
      (role.permissions?.length || 0) + (role.bundles?.length || 0) > 10
    ).length;

    const featureGatedSurfaces = surfaces.filter(surface => surface.feature_code).length;

    setStats({
      totalPermissions: permissions.length,
      totalBundles: bundles.length,
      totalRoles: roles.length,
      totalSurfaces: surfaces.length,
      orphanedPermissions,
      complexRoles,
      featureGatedSurfaces
    });
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'permission': return <Key className="h-4 w-4" />;
      case 'bundle': return <Layers className="h-4 w-4" />;
      case 'role': return <Shield className="h-4 w-4" />;
      case 'surface': return <Target className="h-4 w-4" />;
      default: return <Code className="h-4 w-4" />;
    }
  };

  const getEntityColor = (type: string) => {
    switch (type) {
      case 'permission': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'bundle': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'role': return 'bg-green-100 text-green-800 border-green-200';
      case 'surface': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'contains': return 'text-blue-600';
      case 'requires': return 'text-red-600';
      case 'enables': return 'text-green-600';
      case 'restricts': return 'text-orange-600';
      default: return 'text-gray-600';
    }
  };

  const getConnectionsForEntity = (entityId: string, entityType: string) => {
    return connections.filter(conn =>
      (conn.source.type === entityType && conn.source.id === entityId) ||
      (conn.target.type === entityType && conn.target.id === entityId)
    );
  };

  const handleEntitySelect = (entity: any, type: string) => {
    setSelectedEntity(entity);
    setSelectedEntityType(type);
  };

  const filteredConnections = connections.filter(conn => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!conn.source.name.toLowerCase().includes(searchLower) &&
          !conn.target.name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    if (relationshipFilter !== 'all' && conn.relationship !== relationshipFilter) {
      return false;
    }
    return true;
  });

  const uniqueModules = Array.from(new Set(permissions.map(p => p.module)));

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
            Advanced Permission Mapper
          </h1>
          <p className="text-gray-600">
            Visualize and manage complex permission relationships across roles, bundles, and surfaces
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={visualizationMode} onValueChange={(value: any) => setVisualizationMode(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hierarchy">Hierarchy View</SelectItem>
              <SelectItem value="network">Network View</SelectItem>
              <SelectItem value="matrix">Matrix View</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalPermissions}</div>
            <div className="text-xs text-gray-600">Permissions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalBundles}</div>
            <div className="text-xs text-gray-600">Bundles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.totalRoles}</div>
            <div className="text-xs text-gray-600">Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalSurfaces}</div>
            <div className="text-xs text-gray-600">Surfaces</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.orphanedPermissions}</div>
            <div className="text-xs text-gray-600">Orphaned</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.complexRoles}</div>
            <div className="text-xs text-gray-600">Complex Roles</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stats.featureGatedSurfaces}</div>
            <div className="text-xs text-gray-600">Feature-Gated</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Entity Browser */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Entity Browser
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="roles" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="roles" className="text-xs">Roles</TabsTrigger>
                  <TabsTrigger value="bundles" className="text-xs">Bundles</TabsTrigger>
                  <TabsTrigger value="permissions" className="text-xs">Perms</TabsTrigger>
                  <TabsTrigger value="surfaces" className="text-xs">Surfaces</TabsTrigger>
                </TabsList>

                <TabsContent value="roles" className="space-y-2 max-h-96 overflow-y-auto">
                  {roles.map(role => (
                    <div
                      key={role.id}
                      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedEntity?.id === role.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleEntitySelect(role, 'role')}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{role.name}</p>
                          <p className="text-xs text-gray-500">
                            {(role.permissions?.length || 0) + (role.bundles?.length || 0)} items
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="bundles" className="space-y-2 max-h-96 overflow-y-auto">
                  {bundles.map(bundle => (
                    <div
                      key={bundle.id}
                      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedEntity?.id === bundle.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleEntitySelect(bundle, 'bundle')}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-purple-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{bundle.name}</p>
                          <p className="text-xs text-gray-500">
                            {bundle.permissions?.length || 0} permissions
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="permissions" className="space-y-2 max-h-96 overflow-y-auto">
                  {permissions.map(permission => (
                    <div
                      key={permission.id}
                      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedEntity?.id === permission.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleEntitySelect(permission, 'permission')}
                    >
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{permission.name}</p>
                          <p className="text-xs text-gray-500">{permission.module}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="surfaces" className="space-y-2 max-h-96 overflow-y-auto">
                  {surfaces.map(surface => (
                    <div
                      key={surface.id}
                      className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedEntity?.id === surface.id ? 'ring-2 ring-blue-500' : ''
                      }`}
                      onClick={() => handleEntitySelect(surface, 'surface')}
                    >
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {surface.title || surface.blueprint_path}
                          </p>
                          <p className="text-xs text-gray-500">{surface.module}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Visualization Area */}
        <div className="col-span-6">
          {visualizationMode === 'hierarchy' && (
            <Card>
              <CardHeader>
                <CardTitle>Permission Hierarchy</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedEntity ? (
                  <div className="space-y-4">
                    {/* Selected Entity */}
                    <div className={`p-4 rounded-lg border-2 ${getEntityColor(selectedEntityType)}`}>
                      <div className="flex items-center gap-2">
                        {getEntityIcon(selectedEntityType)}
                        <div>
                          <h3 className="font-medium">{selectedEntity.name || selectedEntity.title}</h3>
                          <p className="text-sm opacity-75">
                            {selectedEntityType} • {
                              selectedEntity.module ||
                              selectedEntity.scope ||
                              selectedEntity.category
                            }
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Connections */}
                    <div className="space-y-2">
                      {getConnectionsForEntity(selectedEntity.id, selectedEntityType).map(conn => (
                        <div key={conn.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getEntityColor(conn.source.type)}`}>
                            {getEntityIcon(conn.source.type)}
                            {conn.source.name}
                          </div>
                          <ArrowRight className={`h-4 w-4 ${getRelationshipColor(conn.relationship)}`} />
                          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${getEntityColor(conn.target.type)}`}>
                            {getEntityIcon(conn.target.type)}
                            {conn.target.name}
                          </div>
                          <Badge variant="outline" className={getRelationshipColor(conn.relationship)}>
                            {conn.relationship}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {getConnectionsForEntity(selectedEntity.id, selectedEntityType).length === 0 && (
                      <div className="text-center py-8">
                        <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">No connections found for this entity</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="font-medium text-gray-900 mb-2">Select an Entity</h3>
                    <p className="text-gray-600">
                      Choose an entity from the browser to visualize its permission relationships
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {visualizationMode === 'network' && (
            <Card>
              <CardHeader>
                <CardTitle>Network View</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-16">
                <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Network visualization coming soon...</p>
              </CardContent>
            </Card>
          )}

          {visualizationMode === 'matrix' && (
            <Card>
              <CardHeader>
                <CardTitle>Matrix View</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-16">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Matrix visualization coming soon...</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Analysis Panel */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.orphanedPermissions > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {stats.orphanedPermissions} permissions are not assigned to any bundle or role
                  </AlertDescription>
                </Alert>
              )}

              {stats.complexRoles > 0 && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    {stats.complexRoles} roles have more than 10 permissions/bundles and may need review
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Relationship Distribution</h4>
                <div className="space-y-1">
                  {['contains', 'requires', 'enables', 'restricts'].map(relationship => {
                    const count = connections.filter(c => c.relationship === relationship).length;
                    const percentage = connections.length ? (count / connections.length) * 100 : 0;
                    return (
                      <div key={relationship} className="flex justify-between text-sm">
                        <span className={getRelationshipColor(relationship)}>{relationship}</span>
                        <span>{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedEntity && (
                <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-sm text-blue-900 mb-2">Selected Entity</h4>
                  <p className="text-sm text-blue-800">
                    {selectedEntity.name || selectedEntity.title}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    {getConnectionsForEntity(selectedEntity.id, selectedEntityType).length} connections
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Connection Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Connections ({filteredConnections.length})</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search connections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
              />
              <Select value={relationshipFilter} onValueChange={setRelationshipFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="contains">Contains</SelectItem>
                  <SelectItem value="requires">Requires</SelectItem>
                  <SelectItem value="enables">Enables</SelectItem>
                  <SelectItem value="restricts">Restricts</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Relationship</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConnections.map(connection => (
                <TableRow key={connection.id}>
                  <TableCell>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getEntityColor(connection.source.type)}`}>
                      {getEntityIcon(connection.source.type)}
                      {connection.source.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRelationshipColor(connection.relationship)}>
                      {connection.relationship}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getEntityColor(connection.target.type)}`}>
                      {getEntityIcon(connection.target.type)}
                      {connection.target.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={connection.isActive ? 'default' : 'secondary'}>
                      {connection.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredConnections.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No connections found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}