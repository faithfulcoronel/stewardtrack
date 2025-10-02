'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Building, ChevronRight, Plus, Edit, Trash2, Eye, Loader2 } from 'lucide-react';

interface DelegationPermission {
  id: string;
  delegator_id: string;
  delegatee_id: string;
  delegator_name: string;
  delegatee_name: string;
  scope_type: 'campus' | 'ministry' | 'department';
  scope_id: string;
  scope_name: string;
  permissions: string[];
  restrictions: string[];
  expiry_date?: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  scope_type: 'campus' | 'ministry' | 'department';
  permissions: string[];
  restrictions: string[];
}

export function DelegationPermissionManager() {
  const [delegationPermissions, setDelegationPermissions] = useState<DelegationPermission[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableScopes, setAvailableScopes] = useState<any[]>([]);
  const [selectedDelegation, setSelectedDelegation] = useState<DelegationPermission | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Loading states for async operations
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDelegationPermissions();
    fetchPermissionTemplates();
    fetchAvailableUsers();
    fetchAvailableScopes();
  }, []);

  const fetchDelegationPermissions = async () => {
    try {
      const response = await fetch('/api/rbac/delegation/permissions');
      const data = await response.json();
      if (data.success) {
        setDelegationPermissions(data.data);
      }
    } catch (error) {
      console.error('Error fetching delegation permissions:', error);
    }
  };

  const fetchPermissionTemplates = async () => {
    try {
      const response = await fetch('/api/rbac/delegation/templates');
      const data = await response.json();
      if (data.success) {
        setPermissionTemplates(data.data);
      }
    } catch (error) {
      console.error('Error fetching permission templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch('/api/rbac/users');
      const data = await response.json();
      if (data.success) {
        setAvailableUsers(data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAvailableScopes = async () => {
    try {
      const response = await fetch('/api/rbac/delegation/scopes');
      const data = await response.json();
      if (data.success) {
        setAvailableScopes(data.data);
      }
    } catch (error) {
      console.error('Error fetching scopes:', error);
    }
  };

  const createDelegationPermission = async (permissionData: any) => {
    setIsCreating(true);
    try {
      const response = await fetch('/api/rbac/delegation/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionData)
      });
      const data = await response.json();
      if (data.success) {
        fetchDelegationPermissions();
        setIsCreateDialogOpen(false);
      }
    } catch (error) {
      console.error('Error creating delegation permission:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const updateDelegationPermission = async (id: string, permissionData: any) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/rbac/delegation/permissions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionData)
      });
      const data = await response.json();
      if (data.success) {
        fetchDelegationPermissions();
        setIsEditDialogOpen(false);
        setSelectedDelegation(null);
      }
    } catch (error) {
      console.error('Error updating delegation permission:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const revokeDelegationPermission = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/rbac/delegation/permissions/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        fetchDelegationPermissions();
      }
    } catch (error) {
      console.error('Error revoking delegation permission:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const getScopeIcon = (scopeType: string) => {
    switch (scopeType) {
      case 'campus': return <Building className="h-4 w-4" />;
      case 'ministry': return <Users className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (delegation: DelegationPermission) => {
    if (!delegation.is_active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }
    if (delegation.expiry_date && new Date(delegation.expiry_date) < new Date()) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading delegation permissions...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Delegation Permission Management</h2>
          <p className="text-muted-foreground">Manage delegation permissions and access controls</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Delegation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Delegation Permission</DialogTitle>
              <DialogDescription>
                Grant delegation permissions to another user for specific scopes
              </DialogDescription>
            </DialogHeader>
            <DelegationPermissionForm
              templates={permissionTemplates}
              users={availableUsers}
              scopes={availableScopes}
              onSubmit={createDelegationPermission}
              onCancel={() => setIsCreateDialogOpen(false)}
              isSubmitting={isCreating}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Delegations</TabsTrigger>
          <TabsTrigger value="templates">Permission Templates</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {delegationPermissions.map((delegation) => (
              <Card key={delegation.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getScopeIcon(delegation.scope_type)}
                        <div>
                          <h3 className="font-semibold">{delegation.delegatee_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Delegated by {delegation.delegator_name}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{delegation.scope_name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {delegation.scope_type} scope
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(delegation)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDelegation(delegation);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeDelegationPermission(delegation.id)}
                        disabled={deletingId === delegation.id}
                      >
                        {deletingId === delegation.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2">
                      {delegation.permissions.map((permission, index) => (
                        <Badge key={index} variant="secondary">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                    {delegation.restrictions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Restrictions:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {delegation.restrictions.map((restriction, index) => (
                            <Badge key={index} variant="outline">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {delegation.expiry_date && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Expires: {new Date(delegation.expiry_date).toLocaleDateString()}
                      </p>
                    )}
                    {delegation.last_used && (
                      <p className="text-sm text-muted-foreground">
                        Last used: {new Date(delegation.last_used).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {permissionTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {template.scope_type}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.permissions.map((permission, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {template.restrictions.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Restrictions:</p>
                        <div className="flex flex-wrap gap-1">
                          {template.restrictions.map((restriction, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {restriction}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delegation Audit Log</CardTitle>
              <CardDescription>
                Track delegation permission usage and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground py-8">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Audit log implementation coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedDelegation && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Delegation Permission</DialogTitle>
              <DialogDescription>
                Modify delegation permissions for {selectedDelegation.delegatee_name}
              </DialogDescription>
            </DialogHeader>
            <DelegationPermissionForm
              templates={permissionTemplates}
              users={availableUsers}
              scopes={availableScopes}
              initialData={selectedDelegation}
              onSubmit={(data) => updateDelegationPermission(selectedDelegation.id, data)}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedDelegation(null);
              }}
              isSubmitting={isUpdating}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface DelegationPermissionFormProps {
  templates: PermissionTemplate[];
  users: any[];
  scopes: any[];
  initialData?: DelegationPermission;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

function DelegationPermissionForm({
  templates,
  users,
  scopes,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}: DelegationPermissionFormProps) {
  const [formData, setFormData] = useState({
    delegatee_id: initialData?.delegatee_id || '',
    scope_type: initialData?.scope_type || 'campus',
    scope_id: initialData?.scope_id || '',
    permissions: initialData?.permissions || [],
    restrictions: initialData?.restrictions || [],
    expiry_date: initialData?.expiry_date || '',
    template_id: ''
  });

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        template_id: templateId,
        scope_type: template.scope_type,
        permissions: template.permissions,
        restrictions: template.restrictions
      }));
    }
  };

  const handlePermissionToggle = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  const availablePermissions = [
    'users.read', 'users.write', 'roles.read', 'roles.write',
    'permissions.read', 'permissions.write', 'audit.read',
    'delegation.read', 'delegation.write'
  ];

  const filteredScopes = scopes.filter(scope => scope.type === formData.scope_type);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(formData);
    }} className="space-y-6">
      <div className="grid gap-4">
        <div>
          <Label htmlFor="template">Permission Template (Optional)</Label>
          <Select value={formData.template_id} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name} ({template.scope_type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="delegatee">Delegatee</Label>
          <Select
            value={formData.delegatee_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, delegatee_id: value }))}
            disabled={!!initialData}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select user to delegate to" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scope_type">Scope Type</Label>
          <Select
            value={formData.scope_type}
            onValueChange={(value: 'campus' | 'ministry' | 'department') =>
              setFormData(prev => ({ ...prev, scope_type: value, scope_id: '' }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="campus">Campus</SelectItem>
              <SelectItem value="ministry">Ministry</SelectItem>
              <SelectItem value="department">Department</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="scope">Scope</Label>
          <Select
            value={formData.scope_id}
            onValueChange={(value) => setFormData(prev => ({ ...prev, scope_id: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select scope" />
            </SelectTrigger>
            <SelectContent>
              {filteredScopes.map((scope) => (
                <SelectItem key={scope.id} value={scope.id}>
                  {scope.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Permissions</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {availablePermissions.map((permission) => (
              <div key={permission} className="flex items-center space-x-2">
                <Checkbox
                  id={permission}
                  checked={formData.permissions.includes(permission)}
                  onCheckedChange={() => handlePermissionToggle(permission)}
                />
                <Label htmlFor={permission} className="text-sm">
                  {permission}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="restrictions">Restrictions (Optional)</Label>
          <Textarea
            id="restrictions"
            placeholder="Enter restrictions (one per line)"
            value={formData.restrictions.join('\n')}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              restrictions: e.target.value.split('\n').filter(r => r.trim())
            }))}
          />
        </div>

        <div>
          <Label htmlFor="expiry_date">Expiry Date (Optional)</Label>
          <Input
            id="expiry_date"
            type="date"
            value={formData.expiry_date}
            onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {initialData ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            `${initialData ? 'Update' : 'Create'} Delegation`
          )}
        </Button>
      </div>
    </form>
  );
}