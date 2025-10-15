'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { ProductOfferingComplete, CreateProductOfferingDto } from '@/models/productOffering.model';
import { LicenseFeatureBundleWithFeatures } from '@/models/licenseFeatureBundle.model';
import { LicenseFeature } from '@/models/licenseFeature.model';
import {
  LicenseTier,
  LicenseTierLabels,
  ProductOfferingType,
  ProductOfferingTypeLabels,
  getEnumValues,
} from '@/enums/licensing.enums';

const DEFAULT_FORM_DATA: CreateProductOfferingDto = {
  code: '',
  name: '',
  description: '',
  offering_type: 'subscription',
  tier: LicenseTier.ESSENTIAL,
  billing_cycle: 'monthly',
  base_price: 0,
  currency: 'USD',
  max_users: null,
  max_tenants: 1,
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

interface OfferingFormDialogProps {
  mode: 'create' | 'edit';
  offering?: ProductOfferingComplete | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function OfferingFormDialog({
  mode,
  offering,
  open,
  onOpenChange,
  onSuccess
}: OfferingFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [bundles, setBundles] = useState<LicenseFeatureBundleWithFeatures[]>([]);
  const [features, setFeatures] = useState<LicenseFeature[]>([]);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [bundleSearch, setBundleSearch] = useState('');
  const [featureSearch, setFeatureSearch] = useState('');

  const [formData, setFormData] = useState<CreateProductOfferingDto>(() => ({
    ...DEFAULT_FORM_DATA,
  }));

  const offeringId = offering?.id ?? null;
  const hasInitializedRef = useRef(false);
  const previousOfferingIdRef = useRef<string | null>(null);

  const clearSelections = useCallback(() => {
    setSelectedBundleIds([]);
    setSelectedFeatureIds([]);
    setBundleSearch('');
    setFeatureSearch('');
  }, []);

  const resetFormState = useCallback(() => {
    setFormData({ ...DEFAULT_FORM_DATA });
    clearSelections();
  }, [clearSelections]);

  const applyOfferingToForm = useCallback((current: ProductOfferingComplete) => {
    setFormData({
      code: current.code,
      name: current.name,
      description: current.description,
      offering_type: current.offering_type,
      tier: current.tier,
      billing_cycle: current.billing_cycle,
      base_price: current.base_price,
      currency: current.currency,
      max_users: current.max_users,
      max_tenants: current.max_tenants,
      is_active: current.is_active,
      is_featured: current.is_featured,
      sort_order: current.sort_order,
    });
    clearSelections();
  }, [clearSelections]);

  const loadBundles = useCallback(async () => {
    setIsLoadingBundles(true);
    try {
      const response = await fetch('/api/licensing/feature-bundles?withFeatures=true');
      const result = await response.json();

      if (result.success) {
        setBundles(result.data || []);
      } else {
        toast.error('Failed to load bundles');
      }
    } catch (error) {
      console.error('Error loading bundles:', error);
      toast.error('Failed to load bundles');
    } finally {
      setIsLoadingBundles(false);
    }
  }, []);

  const loadFeatures = useCallback(async () => {
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
  }, []);

  const loadOfferingBundles = useCallback(async () => {
    if (!offeringId) {
      return;
    }

    try {
      const response = await fetch(`/api/licensing/product-offerings/${offeringId}/bundles`);
      const result = await response.json();

      if (result.success) {
        const bundleIds = (result.data || []).map((b: any) => b.id);
        setSelectedBundleIds(bundleIds);
      }
    } catch (error) {
      console.error('Error loading offering bundles:', error);
    }
  }, [offeringId]);

  const loadOfferingFeatures = useCallback(async () => {
    if (!offeringId) {
      return;
    }

    try {
      const response = await fetch(`/api/licensing/product-offerings/${offeringId}?withFeatures=true`);
      const result = await response.json();

      if (result.success && result.data.features) {
        const featureIds = (result.data.features || []).map((f: any) => f.id);
        setSelectedFeatureIds(featureIds);
      }
    } catch (error) {
      console.error('Error loading offering features:', error);
    }
  }, [offeringId]);

  useEffect(() => {
    if (!open) {
      hasInitializedRef.current = false;
      previousOfferingIdRef.current = null;
      return;
    }

    const hasOfferingChanged = previousOfferingIdRef.current !== offeringId;
    const isFirstOpen = !hasInitializedRef.current;

    if (!isFirstOpen && !hasOfferingChanged) {
      return;
    }

    hasInitializedRef.current = true;
    previousOfferingIdRef.current = offeringId;

    if (mode === 'edit' && offering) {
      applyOfferingToForm(offering);
      void loadOfferingBundles();
      void loadOfferingFeatures();
    } else {
      resetFormState();
    }

    void loadBundles();
    void loadFeatures();
  }, [
    open,
    mode,
    offering,
    offeringId,
    applyOfferingToForm,
    resetFormState,
    loadBundles,
    loadFeatures,
    loadOfferingBundles,
    loadOfferingFeatures,
  ]);

  function toggleBundle(bundleId: string) {
    setSelectedBundleIds(prev =>
      prev.includes(bundleId)
        ? prev.filter(id => id !== bundleId)
        : [...prev, bundleId]
    );
  }

  function toggleFeature(featureId: string) {
    setSelectedFeatureIds(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  }

  const filteredBundles = bundles.filter(bundle =>
    bundle.name.toLowerCase().includes(bundleSearch.toLowerCase()) ||
    bundle.code.toLowerCase().includes(bundleSearch.toLowerCase()) ||
    bundle.category.toLowerCase().includes(bundleSearch.toLowerCase())
  );

  const bundlesByCategory = filteredBundles.reduce((acc, bundle) => {
    if (!acc[bundle.category]) {
      acc[bundle.category] = [];
    }
    acc[bundle.category].push(bundle);
    return acc;
  }, {} as Record<string, LicenseFeatureBundleWithFeatures[]>);

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

    if (!formData.name || !formData.code) {
      toast.error('Name and code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const url = mode === 'create'
        ? '/api/licensing/product-offerings'
        : `/api/licensing/product-offerings/${offering!.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bundle_ids: selectedBundleIds,
          feature_ids: selectedFeatureIds,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Product offering ${mode === 'create' ? 'created' : 'updated'} successfully`);
        onOpenChange(false);
        onSuccess();

        // Reset form for create mode
        if (mode === 'create') {
          setFormData({ ...DEFAULT_FORM_DATA });
          setSelectedBundleIds([]);
          setSelectedFeatureIds([]);
          setBundleSearch('');
          setFeatureSearch('');
        }
      } else {
        toast.error(result.error || `Failed to ${mode} product offering`);
      }
    } catch (error) {
      console.error(`Error ${mode}ing product offering:`, error);
      toast.error(`Failed to ${mode} product offering`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Product Offering' : 'Edit Product Offering'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4 overflow-y-auto pr-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Professional Plan"
                  required
                />
              </div>

              <div>
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="prof-plan"
                  disabled={mode === 'edit'}
                  className={mode === 'edit' ? 'bg-gray-50' : ''}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this offering..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="offering_type">Offering Type</Label>
                <Select
                  value={formData.offering_type}
                  onValueChange={(value: any) => setFormData({ ...formData, offering_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getEnumValues(ProductOfferingType).map((type) => (
                      <SelectItem key={type} value={type}>
                        {ProductOfferingTypeLabels[type as ProductOfferingType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tier">Tier</Label>
                <Select
                  value={formData.tier}
                  onValueChange={(value: any) => setFormData({ ...formData, tier: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="base_price">Base Price</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  value={formData.base_price || ''}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={formData.currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="USD"
                />
              </div>

              <div>
                <Label htmlFor="billing_cycle">Billing Cycle</Label>
                <Select
                  value={formData.billing_cycle || 'monthly'}
                  onValueChange={(value: any) => setFormData({ ...formData, billing_cycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="max_users">Max Users (optional)</Label>
                <Input
                  id="max_users"
                  type="number"
                  value={formData.max_users || ''}
                  onChange={(e) => setFormData({ ...formData, max_users: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <Label htmlFor="max_tenants">Max Tenants</Label>
                <Input
                  id="max_tenants"
                  type="number"
                  value={formData.max_tenants}
                  onChange={(e) => setFormData({ ...formData, max_tenants: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: !!checked })}
                />
                <Label htmlFor="is_active" className="cursor-pointer">Active</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: !!checked })}
                />
                <Label htmlFor="is_featured" className="cursor-pointer">Featured</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Feature Bundles ({selectedBundleIds.length} selected)</Label>
                {isLoadingBundles && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bundles..."
                  value={bundleSearch}
                  onChange={(e) => setBundleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-64 border rounded-md">
                <div className="p-3 space-y-4">
                  {Object.entries(bundlesByCategory).map(([category, categoryBundles]) => (
                    <div key={category}>
                      <h4 className="font-semibold text-sm mb-2 capitalize">{category}</h4>
                      <div className="space-y-2">
                        {categoryBundles.map((bundle) => (
                          <div
                            key={bundle.id}
                            className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent cursor-pointer"
                            onClick={() => toggleBundle(bundle.id)}
                          >
                            <Checkbox
                              checked={selectedBundleIds.includes(bundle.id)}
                              onCheckedChange={() => toggleBundle(bundle.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{bundle.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {bundle.code}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {bundle.bundle_type}
                                </Badge>
                                {bundle.feature_count !== undefined && (
                                  <Badge variant="default" className="text-xs">
                                    {bundle.feature_count} features
                                  </Badge>
                                )}
                              </div>
                              {bundle.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {bundle.description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredBundles.length === 0 && !isLoadingBundles && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No bundles found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Individual Features ({selectedFeatureIds.length} selected)</Label>
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
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                            onClick={() => toggleFeature(feature.id)}
                          >
                            <Checkbox
                              checked={selectedFeatureIds.includes(feature.id)}
                              onCheckedChange={() => toggleFeature(feature.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{feature.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {feature.code}
                                </Badge>
                              </div>
                              {feature.description && (
                                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {feature.description}
                                </div>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {feature.category}
                            </Badge>
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
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {mode === 'create' ? 'Creating...' : 'Updating...'}
                </>
              ) : (
                <>
                  {mode === 'create' ? (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Offering
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Offering
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
