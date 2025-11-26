'use client';

import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { RoleFormData } from '../RoleCreationWizard';
import type { Permission } from '@/models/rbac.model';

interface PermissionsStepProps {
  formData: RoleFormData;
  updateFormData: (data: Partial<RoleFormData>) => void;
}

export function PermissionsStep({ formData, updateFormData }: PermissionsStepProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/rbac/permissions');
      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }
      const { data } = await response.json();
      setPermissions(data || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Failed to load permissions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const module = permission.resource?.split(':')[0] || 'other';
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const modules = Object.keys(groupedPermissions).sort();

  // Filter permissions based on search and module
  const filteredPermissions = permissions.filter((permission) => {
    const matchesSearch =
      searchQuery === '' ||
      permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      permission.resource?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModule =
      selectedModule === 'all' ||
      permission.resource?.split(':')[0] === selectedModule;

    return matchesSearch && matchesModule;
  });

  const togglePermission = (permissionId: string) => {
    const newSelectedPermissions = formData.selectedPermissions.includes(permissionId)
      ? formData.selectedPermissions.filter((id) => id !== permissionId)
      : [...formData.selectedPermissions, permissionId];
    updateFormData({ selectedPermissions: newSelectedPermissions });
  };

  const selectAllInModule = (module: string) => {
    const modulePermissions = groupedPermissions[module] || [];
    const modulePermissionIds = modulePermissions.map((p) => p.id);
    const allSelected = modulePermissionIds.every((id) =>
      formData.selectedPermissions.includes(id)
    );

    if (allSelected) {
      // Deselect all in module
      updateFormData({
        selectedPermissions: formData.selectedPermissions.filter(
          (id) => !modulePermissionIds.includes(id)
        ),
      });
    } else {
      // Select all in module
      const newSelectedPermissions = [
        ...formData.selectedPermissions,
        ...modulePermissionIds.filter((id) => !formData.selectedPermissions.includes(id)),
      ];
      updateFormData({ selectedPermissions: newSelectedPermissions });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-900 font-medium">{error}</p>
              <Button onClick={fetchPermissions} variant="outline" className="mt-3">
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Assign Permissions</CardTitle>
          <CardDescription>
            Select the permissions this role should have. You can search or filter by module.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filter Bar */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search permissions by name, description, or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="px-4 py-2 border rounded-md bg-white"
            >
              <option value="all">All Modules</option>
              {modules.map((module) => (
                <option key={module} value={module}>
                  {module.charAt(0).toUpperCase() + module.slice(1)} ({groupedPermissions[module].length})
                </option>
              ))}
            </select>
          </div>

          {/* Selection Summary */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {formData.selectedPermissions.length} permission{formData.selectedPermissions.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            {formData.selectedPermissions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => updateFormData({ selectedPermissions: [] })}
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Permissions List */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {selectedModule === 'all' ? (
              // Grouped by module
              modules.map((module) => {
                const modulePermissions = groupedPermissions[module].filter((p) =>
                  filteredPermissions.includes(p)
                );
                if (modulePermissions.length === 0) return null;

                const allSelected = modulePermissions.every((p) =>
                  formData.selectedPermissions.includes(p.id)
                );
                const someSelected = modulePermissions.some((p) =>
                  formData.selectedPermissions.includes(p.id)
                );

                return (
                  <div key={module} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 capitalize">
                        {module} Module
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectAllInModule(module)}
                      >
                        {allSelected ? 'Deselect' : 'Select'} All ({modulePermissions.length})
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {modulePermissions.map((permission) => (
                        <PermissionItem
                          key={permission.id}
                          permission={permission}
                          isSelected={formData.selectedPermissions.includes(permission.id)}
                          onToggle={() => togglePermission(permission.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              // Single module view
              <div className="space-y-2">
                {filteredPermissions.map((permission) => (
                  <PermissionItem
                    key={permission.id}
                    permission={permission}
                    isSelected={formData.selectedPermissions.includes(permission.id)}
                    onToggle={() => togglePermission(permission.id)}
                  />
                ))}
              </div>
            )}

            {filteredPermissions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No permissions found matching your search.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Help Tip */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">Permission Tips:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Use bulk selection to quickly assign all permissions in a module</li>
                <li>Search by resource (e.g., "members:read") for specific actions</li>
                <li>Review selected permissions before proceeding to next step</li>
                <li>You can always edit role permissions later</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PermissionItemProps {
  permission: Permission;
  isSelected: boolean;
  onToggle: () => void;
}

function PermissionItem({ permission, isSelected, onToggle }: PermissionItemProps) {
  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'border-gray-200'
      }`}
      onClick={onToggle}
    >
      <Checkbox checked={isSelected} onCheckedChange={onToggle} className="mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">{permission.name}</span>
          {permission.resource && (
            <Badge variant="outline" className="text-xs">
              {permission.resource}
            </Badge>
          )}
        </div>
        {permission.description && (
          <p className="text-sm text-gray-600">{permission.description}</p>
        )}
      </div>
    </div>
  );
}
