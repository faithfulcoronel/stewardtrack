'use client';

import React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Award, Package, Users, BarChart3 } from 'lucide-react';
import { ProductOfferingsManager } from './ProductOfferingsManager';
import { FeatureBundlesManager } from './FeatureBundlesManager';
import { LicenseAssignmentsManager } from './LicenseAssignmentsManager';
import { LicensingAnalytics } from './LicensingAnalytics';

export function LicensingStudio() {
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
      <Tabs defaultValue="offerings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="offerings" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Offerings
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
