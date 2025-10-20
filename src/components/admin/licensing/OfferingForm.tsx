'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Save, Search } from 'lucide-react';
import { toast } from 'sonner';
import { type ProductOfferingComplete, type CreateProductOfferingDto } from '@/models/productOffering.model';
import { type LicenseFeatureBundleWithFeatures } from '@/models/licenseFeatureBundle.model';
import { type LicenseFeature } from '@/models/licenseFeature.model';
import {
  LicenseTier,
  LicenseTierLabels,
  ProductOfferingType,
  ProductOfferingTypeLabels,
} from '@/enums/licensing.enums';
import { getEnumValues } from '@/enums/helpers';

const DEFAULT_FORM_DATA: CreateProductOfferingDto = {
  code: '',
  name: '',
  description: '',
  offering_type: ProductOfferingType.SUBSCRIPTION,
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

type OfferingFormMode = 'create' | 'edit';

interface OfferingFormProps {
  mode: OfferingFormMode;
  offeringId?: string;
  redirectPath?: string;
}

export function OfferingForm({ mode, offeringId, redirectPath = '/admin/licensing' }: OfferingFormProps) {
  const router = useRouter();

  const [formData, setFormData] = useState<CreateProductOfferingDto>({ ...DEFAULT_FORM_DATA });
  const [bundles, setBundles] = useState<LicenseFeatureBundleWithFeatures[]>([]);
  const [features, setFeatures] = useState<LicenseFeature[]>([]);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [bundleSearch, setBundleSearch] = useState('');
  const [featureSearch, setFeatureSearch] = useState('');

  const [isLoadingBundles, setIsLoadingBundles] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [isLoadingOffering, setIsLoadingOffering] = useState(mode === 'edit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadBundles = useCallback(async () => {
    setIsLoadingBundles(true);
    try {
      const response = await fetch('/api/licensing/feature-bundles?withFeatures=true');
      const result = await response.json();

      if (response.ok && result.success) {
        setBundles(result.data ?? []);
      } else {
        toast.error(result.error ?? 'Failed to load bundles');
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

      if (response.ok && result.success) {
        setFeatures(result.data ?? []);
      } else {
        toast.error(result.error ?? 'Failed to load features');
      }
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setIsLoadingFeatures(false);
    }
  }, []);

  const loadOffering = useCallback(async () => {
    if (mode !== 'edit') {
      return;
    }

    if (!offeringId) {
      toast.error('Missing product offering identifier.');
      setIsLoadingOffering(false);
      return;
    }

    setIsLoadingOffering(true);
    try {
      const response = await fetch(`/api/licensing/product-offerings/${offeringId}?complete=true`);
      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        toast.error(result.error ?? 'Failed to load product offering');
        return;
      }

      const offering: ProductOfferingComplete = result.data;

      setFormData({
        code: offering.code,
        name: offering.name,
        description: offering.description ?? '',
        offering_type: (typeof offering.offering_type === 'string'
          ? offering.offering_type.toLowerCase()
          : ProductOfferingType.SUBSCRIPTION) as CreateProductOfferingDto['offering_type'],
        tier: (typeof offering.tier === 'string'
          ? (offering.tier.toLowerCase() as CreateProductOfferingDto['tier'])
          : LicenseTier.ESSENTIAL),
        billing_cycle: typeof offering.billing_cycle === 'string'
          ? offering.billing_cycle.toLowerCase() as CreateProductOfferingDto['billing_cycle']
          : null,
        base_price: offering.base_price ?? null,
        currency: (offering.currency ?? 'USD')?.toUpperCase(),
        max_users: offering.max_users ?? null,
        max_tenants: offering.max_tenants ?? null,
        is_active: offering.is_active,
        is_featured: offering.is_featured,
        sort_order: offering.sort_order ?? 0,
      });

      setSelectedBundleIds((offering.bundles ?? []).map((bundle) => bundle.id));
      setSelectedFeatureIds((offering.features ?? []).map((feature) => feature.id));
    } catch (error) {
      console.error('Error loading product offering:', error);
      toast.error('Failed to load product offering details');
    } finally {
      setIsLoadingOffering(false);
    }
  }, [mode, offeringId]);

  useEffect(() => {
    loadBundles();
    loadFeatures();
  }, [loadBundles, loadFeatures]);

  useEffect(() => {
    if (mode === 'edit') {
      loadOffering();
    }
  }, [mode, loadOffering]);

  const filteredBundles = useMemo(() => {
    if (!bundleSearch) {
      return bundles;
    }

    const query = bundleSearch.toLowerCase();
    return bundles.filter((bundle) =>
      [bundle.name, bundle.code, bundle.category].some((value) => value?.toLowerCase().includes(query))
    );
  }, [bundles, bundleSearch]);

  const bundlesByType = useMemo(() => {
    return filteredBundles.reduce<Record<string, LicenseFeatureBundleWithFeatures[]>>((accumulator, bundle) => {
      const key = bundle.bundle_type ?? 'uncategorized';
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(bundle);
      return accumulator;
    }, {});
  }, [filteredBundles]);

  const filteredFeatures = useMemo(() => {
    if (!featureSearch) {
      return features;
    }

    const query = featureSearch.toLowerCase();
    return features.filter((feature) =>
      [feature.name, feature.code, feature.category].some((value) => value?.toLowerCase().includes(query))
    );
  }, [features, featureSearch]);

  const featuresByCategory = useMemo(() => {
    return filteredFeatures.reduce<Record<string, LicenseFeature[]>>((accumulator, feature) => {
      const key = feature.category ?? 'uncategorized';
      if (!accumulator[key]) {
        accumulator[key] = [];
      }
      accumulator[key].push(feature);
      return accumulator;
    }, {});
  }, [filteredFeatures]);

  const filteredBundleIds = useMemo(() => filteredBundles.map((bundle) => bundle.id), [filteredBundles]);
  const filteredFeatureIds = useMemo(() => filteredFeatures.map((feature) => feature.id), [filteredFeatures]);

  const allVisibleBundlesSelected =
    filteredBundleIds.length > 0 && filteredBundleIds.every((id) => selectedBundleIds.includes(id));
  const anyVisibleBundleSelected = filteredBundleIds.some((id) => selectedBundleIds.includes(id));
  const allVisibleFeaturesSelected =
    filteredFeatureIds.length > 0 && filteredFeatureIds.every((id) => selectedFeatureIds.includes(id));
  const anyVisibleFeatureSelected = filteredFeatureIds.some((id) => selectedFeatureIds.includes(id));

  const handleFieldChange = <Key extends keyof CreateProductOfferingDto>(
    field: Key,
    value: CreateProductOfferingDto[Key]
  ) => {
    setFormData((previous) => {
      if (previous[field] === value) {
        return previous;
      }

      return {
        ...previous,
        [field]: value,
      };
    });
  };

  const handleNumberChange = (field: 'base_price' | 'max_users' | 'max_tenants' | 'sort_order', value: string) => {
    if (value === '') {
      handleFieldChange(field, null as never);
      return;
    }

    const parsed = field === 'base_price' ? parseFloat(value) : parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return;
    }

    handleFieldChange(field, parsed as never);
  };

  const toggleBundle = (bundleId: string) => {
    setSelectedBundleIds((previous) =>
      previous.includes(bundleId) ? previous.filter((id) => id !== bundleId) : [...previous, bundleId]
    );
  };

  const setBundleSelection = (bundleId: string, checked: boolean) => {
    setSelectedBundleIds((previous) => {
      const isSelected = previous.includes(bundleId);
      if (checked && !isSelected) {
        return [...previous, bundleId];
      }
      if (!checked && isSelected) {
        return previous.filter((id) => id !== bundleId);
      }
      return previous;
    });
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatureIds((previous) =>
      previous.includes(featureId) ? previous.filter((id) => id !== featureId) : [...previous, featureId]
    );
  };

  const setFeatureSelection = (featureId: string, checked: boolean) => {
    setSelectedFeatureIds((previous) => {
      const isSelected = previous.includes(featureId);
      if (checked && !isSelected) {
        return [...previous, featureId];
      }
      if (!checked && isSelected) {
        return previous.filter((id) => id !== featureId);
      }
      return previous;
    });
  };

  const selectVisibleBundles = () => {
    if (filteredBundleIds.length === 0) {
      return;
    }

    setSelectedBundleIds((previous) => {
      const additions = filteredBundleIds.filter((id) => !previous.includes(id));
      if (additions.length === 0) {
        return previous;
      }
      return [...previous, ...additions];
    });
  };

  const clearVisibleBundles = () => {
    if (filteredBundleIds.length === 0) {
      return;
    }

    setSelectedBundleIds((previous) => {
      const next = previous.filter((id) => !filteredBundleIds.includes(id));
      return next.length === previous.length ? previous : next;
    });
  };

  const selectVisibleFeatures = () => {
    if (filteredFeatureIds.length === 0) {
      return;
    }

    setSelectedFeatureIds((previous) => {
      const additions = filteredFeatureIds.filter((id) => !previous.includes(id));
      if (additions.length === 0) {
        return previous;
      }
      return [...previous, ...additions];
    });
  };

  const clearVisibleFeatures = () => {
    if (filteredFeatureIds.length === 0) {
      return;
    }

    setSelectedFeatureIds((previous) => {
      const next = previous.filter((id) => !filteredFeatureIds.includes(id));
      return next.length === previous.length ? previous : next;
    });
  };

  const handleCancel = () => {
    router.push(redirectPath);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payload = {
      ...formData,
      base_price: formData.base_price ?? null,
      max_users: formData.max_users ?? null,
      max_tenants: formData.max_tenants ?? null,
      sort_order: formData.sort_order ?? 0,
      bundle_ids: selectedBundleIds,
      feature_ids: selectedFeatureIds,
    };

    setIsSubmitting(true);
    try {
      const endpoint =
        mode === 'create'
          ? '/api/licensing/product-offerings'
          : `/api/licensing/product-offerings/${offeringId}`;
      const method = mode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error ?? 'Failed to save product offering');
        return;
      }

      toast.success(mode === 'create' ? 'Product offering created' : 'Product offering updated');
      router.push(redirectPath);
      router.refresh();
    } catch (error) {
      console.error('Error saving product offering:', error);
      toast.error('Failed to save product offering');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingOffering) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground">
          {mode === 'create' ? 'Create Product Offering' : 'Edit Product Offering'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'create'
            ? 'Define a new subscription plan and assign feature bundles before publishing.'
            : 'Update the subscription plan configuration and manage bundle assignments.'}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="code">Offering Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    placeholder="e.g. ESSENTIAL_MONTHLY"
                    onChange={(event) => handleFieldChange('code', event.target.value.toUpperCase())}
                    disabled={mode === 'edit'}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    placeholder="Essential Plan"
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description ?? ''}
                    placeholder="Describe what the offering includes."
                    onChange={(event) => handleFieldChange('description', event.target.value)}
                    rows={4}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="offering_type">Offering Type</Label>
                  <Select
                    value={formData.offering_type}
                    onValueChange={(value) => handleFieldChange('offering_type', value)}
                  >
                    <SelectTrigger id="offering_type">
                      <SelectValue placeholder="Select offering type" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEnumValues(ProductOfferingType).map((value) => (
                        <SelectItem key={value} value={value}>
                          {ProductOfferingTypeLabels[value as ProductOfferingType] ?? value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tier">License Tier</Label>
                  <Select value={formData.tier} onValueChange={(value) => handleFieldChange('tier', value)}>
                    <SelectTrigger id="tier">
                      <SelectValue placeholder="Select license tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {getEnumValues(LicenseTier).map((value) => (
                        <SelectItem key={value} value={value}>
                          {LicenseTierLabels[value as LicenseTier] ?? value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="billing_cycle">Billing Cycle</Label>
                  <Select
                    value={formData.billing_cycle ?? undefined}
                    onValueChange={(value) => handleFieldChange('billing_cycle', value as any)}
                  >
                    <SelectTrigger id="billing_cycle">
                      <SelectValue placeholder="Select billing cadence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="base_price">Base Price (USD)</Label>
                    <Input
                      id="base_price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.base_price ?? ''}
                      onChange={(event) => handleNumberChange('base_price', event.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Input
                      id="currency"
                      value={formData.currency ?? 'USD'}
                      onChange={(event) => handleFieldChange('currency', event.target.value.toUpperCase())}
                      maxLength={3}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="max_users">Max Users</Label>
                    <Input
                      id="max_users"
                      type="number"
                      min="0"
                      value={formData.max_users ?? ''}
                      onChange={(event) => handleNumberChange('max_users', event.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_tenants">Max Tenants</Label>
                    <Input
                      id="max_tenants"
                      type="number"
                      min="0"
                      value={formData.max_tenants ?? ''}
                      onChange={(event) => handleNumberChange('max_tenants', event.target.value)}
                      placeholder="Unlimited"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <Checkbox
                      id="is_active"
                      checked={Boolean(formData.is_active)}
                      onCheckedChange={(checked) => handleFieldChange('is_active', checked === true)}
                    />
                    <div>
                      <Label htmlFor="is_active" className="font-medium">
                        Active
                      </Label>
                      <p className="text-xs text-muted-foreground">Visible to sales and tenant assignment flows.</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 rounded-lg border p-3">
                    <Checkbox
                      id="is_featured"
                      checked={Boolean(formData.is_featured)}
                      onCheckedChange={(checked) => handleFieldChange('is_featured', checked === true)}
                    />
                    <div>
                      <Label htmlFor="is_featured" className="font-medium">
                        Featured Plan
                      </Label>
                      <p className="text-xs text-muted-foreground">Highlight this offering in plan selectors.</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={formData.sort_order ?? 0}
                    onChange={(event) => handleNumberChange('sort_order', event.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Feature Bundles ({selectedBundleIds.length} selected)
                  </Label>
                  <div className="flex items-center gap-2">
                    {isLoadingBundles && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectVisibleBundles}
                      disabled={isLoadingBundles || filteredBundleIds.length === 0 || allVisibleBundlesSelected}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearVisibleBundles}
                      disabled={isLoadingBundles || filteredBundleIds.length === 0 || !anyVisibleBundleSelected}
                    >
                      Unselect all
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={bundleSearch}
                    onChange={(event) => setBundleSearch(event.target.value)}
                    placeholder="Search bundles..."
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-72 border rounded-md">
                  <div className="p-3 space-y-4">
                    {Object.entries(bundlesByType).map(([category, categoryBundles]) => (
                      <div key={category}>
                        <h4 className="mb-2 text-sm font-semibold capitalize">{category.replace(/_/g, ' ')}</h4>
                        <div className="space-y-2">
                          {categoryBundles.map((bundle) => (
                            <div
                              key={bundle.id}
                              className="flex cursor-pointer items-center gap-3 rounded border p-2 transition hover:bg-muted"
                              onClick={() => toggleBundle(bundle.id)}
                            >
                              <Checkbox
                                checked={selectedBundleIds.includes(bundle.id)}
                                onCheckedChange={(checked) => setBundleSelection(bundle.id, checked === true)}
                                onClick={(event) => event.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{bundle.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {bundle.code}
                                  </Badge>
                                  {bundle.feature_count !== undefined && (
                                    <Badge variant="secondary" className="text-xs">
                                      {bundle.feature_count} features
                                    </Badge>
                                  )}
                                </div>
                                {bundle.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {bundle.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(bundlesByType).length === 0 && !isLoadingBundles && (
                      <p className="py-4 text-center text-sm text-muted-foreground">No bundles found.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Individual Features ({selectedFeatureIds.length} selected)
                  </Label>
                  <div className="flex items-center gap-2">
                    {isLoadingFeatures && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectVisibleFeatures}
                      disabled={isLoadingFeatures || filteredFeatureIds.length === 0 || allVisibleFeaturesSelected}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearVisibleFeatures}
                      disabled={isLoadingFeatures || filteredFeatureIds.length === 0 || !anyVisibleFeatureSelected}
                    >
                      Unselect all
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={featureSearch}
                    onChange={(event) => setFeatureSearch(event.target.value)}
                    placeholder="Search features..."
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-72 border rounded-md">
                  <div className="p-3 space-y-4">
                    {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                      <div key={category}>
                        <h4 className="mb-2 text-sm font-semibold capitalize">{category.replace(/_/g, ' ')}</h4>
                        <div className="space-y-2">
                          {categoryFeatures.map((feature) => (
                            <div
                              key={feature.id}
                              className="flex cursor-pointer items-center gap-3 rounded border p-2 transition hover:bg-muted"
                              onClick={() => toggleFeature(feature.id)}
                            >
                              <Checkbox
                                checked={selectedFeatureIds.includes(feature.id)}
                                onCheckedChange={(checked) => setFeatureSelection(feature.id, checked === true)}
                                onClick={(event) => event.stopPropagation()}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{feature.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {feature.code}
                                  </Badge>
                                </div>
                                {feature.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {feature.description}
                                  </p>
                                )}
                              </div>
                              <Badge variant="secondary" className="text-xs capitalize">
                                {feature.category}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(featuresByCategory).length === 0 && !isLoadingFeatures && (
                      <p className="py-4 text-center text-sm text-muted-foreground">No features found.</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </section>

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    {mode === 'create' ? (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Offering
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Update Offering
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
