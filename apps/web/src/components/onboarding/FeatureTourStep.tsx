'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

interface FeatureTourStepProps {
  data: Record<string, any>;
  onNext: (data: any) => Promise<void>;
  onBack: () => void;
  onComplete: () => Promise<void>;
  isSaving: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
}

interface Feature {
  id: string;
  code: string;
  name: string;
  category: string;
  description?: string;
}

interface Bundle {
  id: string;
  code: string;
  name: string;
  bundle_type: string;
  category: string;
  description?: string;
  features: Feature[];
  feature_count: number;
}

export default function FeatureTourStep({
  onNext,
  isSaving,
}: FeatureTourStepProps) {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [individualFeatures, setIndividualFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGrantedFeatures();
  }, []);

  async function loadGrantedFeatures() {
    try {
      const response = await fetch('/api/licensing/summary');
      const result = await response.json();

      if (result.success && result.data) {
        // Get bundles with features
        if (Array.isArray(result.data.licensed_bundles)) {
          setBundles(result.data.licensed_bundles);
        }

        // Get individual features (those granted directly, not through bundles)
        if (Array.isArray(result.data.licensed_features)) {
          setIndividualFeatures(result.data.licensed_features);
        }
      }
    } catch (error) {
      console.error('Error loading features:', error);
      toast.error('Failed to load features');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleContinue() {
    await onNext({ feature_tour_data: { tour_viewed: true } });
  }

  function groupBundlesByType(bundles: Bundle[]): Record<string, Bundle[]> {
    return bundles.reduce((acc, bundle) => {
      const type = bundle.bundle_type || 'Other';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(bundle);
      return acc;
    }, {} as Record<string, Bundle[]>);
  }

  function groupFeaturesByCategory(features: Feature[]): Record<string, Feature[]> {
    return features.reduce((acc, feature) => {
      const category = feature.category || 'General';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(feature);
      return acc;
    }, {} as Record<string, Feature[]>);
  }

  const bundlesByType = groupBundlesByType(bundles);
  const featuresByCategory = groupFeaturesByCategory(individualFeatures);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasContent = bundles.length > 0 || individualFeatures.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3 pb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Your Available Features
            </h3>
            <p className="text-sm text-muted-foreground">
              Here's what you can do with your subscription plan
            </p>
          </div>
        </div>
      </div>

      {!hasContent ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No features available</CardTitle>
            <CardDescription>
              Your subscription plan doesn't have any features configured yet.
              Please contact support if this seems incorrect.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Feature Bundles Section */}
          {Object.keys(bundlesByType).length > 0 && (
            <div className="space-y-4">
              {Object.entries(bundlesByType).map(([type, typeBundles]) => (
                <div key={type} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-foreground capitalize">
                      {type.replace(/_/g, ' ')}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      {typeBundles.length} {typeBundles.length === 1 ? 'bundle' : 'bundles'}
                    </Badge>
                  </div>

                  <div className="grid gap-3">
                    {typeBundles.map((bundle) => (
                      <Card key={bundle.id} className="border-l-4 border-l-primary/50">
                        <CardHeader className="py-4">
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <Check className="h-4 w-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <CardTitle className="text-base font-semibold">
                                    {bundle.name}
                                  </CardTitle>
                                  <Badge variant="outline" className="text-xs">
                                    {bundle.code}
                                  </Badge>
                                  {bundle.feature_count > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {bundle.feature_count} {bundle.feature_count === 1 ? 'feature' : 'features'}
                                    </Badge>
                                  )}
                                </div>
                                {bundle.description && (
                                  <CardDescription className="text-sm">
                                    {bundle.description}
                                  </CardDescription>
                                )}
                              </div>
                            </div>

                            {/* Bundle Features */}
                            {bundle.features && bundle.features.length > 0 && (
                              <div className="ml-11 space-y-2 border-l-2 border-muted pl-4">
                                {bundle.features.map((feature) => (
                                  <div key={feature.id} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">
                                        {feature.name}
                                      </span>
                                      <Badge variant="outline" className="text-xs">
                                        {feature.code}
                                      </Badge>
                                    </div>
                                    {feature.description && (
                                      <p className="text-xs text-muted-foreground">
                                        {feature.description}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Individual Features Section */}
          {Object.keys(featuresByCategory).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold text-foreground">
                  Additional Features
                </h4>
              </div>

              {Object.entries(featuresByCategory).map(([category, categoryFeatures]) => (
                <div key={category} className="space-y-3">
                  <h5 className="text-sm font-semibold text-muted-foreground capitalize">
                    {category.replace(/_/g, ' ')}
                  </h5>

                  <div className="grid gap-3">
                    {categoryFeatures.map((feature) => (
                      <Card key={feature.id} className="border-l-4 border-l-primary/50">
                        <CardHeader className="py-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <CardTitle className="text-sm font-medium">
                                  {feature.name}
                                </CardTitle>
                                <Badge variant="outline" className="text-xs">
                                  {feature.code}
                                </Badge>
                              </div>
                              {feature.description && (
                                <CardDescription className="text-xs">
                                  {feature.description}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Pro Tip
        </h4>
        <p className="text-sm text-muted-foreground">
          You can upgrade your plan anytime to unlock additional features. Visit the
          Billing section in settings to explore available plans.
        </p>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Continue'
          )}
        </Button>
      </div>
    </div>
  );
}
