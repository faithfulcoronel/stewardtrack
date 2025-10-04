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

export default function FeatureTourStep({
  onNext,
  isSaving,
}: FeatureTourStepProps) {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGrantedFeatures();
  }, []);

  async function loadGrantedFeatures() {
    try {
      const response = await fetch('/api/licensing/summary');
      const result = await response.json();

      if (result.success && result.data) {
        // Get features from licensed bundles
        const allFeatures: Feature[] = [];
        if (result.data.licensed_bundles) {
          result.data.licensed_bundles.forEach((bundle: any) => {
            if (bundle.features) {
              allFeatures.push(...bundle.features);
            }
          });
        }

        // Remove duplicates
        const uniqueFeatures = allFeatures.filter(
          (feature, index, self) =>
            index === self.findIndex((f) => f.id === feature.id)
        );

        setFeatures(uniqueFeatures);
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

  const categorizedFeatures = groupFeaturesByCategory(features);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

      {Object.keys(categorizedFeatures).length === 0 ? (
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
          {Object.entries(categorizedFeatures).map(([category, categoryFeatures]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">
                  {category}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {categoryFeatures.length}
                </Badge>
              </div>

              <div className="grid gap-3">
                {categoryFeatures.map((feature) => (
                  <Card key={feature.id} className="border-l-4 border-l-primary/50">
                    <CardHeader className="py-3">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                          <Check className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-sm font-medium">
                            {feature.name}
                          </CardTitle>
                          {feature.description && (
                            <CardDescription className="text-xs mt-1">
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
