'use client';

import { useRouter } from 'next/navigation';
import { FeaturePermissionWizard, type WizardData } from '@/components/licensing/FeaturePermissionWizard';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function CreateFeaturePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleComplete = async (data: WizardData) => {
    try {
      setError(null);

      // Step 1: Create the feature
      const featureResponse = await fetch('/api/licensing/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          tier: data.tier,
          category: data.category,
          surface_id: data.surface_id,
          surface_type: data.surface_type,
          module: data.module,
          is_active: true,
        }),
      });

      if (!featureResponse.ok) {
        const errorData = await featureResponse.json();
        throw new Error(errorData.error || 'Failed to create feature');
      }

      const featureResult = await featureResponse.json();
      const featureId = featureResult.data.id;

      // Step 2: Create permissions with templates
      for (const permission of data.permissions) {
        const permissionResponse = await fetch(
          `/api/licensing/features/${featureId}/permissions`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              permission: {
                permission_code: permission.permission_code,
                display_name: permission.display_name,
                description: permission.description,
                is_required: permission.is_required,
                display_order: permission.display_order,
              },
              roleTemplates: data.roleTemplates[permission.permission_code] || [],
            }),
          }
        );

        if (!permissionResponse.ok) {
          const errorData = await permissionResponse.json();
          throw new Error(
            `Failed to create permission ${permission.permission_code}: ${errorData.error}`
          );
        }
      }

      // Success!
      setSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin/licensing/features');
      }, 2000);
    } catch (err: any) {
      console.error('Error creating feature:', err);
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleCancel = () => {
    router.push('/admin/licensing/features');
  };

  return (
    <div className="container mx-auto py-6">
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Feature created successfully! Redirecting to feature list...
          </AlertDescription>
        </Alert>
      )}

      {!success && (
        <FeaturePermissionWizard onComplete={handleComplete} onCancel={handleCancel} />
      )}
    </div>
  );
}
