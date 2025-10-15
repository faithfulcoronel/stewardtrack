'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { WizardData } from '../FeaturePermissionWizard';
import {
  SurfaceType,
  SurfaceTypeLabels,
  FeatureModule,
  FeatureModuleLabels,
  getEnumValues,
} from '@/enums/licensing.enums';

interface SurfaceAssociationStepProps {
  data: WizardData;
  onUpdate: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const SURFACE_TYPE_DESCRIPTIONS: Record<SurfaceType, string> = {
  [SurfaceType.PAGE]: 'Full page view',
  [SurfaceType.DASHBOARD]: 'Dashboard with widgets',
  [SurfaceType.WIZARD]: 'Multi-step wizard',
  [SurfaceType.DIALOG]: 'Modal or dialog',
  [SurfaceType.PANEL]: 'Side panel',
  [SurfaceType.WIDGET]: 'Dashboard widget',
  [SurfaceType.REPORT]: 'Report view',
  [SurfaceType.FORM]: 'Form interface',
  [SurfaceType.LIST]: 'List view',
  [SurfaceType.DETAIL]: 'Detail view',
};

export function SurfaceAssociationStep({
  data,
  onUpdate,
  onNext,
  onBack,
}: SurfaceAssociationStepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!data.surface_id.trim()) {
      newErrors.surface_id = 'Surface ID is required';
    } else if (!/^[a-z0-9/_-]+$/.test(data.surface_id)) {
      newErrors.surface_id = 'Surface ID must be lowercase with /, -, or _';
    }

    if (!data.module) {
      newErrors.module = 'Module is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  const generateSurfaceId = () => {
    if (data.module && data.name) {
      const featureName = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const surfaceId = `admin/${data.module}/${featureName}`;
      onUpdate({ surface_id: surfaceId });
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Associate this feature with a metadata surface. This links the feature to specific UI
          components and enables surface-based access control.
        </AlertDescription>
      </Alert>

      {/* Module */}
      <div className="space-y-2">
        <Label htmlFor="module">
          Module <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.module}
          onValueChange={(value) => {
            onUpdate({ module: value });
            // Auto-update surface_id if it's empty or matches old pattern
            if (!data.surface_id || data.surface_id.startsWith('admin/')) {
              setTimeout(generateSurfaceId, 100);
            }
          }}
        >
          <SelectTrigger className={errors.module ? 'border-destructive' : ''}>
            <SelectValue placeholder="Select a module" />
          </SelectTrigger>
          <SelectContent>
            {getEnumValues(FeatureModule).map((mod) => (
              <SelectItem key={mod} value={mod}>
                {FeatureModuleLabels[mod as FeatureModule]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.module && (
          <p className="text-sm text-destructive">{errors.module}</p>
        )}
        <p className="text-sm text-muted-foreground">
          The module this feature belongs to
        </p>
      </div>

      {/* Surface Type */}
      <div className="space-y-2">
        <Label htmlFor="surface_type">
          Surface Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={data.surface_type}
          onValueChange={(value: any) => onUpdate({ surface_type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getEnumValues(SurfaceType).map((type) => (
              <SelectItem key={type} value={type}>
                <div className="flex flex-col">
                  <span className="font-medium">{SurfaceTypeLabels[type as SurfaceType]}</span>
                  <span className="text-xs text-muted-foreground">
                    {SURFACE_TYPE_DESCRIPTIONS[type as SurfaceType]}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Type of UI surface this feature represents
        </p>
      </div>

      {/* Surface ID */}
      <div className="space-y-2">
        <Label htmlFor="surface_id">
          Surface ID <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="surface_id"
            placeholder="e.g., admin/members/directory"
            value={data.surface_id}
            onChange={(e) => onUpdate({ surface_id: e.target.value })}
            className={errors.surface_id ? 'border-destructive' : ''}
          />
          <Button
            type="button"
            variant="outline"
            onClick={generateSurfaceId}
            disabled={!data.module || !data.name}
          >
            Generate
          </Button>
        </div>
        {errors.surface_id && (
          <p className="text-sm text-destructive">{errors.surface_id}</p>
        )}
        <p className="text-sm text-muted-foreground">
          Unique identifier for the metadata surface (lowercase, use / for paths)
        </p>
      </div>

      {/* Example */}
      <div className="bg-muted p-4 rounded-md">
        <p className="text-sm font-medium mb-2">Surface ID Format:</p>
        <code className="text-sm">
          {`{module}/{feature-name}`}
          <br />
          Example: admin/members/directory
        </code>
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
