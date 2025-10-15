'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Shield,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Feature {
  id: string;
  name: string;
  description: string;
  tier?: string | null;
  category: string;
  surface_id?: string | null;
  surface_type?: string | null;
  module?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Permission {
  id: string;
  permission_code: string;
  display_name: string;
  description: string;
  category: string;
  action: string;
  is_required: boolean;
  display_order: number;
  role_templates: Array<{
    id: string;
    role_key: string;
    is_recommended: boolean;
    reason?: string;
  }>;
}

const TIER_COLORS: Record<string, string> = {
  essential: 'bg-gray-100 text-gray-800',
  professional: 'bg-blue-100 text-blue-800',
  enterprise: 'bg-purple-100 text-purple-800',
  premium: 'bg-amber-100 text-amber-800',
};

const DEFAULT_TIER_BADGE = 'bg-gray-100 text-gray-600';
const DEFAULT_TIER_LABEL = 'Not set';

const getTierPresentation = (tier?: string | null) => {
  if (!tier) {
    return { className: DEFAULT_TIER_BADGE, label: DEFAULT_TIER_LABEL };
  }

  const normalizedTier = tier.trim().toLowerCase();

  if (!normalizedTier) {
    return { className: DEFAULT_TIER_BADGE, label: DEFAULT_TIER_LABEL };
  }

  const className = TIER_COLORS[normalizedTier] || 'bg-gray-100 text-gray-800';
  const label = normalizedTier.charAt(0).toUpperCase() + normalizedTier.slice(1);

  return { className, label };
};

const ROLE_LABELS: Record<string, string> = {
  tenant_admin: 'Tenant Admin',
  staff: 'Staff',
  volunteer: 'Volunteer',
  member: 'Member',
};

export default function FeatureDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const router = useRouter();
  const [feature, setFeature] = useState<Feature | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFeatureDetails();
    fetchPermissions();
  }, [unwrappedParams.id]);

  const fetchFeatureDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/licensing/features/${unwrappedParams.id}`);
      if (response.ok) {
        const data = await response.json();
        setFeature(data.data);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load feature');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch(
        `/api/licensing/features/${unwrappedParams.id}/permissions`
      );
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
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
        router.push('/admin/licensing');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete feature');
      }
    } catch (error) {
      console.error('Error deleting feature:', error);
      alert('An error occurred while deleting the feature');
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

  if (error || !feature) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertDescription>{error || 'Feature not found'}</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/licensing')}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Licensing Studio
        </Button>
      </div>
    );
  }

  const { className: tierClassName, label: tierLabel } = getTierPresentation(
    feature.tier
  );

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/admin/licensing')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{feature.name}</h1>
            <p className="text-muted-foreground">{feature.description}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/admin/licensing/features/${unwrappedParams.id}/permissions`)
            }
          >
            <Shield className="mr-2 h-4 w-4" />
            Manage Permissions
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Feature Information */}
      <div className="grid gap-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Feature Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <p className="text-base capitalize">{feature.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  License Tier
                </label>
                <div className="mt-1">
                  <Badge className={tierClassName}>{tierLabel}</Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Status
                </label>
                <div className="mt-1 flex items-center gap-2">
                  {feature.is_active ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-400">Inactive</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Created
                </label>
                <p className="text-base">
                  {new Date(feature.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Surface Association Card */}
        <Card>
          <CardHeader>
            <CardTitle>Surface Association</CardTitle>
            <CardDescription>Metadata surface configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Surface ID
                </label>
                <p className="font-mono text-sm bg-muted p-2 rounded">
                  {feature.surface_id || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Module
                </label>
                <p className="text-base capitalize">{feature.module || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">
                  Surface Type
                </label>
                <div className="mt-1">
                  <Badge variant="outline" className="capitalize">
                    {feature.surface_type || 'N/A'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>
                  {permissions.length} permission(s) defined
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  router.push(`/admin/licensing/features/${unwrappedParams.id}/permissions`)
                }
              >
                <Edit className="mr-2 h-4 w-4" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {permissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No permissions defined yet
              </div>
            ) : (
              <div className="space-y-4">
                {permissions.map((permission, index) => (
                  <div key={permission.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{permission.display_name}</h4>
                            {permission.is_required && (
                              <Badge variant="secondary" className="text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono">
                            {permission.permission_code}
                          </p>
                        </div>
                      </div>

                      {permission.description && (
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      )}

                      {/* Role Templates */}
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Default roles:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {permission.role_templates.map((template) => (
                            <Badge key={template.id} variant="outline" className="text-xs">
                              {ROLE_LABELS[template.role_key] || template.role_key}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
