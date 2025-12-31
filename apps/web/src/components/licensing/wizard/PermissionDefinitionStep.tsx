'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, GripVertical } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WizardData, WizardMode } from '../FeaturePermissionWizard';

interface PermissionDefinitionStepProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  mode?: WizardMode;
}

const COMMON_ACTIONS = ['view', 'create', 'update', 'delete', 'manage', 'export', 'import'];

export function PermissionDefinitionStep({
  data,
  onUpdate,
  onNext,
  onBack,
  mode = 'create',
}: PermissionDefinitionStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isReadOnly = mode === 'view';

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (data.permissions.length === 0) {
      newErrors.permissions = 'At least one permission is required';
    }

    // Validate each permission
    data.permissions.forEach((perm, index) => {
      if (!perm.permission_code.trim()) {
        newErrors[`permission_${index}_code`] = 'Permission code is required';
      } else if (!/^[a-z_]+:[a-z_]+$/.test(perm.permission_code)) {
        newErrors[`permission_${index}_code`] =
          'Invalid format. Use {category}:{action} (lowercase, underscores only)';
      }

      if (!perm.display_name.trim()) {
        newErrors[`permission_${index}_name`] = 'Display name is required';
      }
    });

    // Check for duplicate codes
    const codes = data.permissions.map((p) => p.permission_code);
    const duplicates = codes.filter((code, index) => codes.indexOf(code) !== index);
    if (duplicates.length > 0) {
      newErrors.permissions = `Duplicate permission codes: ${duplicates.join(', ')}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const addPermission = () => {
    const category = data.module || 'feature';
    const newPermission = {
      permission_code: `${category}:view`,
      display_name: 'View',
      description: '',
      is_required: false,
      display_order: data.permissions.length,
    };
    onUpdate({ permissions: [...data.permissions, newPermission] });
  };

  const updatePermission = (index: number, updates: any) => {
    const updatedPermissions = [...data.permissions];
    updatedPermissions[index] = { ...updatedPermissions[index], ...updates };
    onUpdate({ permissions: updatedPermissions });
  };

  const removePermission = (index: number) => {
    const updatedPermissions = data.permissions.filter((_, i) => i !== index);
    onUpdate({ permissions: updatedPermissions });
  };

  const addSuggestedPermissions = () => {
    const category = data.module || 'feature';
    const suggestions = [
      {
        permission_code: `${category}:view`,
        display_name: 'View',
        description: `View ${data.name} information`,
        is_required: true,
        display_order: 0,
      },
      {
        permission_code: `${category}:manage`,
        display_name: 'Manage',
        description: `Manage ${data.name} (create, update, delete)`,
        is_required: false,
        display_order: 1,
      },
      {
        permission_code: `${category}:export`,
        display_name: 'Export',
        description: `Export ${data.name} data`,
        is_required: false,
        display_order: 2,
      },
    ];
    onUpdate({ permissions: suggestions });
  };

  const generatePermissionCode = (index: number, action: string) => {
    const category = data.module || 'feature';
    updatePermission(index, {
      permission_code: `${category}:${action}`,
      display_name: action.charAt(0).toUpperCase() + action.slice(1),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Suggestions Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Permission Definitions</h3>
          <p className="text-sm text-muted-foreground">
            {isReadOnly
              ? 'Review the permissions required to access this feature'
              : 'Define the permissions required to access this feature'
            }
          </p>
        </div>
        {!isReadOnly && data.permissions.length === 0 && (
          <Button variant="outline" size="sm" onClick={addSuggestedPermissions}>
            <Sparkles className="mr-2 h-4 w-4" />
            Use Suggestions
          </Button>
        )}
      </div>

      {errors.permissions && (
        <p className="text-sm text-destructive">{errors.permissions}</p>
      )}

      {/* Permission List */}
      <div className="space-y-4">
        {data.permissions.map((permission, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-4">
              {/* Header with drag handle and delete */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <span className="text-sm font-medium">Permission {index + 1}</span>
                  {permission.is_required && (
                    <Badge variant="secondary">Required</Badge>
                  )}
                </div>
                {!isReadOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePermission(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Permission Code */}
              <div className="space-y-2">
                <Label>
                  Permission Code <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., members:view"
                    value={permission.permission_code}
                    onChange={(e) =>
                      updatePermission(index, { permission_code: e.target.value })
                    }
                    className={
                      errors[`permission_${index}_code`] ? 'border-destructive' : ''
                    }
                    disabled={isReadOnly}
                  />
                  {!isReadOnly && (
                    <Select
                      onValueChange={(action) => generatePermissionCode(index, action)}
                    >
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
                  )}
                </div>
                {errors[`permission_${index}_code`] && (
                  <p className="text-sm text-destructive">
                    {errors[`permission_${index}_code`]}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Format: {`{category}:{action}`} (lowercase only)
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label>
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g., View Members"
                  value={permission.display_name}
                  onChange={(e) =>
                    updatePermission(index, { display_name: e.target.value })
                  }
                  className={
                    errors[`permission_${index}_name`] ? 'border-destructive' : ''
                  }
                  disabled={isReadOnly}
                />
                {errors[`permission_${index}_name`] && (
                  <p className="text-sm text-destructive">
                    {errors[`permission_${index}_name`]}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe what this permission grants access to"
                  value={permission.description}
                  onChange={(e) =>
                    updatePermission(index, { description: e.target.value })
                  }
                  rows={2}
                  disabled={isReadOnly}
                />
              </div>

              {/* Is Required Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`required-${index}`}
                  checked={permission.is_required}
                  onCheckedChange={(checked) =>
                    updatePermission(index, { is_required: checked })
                  }
                  disabled={isReadOnly}
                />
                <Label htmlFor={`required-${index}`} className="cursor-pointer">
                  Required permission (must be granted to access feature)
                </Label>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Permission Button */}
      {!isReadOnly && (
        <Button variant="outline" onClick={addPermission} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Permission
        </Button>
      )}

      {/* Format Guide */}
      <div className="bg-muted p-4 rounded-md">
        <p className="text-sm font-medium mb-2">Permission Code Format:</p>
        <code className="text-sm">
          {`{category}:{action}`}
          <br />
          Example: members:view, finance:manage, events:export
          <br />
          Rules: lowercase, use underscores for multi-word terms
        </code>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {!isReadOnly ? (
          <Button onClick={handleNext}>
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onNext} variant="outline">
            Next <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
