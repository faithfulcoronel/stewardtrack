'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { LicenseFeatureBundle, UpdateLicenseFeatureBundleDto } from '@/models/licenseFeatureBundle.model';
import { LicenseFeature } from '@/models/licenseFeature.model';

interface EditBundleDialogProps {
  bundle: LicenseFeatureBundle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditBundleDialog({ bundle, open, onOpenChange, onSuccess }: EditBundleDialogProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [features, setFeatures] = useState<LicenseFeature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [featureSearch, setFeatureSearch] = useState('');
  const [formData, setFormData] = useState<UpdateLicenseFeatureBundleDto>({
    name: bundle.name,
    description: bundle.description,
    bundle_type: bundle.bundle_type,
    category: bundle.category,
    is_active: bundle.is_active,
    sort_order: bundle.sort_order,
  });

  useEffect(() => {
    setFormData({
      name: bundle.name,
      description: bundle.description,
      bundle_type: bundle.bundle_type,
      category: bundle.category,
      is_active: bundle.is_active,
      sort_order: bundle.sort_order,
    });
  }, [bundle]);

  useEffect(() => {
    if (open) {
      loadFeatures();
      loadBundleFeatures();
    }
  }, [open, bundle.id]);

  async function loadFeatures() {
    setIsLoadingFeatures(true);
    try {
      const response = await fetch('/api/licensing/features');
      const result = await response.json();

      if (result.success) {
        setFeatures(result.data || []);
      } else {
        toast.error('Failed to load features');
      }
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setIsLoadingFeatures(false);
    }
  }

  async function loadBundleFeatures() {
    try {
      const response = await fetch(`/api/licensing/feature-bundles/${bundle.id}/features`);
      const result = await response.json();

      if (result.success) {
        const currentFeatureIds = result.data.map((f: any) => f.id);
        setSelectedFeatureIds(currentFeatureIds);
      }
    } catch (error) {
      console.error('Error loading bundle features:', error);
    }
  }

  function toggleFeature(featureId: string) {
    setSelectedFeatureIds(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  }

  const filteredFeatures = features.filter(feature =>
    feature.name.toLowerCase().includes(featureSearch.toLowerCase()) ||
    feature.code.toLowerCase().includes(featureSearch.toLowerCase()) ||
    feature.category.toLowerCase().includes(featureSearch.toLowerCase())
  );

  const featuresByCategory = filteredFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) {
      acc[feature.category] = [];
    }
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, LicenseFeature[]>);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/licensing/feature-bundles/${bundle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          feature_ids: selectedFeatureIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Feature bundle updated successfully');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to update bundle');
      }
    } catch (error) {
      console.error('Error updating bundle:', error);
      toast.error('Failed to update bundle');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Feature Bundle</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Code</Label>
                <Input value={bundle.code} disabled className="bg-gray-50" />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bundle_type">Bundle Type</Label>
                <Select
                  value={formData.bundle_type}
                  onValueChange={(value: any) => setFormData({ ...formData, bundle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="add-on">Add-on</SelectItem>
                    <SelectItem value="module">Module</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Features ({selectedFeatureIds.length} selected)</Label>
                {isLoadingFeatures && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search features..."
                  value={featureSearch}
                  onChange={(e) => setFeatureSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-64 border rounded-md">
                <div className="p-3 space-y-4">
                  {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                    <div key={category}>
                      <h4 className="font-semibold text-sm mb-2 capitalize">{category}</h4>
                      <div className="space-y-2">
                        {categoryFeatures.map((feature) => (
                          <div
                            key={feature.id}
                            className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                            onClick={() => toggleFeature(feature.id)}
                          >
                            <Checkbox
                              checked={selectedFeatureIds.includes(feature.id)}
                              onCheckedChange={() => toggleFeature(feature.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{feature.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {feature.code}
                                </Badge>
                              </div>
                              {feature.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {feature.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredFeatures.length === 0 && !isLoadingFeatures && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No features found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Update Bundle
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
