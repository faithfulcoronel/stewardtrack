'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import type { WizardData } from '../FeaturePermissionWizard';

interface ReviewStepProps {
  data: WizardData;
  onSubmit: () => Promise<void>;
  onBack: () => void;
  isSubmitting: boolean;
}

const TIER_LABELS: Record<string, string> = {
  essential: 'Essential',
  professional: 'Professional',
  enterprise: 'Enterprise',
  premium: 'Premium',
};

const SURFACE_TYPE_LABELS: Record<string, string> = {
  page: 'Page',
  dashboard: 'Dashboard',
  wizard: 'Wizard',
  manager: 'Manager',
  console: 'Console',
  audit: 'Audit',
  overlay: 'Overlay',
};

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Tenant Admin',
  staff: 'Staff',
  volunteer: 'Volunteer',
  member: 'Member',
};

export function ReviewStep({
  data,
  onSubmit,
  onBack,
  isSubmitting,
}: ReviewStepProps) {
  const hasRequiredPermission = data.permissions.some((p) => p.is_required);

  return (
    <div className="space-y-6">
      {/* Warning if no required permission */}
      {!hasRequiredPermission && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No permissions are marked as required. Consider marking at least one permission as
            required for proper access control.
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Basic Information</h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Feature Name:</span>
            <p className="font-medium">{data.name}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Description:</span>
            <p className="text-sm">{data.description}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Category:</span>
              <p className="font-medium capitalize">{data.category}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">License Tier:</span>
              <Badge variant="secondary">{TIER_LABELS[data.tier]}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Surface Association */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Surface Association</h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-muted-foreground">Surface ID:</span>
            <p className="font-mono text-sm">{data.surface_id}</p>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Module:</span>
              <p className="font-medium capitalize">{data.module}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Surface Type:</span>
              <Badge>{SURFACE_TYPE_LABELS[data.surface_type]}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Permissions */}
      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Permissions</h3>
          <Badge variant="outline">{data.permissions.length} permission(s)</Badge>
        </div>

        <div className="space-y-4">
          {data.permissions.map((permission, index) => (
            <div key={index}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{permission.display_name}</p>
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

                {permission.description && (
                  <p className="text-sm text-muted-foreground">
                    {permission.description}
                  </p>
                )}

                {/* Role Templates */}
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">
                    Assigned to roles:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(data.roleTemplates[permission.permission_code] || []).map(
                      (template, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {ROLE_LABELS[template.role_key] || template.role_key}
                        </Badge>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Summary */}
      <div className="bg-muted p-4 rounded-md">
        <h4 className="font-medium mb-2">Summary:</h4>
        <ul className="text-sm space-y-1">
          <li>
            • {data.permissions.length} permission(s) defined
          </li>
          <li>
            • {data.permissions.filter((p) => p.is_required).length} required
            permission(s)
          </li>
          <li>
            • {Object.values(data.roleTemplates).flat().length} role template(s)
            assigned
          </li>
        </ul>
      </div>

      {/* Confirmation Message */}
      <Alert>
        <Check className="h-4 w-4" />
        <AlertDescription>
          Review all details carefully. Once created, the feature will be available in the
          licensing catalog and can be assigned to tenants.
        </AlertDescription>
      </Alert>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Feature'}
        </Button>
      </div>
    </div>
  );
}
