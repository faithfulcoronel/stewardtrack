'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WizardData } from '../FeaturePermissionWizard';

interface RoleTemplateStepProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const STANDARD_ROLES = [
  {
    key: 'tenant_admin',
    label: 'Tenant Admin',
    description: 'Full access to tenant resources',
    defaultFor: ['view', 'manage', 'create', 'update', 'delete', 'export'],
  },
  {
    key: 'staff',
    label: 'Staff',
    description: 'Staff-level access',
    defaultFor: ['view', 'create', 'update'],
  },
  {
    key: 'volunteer',
    label: 'Volunteer',
    description: 'Volunteer-level access',
    defaultFor: ['view'],
  },
  {
    key: 'member',
    label: 'Member',
    description: 'Basic member access',
    defaultFor: [],
  },
];

export function RoleTemplateStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: RoleTemplateStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize role templates if empty
  useEffect(() => {
    if (data.permissions.length === 0) {
      return;
    }

    const nextTemplates: WizardData['roleTemplates'] = { ...data.roleTemplates };
    let hasChanges = false;

    data.permissions.forEach((permission) => {
      const existingTemplates = nextTemplates[permission.permission_code];
      if (Array.isArray(existingTemplates)) {
        return;
      }

      const [, action = ''] = permission.permission_code.split(':');

      const assignments = STANDARD_ROLES.filter((role) =>
        role.defaultFor.includes(action) ||
        (permission.is_required && role.key === 'tenant_admin')
      ).map((role) => ({
        role_key: role.key,
        is_recommended: true,
        ...(role.key === 'tenant_admin'
          ? { reason: 'Admins need full access' }
          : {}),
      }));

      nextTemplates[permission.permission_code] = assignments;
      hasChanges = true;
    });

    if (hasChanges) {
      onUpdate({ roleTemplates: nextTemplates });
    }
  }, [data.permissions, data.roleTemplates, onUpdate]);

  const toggleRole = (permissionCode: string, roleKey: string) => {
    const currentTemplates = data.roleTemplates[permissionCode] || [];
    const roleIndex = currentTemplates.findIndex((t) => t.role_key === roleKey);

    let updatedTemplates;
    if (roleIndex >= 0) {
      // Remove role
      updatedTemplates = currentTemplates.filter((_, i) => i !== roleIndex);
    } else {
      // Add role
      updatedTemplates = [
        ...currentTemplates,
        {
          role_key: roleKey,
          is_recommended: true,
        },
      ];
    }

    onUpdate({
      roleTemplates: {
        ...data.roleTemplates,
        [permissionCode]: updatedTemplates,
      },
    });
  };

  const isRoleSelected = (permissionCode: string, roleKey: string) => {
    const templates = data.roleTemplates[permissionCode] || [];
    return templates.some((t) => t.role_key === roleKey);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Check that each permission has at least one role assigned
    data.permissions.forEach((perm) => {
      const templates = data.roleTemplates[perm.permission_code] || [];
      if (templates.length === 0) {
        newErrors[perm.permission_code] = 'At least one role must be assigned';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Assign default roles for each permission. Tenant admins can customize these mappings
          later for their organization.
        </AlertDescription>
      </Alert>

      {/* Role Assignment Grid */}
      <div className="space-y-6">
        {data.permissions.map((permission) => (
          <Card key={permission.permission_code} className="p-4">
            <div className="space-y-4">
              {/* Permission Header */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium">{permission.display_name}</h4>
                  {permission.is_required && (
                    <Badge variant="secondary" className="text-xs">
                      Required
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {permission.permission_code}
                </p>
                {permission.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {permission.description}
                  </p>
                )}
              </div>

              {/* Role Checkboxes */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Assign to roles (recommended defaults):
                </Label>
                {STANDARD_ROLES.map((role) => (
                  <div key={role.key} className="flex items-start space-x-3">
                    <Checkbox
                      id={`${permission.permission_code}-${role.key}`}
                      checked={isRoleSelected(permission.permission_code, role.key)}
                      onCheckedChange={() =>
                        toggleRole(permission.permission_code, role.key)
                      }
                    />
                    <div className="space-y-1 leading-none">
                      <Label
                        htmlFor={`${permission.permission_code}-${role.key}`}
                        className="cursor-pointer"
                      >
                        {role.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {role.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {errors[permission.permission_code] && (
                <p className="text-sm text-destructive">
                  {errors[permission.permission_code]}
                </p>
              )}

              {/* Selected Count */}
              <div className="text-sm text-muted-foreground">
                {(data.roleTemplates[permission.permission_code] || []).length} role(s)
                selected
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <div className="bg-muted p-4 rounded-md">
        <p className="text-sm font-medium mb-2">About Role Templates:</p>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>These are recommended defaults when tenants license this feature</li>
          <li>Tenant admins can customize role assignments in their RBAC settings</li>
          <li>At least one role must be assigned to each permission</li>
        </ul>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleNext}>
          Next <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}