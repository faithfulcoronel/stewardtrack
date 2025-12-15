'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Package, Users, BarChart3, Shield } from 'lucide-react';
import { ProductOfferingsManager } from './ProductOfferingsManager';
import { FeatureBundlesManager } from './FeatureBundlesManager';
import { LicenseAssignmentsManager } from './LicenseAssignmentsManager';
import { LicensingAnalytics } from './LicensingAnalytics';
import { FeaturesManager } from './FeaturesManager';

type TabValue = 'offerings' | 'features' | 'bundles' | 'assignments' | 'analytics';

const VALID_TABS: TabValue[] = ['offerings', 'features', 'bundles', 'assignments', 'analytics'];

export function LicensingStudio() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get tab from URL or default to 'offerings'
  const tabParam = searchParams.get('tab') as TabValue | null;
  const initialTab = tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'offerings';

  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);

  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as TabValue;
    setActiveTab(newTab);

    // Update URL without page reload
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(`/admin/licensing?${params.toString()}`, { scroll: false });
  };

  // Sync activeTab with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as TabValue | null;
    if (tabFromUrl && VALID_TABS.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Licensing Studio</h1>
          <p className="text-gray-600 mt-1">
            Manage product offerings, feature bundles, and tenant licenses
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="offerings" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Offerings
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="bundles" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Feature Bundles
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            License Assignments
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offerings">
          <ProductOfferingsManager />
        </TabsContent>

        <TabsContent value="features">
          <FeaturesManager />
        </TabsContent>

        <TabsContent value="bundles">
          <FeatureBundlesManager />
        </TabsContent>

        <TabsContent value="assignments">
          <LicenseAssignmentsManager />
        </TabsContent>

        <TabsContent value="analytics">
          <LicensingAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}