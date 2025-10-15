'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  X,
  GripVertical,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  module: string;
}

interface Permission {
  id: string;
  permission_code: string;
  display_name: string;
  description: string;
  category: string;
  action: string;
  is_required: boolean;
  display_order: number;
  role_templates: Array<{
    id: string;
    role_key: string;
    is_recommended: boolean;
    reason?: string;
  }>;
}

interface PermissionFormData {
  permission_code: string;
  display_name: string;
  description: string;
  is_required: boolean;
}

const STANDARD_ROLES = [
  { key: 'tenant_admin', label: 'Tenant Admin' },
  { key: 'staff', label: 'Staff' },
  { key: 'volunteer', label: 'Volunteer' },
  { key: 'member', label: 'Member' },
];

const COMMON_ACTIONS = ['view', 'create', 'update', 'delete', 'manage', 'export', 'import'];

export default function ManagePermissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<PermissionFormData>({
    permission_code: '',
    display_name: '',
    description: '',
    is_required: false,
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchFeature();
    fetchPermissions();
  }, [unwrappedParams.id]);

  const fetchFeature = async () => {
    try {
      const response = await fetch(`/api/licensing/features/${unwrappedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setFeature(data.data);
      }
    } catch (err) {
      console.error('Error fetching feature:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/licensing/features/${unwrappedParams.id}/permissions`
      );
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    const category = feature?.module || 'feature';
    setFormData({
      permission_code: `${category}:view`,
      display_name: 'View',
      description: '',
      is_required: false,
    });
    setSelectedRoles(['tenant_admin']);
    setEditingPermission(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (permission: Permission) => {
    setFormData({
      permission_code: permission.permission_code,
      display_name: permission.display_name,
      description: permission.description || '',
      is_required: permission.is_required,
    });
    setSelectedRoles(permission.role_templates.map((t) => t.role_key));
    setEditingPermission(permission);
    setShowAddDialog(true);
  };

  const handleSavePermission = async () => {
    try {
      setIsSaving(true);
      setError(null);

      const roleTemplates = selectedRoles.map((role) => ({
        role_key: role,
        is_recommended: true,
      }));

      if (editingPermission) {
        // Update existing permission
        const updateResponse = await fetch(
          `/api/licensing/features/permissions/${editingPermission.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          }
        );

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || 'Failed to update permission');
        }

        // Update role templates
        const templatesResponse = await fetch(
          `/api/licensing/features/permissions/${editingPermission.id}/templates`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ templates: roleTemplates }),
          }
        );

        if (!templatesResponse.ok) {
          const errorData = await templatesResponse.json();
          throw new Error(errorData.error || 'Failed to update role templates');
        }

        setSuccess('Permission updated successfully');
      } else {
        // Create new permission
        const response = await fetch(
          `/api/licensing/features/${unwrappedParams.id}/permissions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              permission: formData,
              roleTemplates,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create permission');
        }

        setSuccess('Permission created successfully');
      }

      setShowAddDialog(false);
      fetchPermissions();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to delete this permission?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/licensing/features/permissions/${permissionId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        setSuccess('Permission deleted successfully');
        fetchPermissions();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete permission');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const generatePermissionCode = (action: string) => {
    const category = feature?.module || 'feature';
    setFormData((prev) => ({
      ...prev,
      permission_code: `${category}:${action}`,
      display_name: action.charAt(0).toUpperCase() + action.slice(1),
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/admin/licensing/features/${unwrappedParams.id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manage Permissions</h1>
            <p className="text-muted-foreground">{feature?.name}</p>
          </div>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Permission
        </Button>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Permissions List */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            {permissions.length} permission(s) defined for this feature
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No permissions defined yet</p>
              <Button onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Permission
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {permissions.map((permission, index) => (
                <Card key={permission.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{permission.display_name}</h4>
                            {permission.is_required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {permission.permission_code}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(permission)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePermission(permission.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Description */}
                    {permission.description && (
                      <p className="text-sm text-muted-foreground">
                        {permission.description}
                      </p>
                    )}

                    {/* Role Templates */}
                    <div>
                      <span className="text-xs text-muted-foreground">Default roles:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {permission.role_templates.map((template) => (
                          <Badge key={template.id} variant="outline" className="text-xs">
                            {STANDARD_ROLES.find((r) => r.key === template.role_key)?.label ||
                              template.role_key}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Permission Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPermission ? 'Edit Permission' : 'Add Permission'}
            </DialogTitle>
            <DialogDescription>
              Define the permission code and assign default roles
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Permission Code */}
            <div className="space-y-2">
              <Label>
                Permission Code <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., members:view"
                  value={formData.permission_code}
                  onChange={(e) =>
                    setFormData({ ...formData, permission_code: e.target.value })
                  }
                />
                <Select onValueChange={generatePermissionCode}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_ACTIONS.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Format: {`{category}:{action}`}
              </p>
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label>
                Display Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g., View Members"
                value={formData.display_name}
                onChange={(e) =>
                  setFormData({ ...formData, display_name: e.target.value })
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe what this permission grants access to"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={2}
              />
            </div>

            {/* Is Required */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="required"
                checked={formData.is_required}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_required: !!checked })
                }
              />
              <Label htmlFor="required" className="cursor-pointer">
                Required permission (must be granted to access feature)
              </Label>
            </div>

            <Separator />

            {/* Role Assignment */}
            <div className="space-y-3">
              <Label>Assign to Roles (Default)</Label>
              {STANDARD_ROLES.map((role) => (
                <div key={role.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.key}
                    checked={selectedRoles.includes(role.key)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedRoles([...selectedRoles, role.key]);
                      } else {
                        setSelectedRoles(selectedRoles.filter((r) => r !== role.key));
                      }
                    }}
                  />
                  <Label htmlFor={role.key} className="cursor-pointer">
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePermission} disabled={isSaving}>
              {isSaving ? 'Saving...' : editingPermission ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
