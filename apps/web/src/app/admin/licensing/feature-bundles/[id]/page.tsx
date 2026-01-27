'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Loader2, Search, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { LicenseFeatureBundle, CreateLicenseFeatureBundleDto, UpdateLicenseFeatureBundleDto } from '@/models/licenseFeatureBundle.model';
import { LicenseFeature } from '@/models/licenseFeature.model';
import { BundleType, BundleTypeLabels, BundleTypeDescriptions } from '@/enums';

interface BundlePageProps {
  params: Promise<{ id: string }>;
}

export default function BundlePage({ params }: BundlePageProps) {
  const { id: bundleId } = use(params);
  const router = useRouter();
  const isCreateMode = bundleId === 'new';

  const [isLoading, setIsLoading] = useState(!isCreateMode);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [bundle, setBundle] = useState<LicenseFeatureBundle | null>(null);
  const [features, setFeatures] = useState<LicenseFeature[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [featureSearch, setFeatureSearch] = useState('');
  const [formData, setFormData] = useState<CreateLicenseFeatureBundleDto & UpdateLicenseFeatureBundleDto>({
    code: '',
    name: '',
    description: '',
    bundle_type: BundleType.MODULE,
    category: '',
    is_active: true,
    sort_order: 0,
  });

  useEffect(() => {
    if (!isCreateMode) {
      loadBundle();
    }
    loadFeatures();
  }, [bundleId, isCreateMode]);

  async function loadBundle() {
    try {
      const response = await fetch(`/api/licensing/feature-bundles/${bundleId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const bundleData = result.data;
        setBundle(bundleData);
        setFormData({
          code: bundleData.code,
          name: bundleData.name,
          description: bundleData.description,
          bundle_type: bundleData.bundle_type,
          category: bundleData.category,
          is_active: bundleData.is_active,
          sort_order: bundleData.sort_order,
        });

        // Load bundle features
        loadBundleFeatures();
      } else {
        toast.error('Failed to load bundle');
        router.push('/admin/licensing?tab=bundles');
      }
    } catch (error) {
      console.error('Error loading bundle:', error);
      toast.error('Failed to load bundle');
      router.push('/admin/licensing?tab=bundles');
    } finally {
      setIsLoading(false);
    }
  }

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
      const response = await fetch(`/api/licensing/feature-bundles/${bundleId}/features`);
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
    feature.code?.toLowerCase().includes(featureSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (isCreateMode && !formData.code?.trim()) {
      toast.error('Code is required');
      return;
    }

    setIsSaving(true);
    try {
      const url = isCreateMode
        ? '/api/licensing/feature-bundles'
        : `/api/licensing/feature-bundles/${bundleId}`;

      const method = isCreateMode ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          feature_ids: selectedFeatureIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(
          isCreateMode
            ? 'Feature bundle created successfully'
            : 'Feature bundle updated successfully'
        );
        router.push('/admin/licensing?tab=bundles');
      } else {
        toast.error(result.error || `Failed to ${isCreateMode ? 'create' : 'update'} bundle`);
      }
    } catch (error) {
      console.error(`Error ${isCreateMode ? 'creating' : 'updating'} bundle:`, error);
      toast.error(`Failed to ${isCreateMode ? 'create' : 'update'} bundle`);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isCreateMode && !bundle) {
    return (
      <div className="container mx-auto py-6">
        <p>Bundle not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/licensing?tab=bundles')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bundles
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isCreateMode ? 'Create Feature Bundle' : 'Edit Feature Bundle'}
            </h1>
            <p className="text-muted-foreground">
              {isCreateMode
                ? 'Create a new feature bundle and select features to include'
                : 'Update bundle details and features'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Bundle Details */}
        <Card>
          <CardHeader>
            <CardTitle>Bundle Details</CardTitle>
            <CardDescription>Basic information about the feature bundle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '_') })}
                placeholder="professional_features"
                required
                disabled={!isCreateMode}
                className={!isCreateMode ? 'bg-muted' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier (lowercase, underscores allowed). Cannot be changed after creation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Professional Features"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Comprehensive features for professional use"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bundle_type">Bundle Type *</Label>
              <Select
                value={formData.bundle_type}
                onValueChange={(value) => setFormData({ ...formData, bundle_type: value as BundleType })}
              >
                <SelectTrigger id="bundle_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(BundleType).map((type) => (
                    <SelectItem key={type} value={type}>
                      <div className="flex flex-col">
                        <span>{BundleTypeLabels[type]}</span>
                        <span className="text-xs text-muted-foreground">
                          {BundleTypeDescriptions[type]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={formData.category || ''}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="core, premium, enterprise"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order || 0}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
              />
              <Label htmlFor="is_active" className="cursor-pointer">
                Active
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Features */}
        <Card>
          <CardHeader>
            <CardTitle>Included Features</CardTitle>
            <CardDescription>
              Select features to include in this bundle ({selectedFeatureIds.length} selected)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search features..."
                value={featureSearch}
                onChange={(e) => setFeatureSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Feature List */}
            {isLoadingFeatures ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {filteredFeatures.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      No features found
                    </p>
                  ) : (
                    filteredFeatures.map((feature) => (
                      <div
                        key={feature.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`feature-${feature.id}`}
                          checked={selectedFeatureIds.includes(feature.id)}
                          onCheckedChange={() => toggleFeature(feature.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <Label
                            htmlFor={`feature-${feature.id}`}
                            className="font-medium cursor-pointer"
                          >
                            {feature.name}
                          </Label>
                          {feature.code && (
                            <Badge variant="outline" className="text-xs">
                              {feature.code}
                            </Badge>
                          )}
                          {feature.description && (
                            <p className="text-sm text-muted-foreground">
                              {feature.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="lg:col-span-2 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/licensing?tab=bundles')}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isCreateMode ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                {isCreateMode ? <Plus className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {isCreateMode ? 'Create Bundle' : 'Update Bundle'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
