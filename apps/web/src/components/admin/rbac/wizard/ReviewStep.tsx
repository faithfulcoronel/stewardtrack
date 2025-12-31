'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Shield, Users, Key, Info } from 'lucide-react';
import type { RoleFormData } from '../RoleCreationWizard';
import type { Permission } from '@/models/rbac.model';

interface ReviewStepProps {
  formData: RoleFormData;
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function ReviewStep({ formData }: ReviewStepProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReviewData();
  }, [formData.selectedPermissions, formData.selectedUsers]);

  const fetchReviewData = async () => {
    setIsLoading(true);
    try {
      // Fetch selected permissions
      if (formData.selectedPermissions.length > 0) {
        const permissionsResponse = await fetch('/api/rbac/permissions');
        if (permissionsResponse.ok) {
          const { data: allPermissions } = await permissionsResponse.json();
          const selectedPermissions = allPermissions.filter((p: Permission) =>
            formData.selectedPermissions.includes(p.id)
          );
          setPermissions(selectedPermissions);
        }
      }

      // Fetch selected users
      if (formData.selectedUsers.length > 0) {
        const usersResponse = await fetch('/api/rbac/users');
        if (usersResponse.ok) {
          const { data: allUsers } = await usersResponse.json();
          const selectedUsers = allUsers.filter((u: User) =>
            formData.selectedUsers.includes(u.id)
          );
          setUsers(selectedUsers);
        }
      }
    } catch (error) {
      console.error('Error fetching review data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getScopeLabel = (scope: string): string => {
    switch (scope) {
      case 'system':
        return 'System - Available across all tenants';
      case 'tenant':
        return 'Tenant - Church-wide access';
      case 'campus':
        return 'Campus - Single campus scope';
      case 'ministry':
        return 'Ministry - Specific ministry team';
      default:
        return scope;
    }
  };

  const groupPermissionsByModule = () => {
    const grouped = permissions.reduce((acc, permission) => {
      const module = permission.resource?.split(':')[0] || 'other';
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
    return grouped;
  };

  const groupedPermissions = groupPermissionsByModule();
  const modules = Object.keys(groupedPermissions).sort();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading review data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 text-lg mb-1">
                Ready to Create Role
              </h3>
              <p className="text-green-800">
                Review the configuration below. Click &quot;Create Role&quot; to finalize.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle>Basic Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm text-gray-600">Role Name</Label>
            <p className="font-semibold text-gray-900 text-lg">{formData.name}</p>
          </div>

          {formData.description && (
            <div>
              <Label className="text-sm text-gray-600">Description</Label>
              <p className="text-gray-900">{formData.description}</p>
            </div>
          )}

          <div>
            <Label className="text-sm text-gray-600">Scope</Label>
            <p className="text-gray-900">{getScopeLabel(formData.scope)}</p>
          </div>

          <div>
            <Label className="text-sm text-gray-600">Delegatable</Label>
            <Badge variant={formData.is_delegatable ? 'default' : 'secondary'}>
              {formData.is_delegatable ? 'Yes' : 'No'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-600" />
            <CardTitle>Permissions ({formData.selectedPermissions.length})</CardTitle>
          </div>
          <CardDescription>
            The role will grant access to the following permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formData.selectedPermissions.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-yellow-900">No permissions selected</p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 capitalize mb-2">
                    {module} Module ({groupedPermissions[module].length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {groupedPermissions[module].map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-start gap-2 p-2 bg-gray-50 rounded"
                      >
                        <Shield className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900">
                            {permission.name}
                          </p>
                          {permission.resource && (
                            <p className="text-xs text-gray-600">{permission.resource}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle>Assigned Users ({formData.selectedUsers.length})</CardTitle>
          </div>
          <CardDescription>
            These users will receive this role upon creation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formData.selectedUsers.length === 0 ? (
            <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <Info className="h-5 w-5 text-blue-600" />
              <p className="text-blue-900">No users selected (you can assign users later)</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-md"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {user.full_name
                      ? user.full_name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)
                      : user.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {user.full_name || 'No name'}
                    </p>
                    <p className="text-sm text-gray-600 truncate">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Final Note */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-900">
              <p className="font-medium">Next Steps:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Click &quot;Create Role&quot; to finalize and create the role</li>
                <li>The role will be immediately available for assignment</li>
                <li>You can edit role details and permissions anytime</li>
                <li>Audit logs will track all role modifications</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>;
}
