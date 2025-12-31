'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle, AlertCircle, Edit, Eye, Trash2 } from 'lucide-react';
import { FeaturePermissionWizard, type WizardData, type WizardMode } from '@/components/licensing/FeaturePermissionWizard';

interface Feature {
  id: string;
  name: string;
  description: string;
  tier?: string | null;
  category: string;
  module?: string | null;
  code?: string | null;  // Database column is 'code', not 'feature_code'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  permission_code: string;
  display_name: string;
  description: string;
  is_required: boolean;
  display_order: number;
  role_templates: Array<{
    id: string;
    role_key: string;
    is_recommended: boolean;
    reason?: string;
  }>;
}

export default function FeatureDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const router = useRouter();

  const [mode, setMode] = useState<WizardMode>('view');
  const [feature, setFeature] = useState<Feature | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatureData();
  }, [unwrappedParams.id]);

  const fetchFeatureData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch feature details
      const featureResponse = await fetch(`/api/licensing/features/${unwrappedParams.id}`);
      if (!featureResponse.ok) {
        const errorData = await featureResponse.json();
        throw new Error(errorData.error || 'Failed to load feature');
      }
      const featureData = await featureResponse.json();
      setFeature(featureData.data);

      // Fetch permissions
      const permissionsResponse = await fetch(
        `/api/licensing/features/${unwrappedParams.id}/permissions`
      );
      if (permissionsResponse.ok) {
        const permissionsData = await permissionsResponse.json();
        setPermissions(permissionsData.data || []);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async (data: WizardData) => {
    try {
      console.log('[DEBUG PAGE] handleComplete called with data:', JSON.stringify(data, null, 2));
      setError(null);

      if (mode === 'edit') {
        // Update feature
        console.log('[DEBUG PAGE] Updating feature...');
        const featureResponse = await fetch(`/api/licensing/features/${unwrappedParams.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.name,
            description: data.description,
            tier: data.tier,
            category: data.category,
            code: data.feature_code || null,  // Map 'feature_code' from wizard to 'code' for DB
          }),
        });

        if (!featureResponse.ok) {
          const errorData = await featureResponse.json();
          throw new Error(errorData.error || 'Failed to update feature');
        }
        console.log('[DEBUG PAGE] Feature updated successfully');

        // Update permissions and role templates
        console.log('[DEBUG PAGE] Processing permissions:', data.permissions.length);
        for (const permission of data.permissions) {
          console.log('[DEBUG PAGE] Processing permission:', permission.permission_code);

          // Check if permission already exists
          const existingPermission = permissions.find(p => p.permission_code === permission.permission_code);
          const roleTemplates = data.roleTemplates[permission.permission_code] || [];

          if (existingPermission) {
            // Update existing permission
            console.log('[DEBUG PAGE] Updating existing permission:', existingPermission.id);
            const updateResponse = await fetch(
              `/api/licensing/features/permissions/${existingPermission.id}`,
              {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  permission: {
                    display_name: permission.display_name,
                    description: permission.description,
                    is_required: permission.is_required,
                    display_order: permission.display_order,
                  },
                  roleTemplates,
                }),
              }
            );

            if (!updateResponse.ok) {
              const errorData = await updateResponse.json();
              console.error('[DEBUG PAGE] Failed to update permission:', errorData);
              throw new Error(errorData.error || `Failed to update permission: ${permission.permission_code}`);
            }
            console.log('[DEBUG PAGE] Permission updated successfully:', permission.permission_code);
          } else {
            // Create new permission
            console.log('[DEBUG PAGE] Creating new permission:', permission.permission_code);
            const createResponse = await fetch(
              `/api/licensing/features/${unwrappedParams.id}/permissions`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  permission,
                  roleTemplates,
                }),
              }
            );

            if (!createResponse.ok) {
              const errorData = await createResponse.json();
              console.error('[DEBUG PAGE] Failed to create permission:', errorData);
              throw new Error(errorData.error || `Failed to create permission: ${permission.permission_code}`);
            }
            console.log('[DEBUG PAGE] Permission created successfully:', permission.permission_code);
          }
        }

        // Delete permissions that were removed
        const permissionCodesToKeep = data.permissions.map(p => p.permission_code);
        const permissionsToDelete = permissions.filter(p => !permissionCodesToKeep.includes(p.permission_code));

        console.log('[DEBUG PAGE] Deleting removed permissions:', permissionsToDelete.length);
        for (const permission of permissionsToDelete) {
          console.log('[DEBUG PAGE] Deleting permission:', permission.id);
          const deleteResponse = await fetch(
            `/api/licensing/features/permissions/${permission.id}`,
            { method: 'DELETE' }
          );

          if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json();
            console.error('[DEBUG PAGE] Failed to delete permission:', errorData);
            throw new Error(errorData.error || `Failed to delete permission: ${permission.permission_code}`);
          }
          console.log('[DEBUG PAGE] Permission deleted successfully:', permission.permission_code);
        }

        console.log('[DEBUG PAGE] All permissions processed successfully');
        setSuccess('Feature and permissions updated successfully');
        setMode('view');
        await fetchFeatureData();

        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('[DEBUG PAGE] Error in handleComplete:', err);
      console.error('[DEBUG PAGE] Error stack:', err.stack);
      setError(err.message || 'An unexpected error occurred');
    }
  };

  const handleCancel = () => {
    if (mode === 'view') {
      router.push('/admin/licensing?tab=features');
    } else {
      setMode('view');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this feature? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/licensing/features/${unwrappedParams.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/admin/licensing?tab=features');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete feature');
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      setError('An error occurred while deleting the feature');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading feature details...</p>
        </div>
      </div>
    );
  }

  if (error && !feature) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Feature not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/licensing?tab=features')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Features
        </Button>
      </div>
    );
  }

  if (!feature) return null;

  // Prepare wizard data from feature and permissions
  const wizardData: WizardData = {
    name: feature.name,
    description: feature.description,
    tier: (feature.tier as any) || 'professional',
    category: feature.category,
    feature_code: feature.code || '',  // Map 'code' from DB to 'feature_code' for wizard
    permissions: permissions.map(p => ({
      permission_code: p.permission_code,
      display_name: p.display_name,
      description: p.description,
      is_required: p.is_required,
      display_order: p.display_order,
    })),
    roleTemplates: permissions.reduce((acc, p) => {
      acc[p.permission_code] = p.role_templates.map(rt => ({
        role_key: rt.role_key,
        is_recommended: rt.is_recommended,
        reason: rt.reason,
      }));
      return acc;
    }, {} as Record<string, Array<{ role_key: string; is_recommended: boolean; reason?: string }>>),
  };

  return (
    <div className="container mx-auto py-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/licensing?tab=features')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Features
        </Button>
        <div className="flex gap-2">
          {mode === 'view' && (
            <>
              <Button variant="outline" onClick={() => setMode('edit')}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Feature
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
          {mode === 'edit' && (
            <Button variant="outline" onClick={() => setMode('view')}>
              <Eye className="mr-2 h-4 w-4" />
              View Mode
            </Button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Wizard */}
      <FeaturePermissionWizard
        mode={mode}
        featureId={unwrappedParams.id}
        initialData={wizardData}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
