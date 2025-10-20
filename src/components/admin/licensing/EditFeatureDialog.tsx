'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  LicenseTier,
  LicenseTierLabels,
  FeatureCategory,
  FeatureCategoryLabels,
  FeatureModule,
  FeatureModuleLabels,
  SurfaceType,
  SurfaceTypeLabels,
} from '@/enums/licensing.enums';

import {
  getEnumValues
} from '@/enums/helpers';

interface Feature {
  id: string;
  name: string;
  description: string;
  tier?: string | null;
  category: string;
  surface_id?: string | null;
  surface_type?: string | null;
  module?: string | null;
}

interface EditFeatureDialogProps {
  feature: Feature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditFeatureDialog({
  feature,
  open,
  onOpenChange,
  onSuccess,
}: EditFeatureDialogProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tier: '',
    category: '',
    surface_id: '',
    surface_type: '',
    module: '',
  });

  // Update form data when feature changes
  useEffect(() => {
    if (feature) {
      setFormData({
        name: feature.name,
        description: feature.description,
        tier: feature.tier || '',
        category: feature.category,
        surface_id: feature.surface_id || '',
        surface_type: feature.surface_type || '',
        module: feature.module || '',
      });
      setError(null);
      setSuccess(null);
    }
  }, [feature]);

  const handleSave = async () => {
    if (!feature) return;

    // Validation
    if (!formData.name.trim()) {
      setError('Feature name is required');
      return;
    }

    if (!formData.tier) {
      setError('License tier is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/licensing/features/${feature.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          tier: formData.tier,
          category: formData.category,
          surface_id: formData.surface_id || null,
          surface_type: formData.surface_type || null,
          module: formData.module || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update feature');
      }

      setSuccess('Feature updated successfully');
      onSuccess();

      // Close dialog after a short delay to show success message
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update feature');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Feature</DialogTitle>
          <DialogDescription>
            Update the feature details below. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Feature Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Feature Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Advanced Member Analytics"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this feature does..."
              rows={3}
            />
          </div>

          {/* License Tier */}
          <div className="space-y-2">
            <Label htmlFor="tier">
              License Tier <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formData.tier}
              onValueChange={(value) => setFormData({ ...formData, tier: value })}
            >
              <SelectTrigger id="tier">
                <SelectValue placeholder="Select tier" />
              </SelectTrigger>
              <SelectContent>
                {getEnumValues(LicenseTier).map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {LicenseTierLabels[tier as LicenseTier]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {getEnumValues(FeatureCategory).map((category) => (
                  <SelectItem key={category} value={category}>
                    {FeatureCategoryLabels[category as FeatureCategory]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Module */}
          <div className="space-y-2">
            <Label htmlFor="module">Module</Label>
            <Select
              value={formData.module}
              onValueChange={(value) => setFormData({ ...formData, module: value })}
            >
              <SelectTrigger id="module">
                <SelectValue placeholder="Select module" />
              </SelectTrigger>
              <SelectContent>
                {getEnumValues(FeatureModule).map((module) => (
                  <SelectItem key={module} value={module}>
                    {FeatureModuleLabels[module as FeatureModule]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Surface ID */}
          <div className="space-y-2">
            <Label htmlFor="surface_id">Surface ID</Label>
            <Input
              id="surface_id"
              value={formData.surface_id}
              onChange={(e) => setFormData({ ...formData, surface_id: e.target.value })}
              placeholder="e.g., members/analytics-dashboard"
            />
            <p className="text-xs text-muted-foreground">
              Unique identifier for the UI surface this feature controls
            </p>
          </div>

          {/* Surface Type */}
          <div className="space-y-2">
            <Label htmlFor="surface_type">Surface Type</Label>
            <Select
              value={formData.surface_type}
              onValueChange={(value) => setFormData({ ...formData, surface_type: value })}
            >
              <SelectTrigger id="surface_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {getEnumValues(SurfaceType).map((type) => (
                  <SelectItem key={type} value={type}>
                    {SurfaceTypeLabels[type as SurfaceType]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
