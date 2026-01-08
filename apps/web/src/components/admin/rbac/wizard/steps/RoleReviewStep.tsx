'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  Shield,
  Key,
  Building,
  Church,
  Users,
  HandshakeIcon,
  Info,
  AlertCircle,
} from 'lucide-react';
import type { RoleWizardData, WizardMode } from '../RoleWizard';
import type { Permission } from '@/models/rbac.model';

interface RoleReviewStepProps {
  data: RoleWizardData;
  mode?: WizardMode;
}

const SCOPE_DISPLAY = {
  tenant: { label: 'Organization', icon: Building, description: 'Church-wide access' },
  campus: { label: 'Campus', icon: Church, description: 'Single campus scope' },
  ministry: { label: 'Ministry', icon: Users, description: 'Specific ministry team' },
} as const;

export function RoleReviewStep({ data, mode = 'create' }: RoleReviewStepProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPermissions();
  }, [data.selectedPermissions]);

  const fetchPermissions = async () => {
    if (data.selectedPermissions.length === 0) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/rbac/permissions');
      if (response.ok) {
        const { data: allPermissions } = await response.json();
        const selectedPermissions = allPermissions.filter((p: Permission) =>
          data.selectedPermissions.includes(p.id)
        );
        setPermissions(selectedPermissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    return permissions.reduce(
      (acc, permission) => {
        const module = permission.module || 'other';
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(permission);
        return acc;
      },
      {} as Record<string, Permission[]>
    );
  }, [permissions]);

  const modules = useMemo(() => Object.keys(groupedPermissions).sort(), [groupedPermissions]);

  const scopeInfo = SCOPE_DISPLAY[data.scope];
  const ScopeIcon = scopeInfo.icon;

  const getHeaderContent = () => {
    switch (mode) {
      case 'view':
        return {
          title: 'Role Summary',
          description: 'Overview of role configuration and permissions.',
          cardClass: 'border-primary/20 bg-primary/5',
          iconClass: 'bg-primary/10',
          iconColor: 'text-primary',
          titleColor: 'text-primary',
          descColor: 'text-muted-foreground',
        };
      case 'edit':
        return {
          title: 'Ready to Save Changes',
          description: 'Review the changes below and click "Save Changes" to update.',
          cardClass: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20',
          iconClass: 'bg-amber-100 dark:bg-amber-900/50',
          iconColor: 'text-amber-600 dark:text-amber-400',
          titleColor: 'text-amber-900 dark:text-amber-100',
          descColor: 'text-amber-700 dark:text-amber-300',
        };
      default:
        return {
          title: 'Ready to Create Role',
          description: 'Review the configuration below and click "Create Role" to finalize.',
          cardClass: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20',
          iconClass: 'bg-green-100 dark:bg-green-900/50',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-900 dark:text-green-100',
          descColor: 'text-green-700 dark:text-green-300',
        };
    }
  };

  const headerContent = getHeaderContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className={headerContent.cardClass}>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${headerContent.iconClass} flex-shrink-0`}>
              <CheckCircle2 className={`h-6 w-6 ${headerContent.iconColor}`} />
            </div>
            <div>
              <h3 className={`font-semibold text-lg ${headerContent.titleColor}`}>
                {headerContent.title}
              </h3>
              <p className={`text-sm mt-1 ${headerContent.descColor}`}>
                {headerContent.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Basic Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Name */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Role Name
            </p>
            <p className="text-lg font-semibold">{data.name}</p>
          </div>

          {/* Description */}
          {data.description && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm">{data.description}</p>
            </div>
          )}

          <Separator />

          {/* Scope and Delegatable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Scope
              </p>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-muted">
                  <ScopeIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-sm">{scopeInfo.label}</p>
                  <p className="text-xs text-muted-foreground">{scopeInfo.description}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Delegation
              </p>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-muted">
                  <HandshakeIcon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Badge variant={data.is_delegatable ? 'default' : 'secondary'}>
                    {data.is_delegatable ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Permissions</CardTitle>
            </div>
            <Badge variant="outline">{data.selectedPermissions.length} selected</Badge>
          </div>
          <CardDescription>
            The role will grant access to these permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : data.selectedPermissions.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                No permissions selected. Go back to add permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {modules.map((module) => (
                <div key={module} className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 flex items-center justify-between">
                    <span className="font-medium text-sm capitalize">{module}</span>
                    <Badge variant="secondary" className="text-xs">
                      {groupedPermissions[module].length}
                    </Badge>
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupedPermissions[module].map((permission) => (
                        <div
                          key={permission.id}
                          className="flex items-start gap-2 p-2 rounded bg-muted/30"
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{permission.name}</p>
                            {permission.code && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {permission.code}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-sm text-primary">What happens next?</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  <span>The role will be created immediately and available for assignment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  <span>You can assign this role to users from the user management page</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  <span>Role details and permissions can be edited anytime</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  <span>All changes are tracked in the audit log</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
