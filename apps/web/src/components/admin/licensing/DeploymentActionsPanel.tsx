'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Loader2,
  Trash2,
  Rocket,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ProductOffering } from '@/models/productOffering.model';
import type { FullDeploymentResult, OrphanedGrantCleanupResult } from '@/services/ProductOfferingDeploymentService';

interface DeploymentActionsPanelProps {
  tenantsWithNoOffering: number;
  onRefresh: () => void;
}

export function DeploymentActionsPanel({
  tenantsWithNoOffering,
  onRefresh,
}: DeploymentActionsPanelProps) {
  const [offerings, setOfferings] = useState<ProductOffering[]>([]);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [syncRolePermissions, setSyncRolePermissions] = useState(true);
  const [cleanupFirst, setCleanupFirst] = useState(true);
  const [dryRun, setDryRun] = useState(false);

  // Cleanup state
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<OrphanedGrantCleanupResult | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);

  // Deployment state
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<FullDeploymentResult | null>(null);
  const [showDeployConfirm, setShowDeployConfirm] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    warnings: string[];
    errors: string[];
    affectedTenants: number;
    featuresCount: number;
  } | null>(null);

  async function loadOfferings() {
    if (offerings.length > 0) return;

    setIsLoadingOfferings(true);
    try {
      const response = await fetch('/api/licensing/product-offerings');
      const result = await response.json();

      if (result.success) {
        setOfferings(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load product offerings');
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      toast.error('Failed to load product offerings');
    } finally {
      setIsLoadingOfferings(false);
    }
  }

  async function handleCleanup() {
    setIsCleaningUp(true);
    setCleanupResult(null);

    try {
      const response = await fetch('/api/licensing/deployment/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        setCleanupResult(result.data);
        toast.success(result.message);
        onRefresh();
      } else {
        toast.error(result.error || 'Cleanup failed');
      }
    } catch (error) {
      console.error('Error cleaning up:', error);
      toast.error('Failed to cleanup orphaned grants');
    } finally {
      setIsCleaningUp(false);
      setShowCleanupConfirm(false);
    }
  }

  async function validateDeployment() {
    if (!selectedOfferingId) {
      toast.error('Please select a product offering');
      return;
    }

    try {
      const response = await fetch(
        `/api/licensing/deployment?offeringId=${selectedOfferingId}`
      );
      const result = await response.json();

      if (result.data) {
        setValidationResult(result.data);
        setShowDeployConfirm(true);
      } else {
        toast.error('Failed to validate deployment');
      }
    } catch (error) {
      console.error('Error validating deployment:', error);
      toast.error('Failed to validate deployment');
    }
  }

  async function handleDeploy() {
    if (!selectedOfferingId) return;

    setIsDeploying(true);
    setDeploymentResult(null);

    try {
      const response = await fetch('/api/licensing/deployment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offeringId: selectedOfferingId,
          cleanupOrphanedGrants: cleanupFirst,
          syncRolePermissions,
          dryRun,
        }),
      });

      const result = await response.json();

      if (result.success || result.data) {
        setDeploymentResult(result.data);
        if (result.success) {
          toast.success(result.message);
        } else {
          toast.warning('Deployment completed with some issues');
        }
        onRefresh();
      } else {
        toast.error(result.error || 'Deployment failed');
      }
    } catch (error) {
      console.error('Error deploying:', error);
      toast.error('Failed to deploy product offering');
    } finally {
      setIsDeploying(false);
      setShowDeployConfirm(false);
    }
  }

  const selectedOffering = offerings.find((o) => o.id === selectedOfferingId);

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Rocket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg">Deployment Actions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Cleanup orphaned grants and deploy product offerings
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Cleanup Section */}
        <div className="rounded-lg border border-border bg-amber-50/50 dark:bg-amber-950/20 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2 shrink-0">
                <Trash2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <h4 className="font-medium text-foreground text-sm sm:text-base">
                  Cleanup Orphaned Feature Grants
                </h4>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Remove feature grants from tenants without product offerings.
                </p>
                <div className="mt-2">
                  {tenantsWithNoOffering > 0 ? (
                    <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {tenantsWithNoOffering} tenant{tenantsWithNoOffering !== 1 ? 's' : ''} with orphaned grants
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      No orphaned grants
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCleanupConfirm(true)}
              disabled={isCleaningUp || tenantsWithNoOffering === 0}
              className="w-full sm:w-auto shrink-0"
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cleanup Now
                </>
              )}
            </Button>
          </div>

          {/* Cleanup Result */}
          {cleanupResult && (
            <div className="mt-4 p-3 rounded-lg bg-card border border-border">
              <h5 className="text-sm font-medium mb-2 flex items-center gap-2 text-foreground">
                {cleanupResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                Cleanup Result
              </h5>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Tenants Processed:</span>{' '}
                  <span className="font-medium text-foreground">{cleanupResult.tenantsProcessed}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Grants Removed:</span>{' '}
                  <span className="font-medium text-foreground">{cleanupResult.grantsRemoved}</span>
                </div>
              </div>
              {cleanupResult.details.length > 0 && (
                <details className="mt-2 text-sm">
                  <summary className="cursor-pointer text-primary hover:underline">
                    View details ({cleanupResult.details.length} tenants)
                  </summary>
                  <ul className="mt-2 space-y-1 ml-4 text-muted-foreground">
                    {cleanupResult.details.map((d) => (
                      <li key={d.tenantId}>
                        {d.tenantName}: {d.grantsRemoved} grants removed
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Deployment Section */}
        <div className="rounded-lg border border-border bg-primary/5 dark:bg-primary/10 p-3 sm:p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-lg bg-primary/10 dark:bg-primary/20 p-2 shrink-0">
              <Rocket className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h4 className="font-medium text-foreground text-sm sm:text-base">
                Deploy Product Offering
              </h4>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Deploy to eligible tenants, syncing features and role permissions.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Offering Selection - Stack on mobile, side by side on larger screens */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <Select
                  value={selectedOfferingId}
                  onValueChange={setSelectedOfferingId}
                  onOpenChange={(open) => open && loadOfferings()}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select product offering..." />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingOfferings ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      offerings
                        .filter((o) => o.is_active)
                        .map((offering) => (
                          <SelectItem key={offering.id} value={offering.id}>
                            <div className="flex items-center gap-2">
                              <span>{offering.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {offering.tier}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={validateDeployment}
                disabled={!selectedOfferingId || isDeploying}
                className="w-full sm:w-auto shrink-0"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    Deploy
                  </>
                )}
              </Button>
            </div>

            {/* Options - Responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="syncPermissions"
                  checked={syncRolePermissions}
                  onCheckedChange={(checked) => setSyncRolePermissions(checked as boolean)}
                />
                <Label
                  htmlFor="syncPermissions"
                  className="text-sm text-foreground cursor-pointer leading-tight"
                >
                  Sync role permissions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cleanupFirst"
                  checked={cleanupFirst}
                  onCheckedChange={(checked) => setCleanupFirst(checked as boolean)}
                />
                <Label
                  htmlFor="cleanupFirst"
                  className="text-sm text-foreground cursor-pointer leading-tight"
                >
                  Cleanup orphaned first
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="dryRun"
                  checked={dryRun}
                  onCheckedChange={(checked) => setDryRun(checked as boolean)}
                />
                <Label
                  htmlFor="dryRun"
                  className="text-sm text-foreground cursor-pointer leading-tight"
                >
                  Dry run (preview)
                </Label>
              </div>
            </div>

            {/* Info about dry run */}
            {dryRun && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Dry run mode: No changes will be made. Use this to preview the deployment.</span>
              </div>
            )}
          </div>

          {/* Deployment Result */}
          {deploymentResult && (
            <div className="mt-4 p-3 rounded-lg bg-card border border-border">
              <h5 className="text-sm font-medium mb-3 flex items-center gap-2 text-foreground">
                {deploymentResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                )}
                Deployment Result
                {dryRun && (
                  <Badge variant="secondary" className="text-xs">
                    Dry Run
                  </Badge>
                )}
              </h5>

              {/* Results Grid - Responsive */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-muted-foreground text-xs">Tenants</div>
                  <div className="font-semibold text-foreground">{deploymentResult.summary.totalTenants}</div>
                </div>
                <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                  <div className="text-muted-foreground text-xs">Successful</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {deploymentResult.summary.successfulDeployments}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-red-50 dark:bg-red-900/20">
                  <div className="text-muted-foreground text-xs">Failed</div>
                  <div className="font-semibold text-destructive">
                    {deploymentResult.summary.failedDeployments}
                  </div>
                </div>
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-muted-foreground text-xs">Features Granted</div>
                  <div className="font-semibold text-foreground">{deploymentResult.summary.totalFeaturesGranted}</div>
                </div>
              </div>

              {(deploymentResult.summary.totalPermissionsAdded > 0 || deploymentResult.summary.totalPermissionsRemoved > 0) && (
                <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-sm">
                  <div className="p-2 rounded-md bg-green-50 dark:bg-green-900/20">
                    <div className="text-muted-foreground text-xs">Permissions Added</div>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      {deploymentResult.summary.totalPermissionsAdded}
                    </div>
                  </div>
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20">
                    <div className="text-muted-foreground text-xs">Permissions Removed</div>
                    <div className="font-semibold text-amber-600 dark:text-amber-400">
                      {deploymentResult.summary.totalPermissionsRemoved}
                    </div>
                  </div>
                </div>
              )}

              {deploymentResult.tenantResults.some((r) => !r.success) && (
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-destructive hover:underline">
                    View failed deployments
                  </summary>
                  <ul className="mt-2 space-y-1 ml-4 text-muted-foreground">
                    {deploymentResult.tenantResults
                      .filter((r) => !r.success)
                      .map((r) => (
                        <li key={r.tenantId}>
                          {r.tenantName}: {r.errors.join(', ')}
                        </li>
                      ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </CardContent>

      {/* Cleanup Confirmation Dialog */}
      <AlertDialog open={showCleanupConfirm} onOpenChange={setShowCleanupConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cleanup Orphaned Feature Grants?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                This will remove all feature grants from {tenantsWithNoOffering} tenant
                {tenantsWithNoOffering !== 1 ? 's' : ''} that have no product offering assigned.
              </span>
              <span className="block mt-2">
                This action cannot be undone. The tenants will lose access to all features until
                a product offering is assigned to them.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCleanup}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isCleaningUp ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                'Cleanup Now'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deployment Confirmation Dialog */}
      <AlertDialog open={showDeployConfirm} onOpenChange={setShowDeployConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dryRun ? 'Preview Deployment' : 'Deploy Product Offering?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {dryRun
                    ? `This will preview deploying "${selectedOffering?.name}" to eligible tenants.`
                    : `This will deploy "${selectedOffering?.name}" to eligible tenants.`}
                </p>

                {validationResult && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Affected Tenants:</span>
                      <span className="font-medium text-foreground">{validationResult.affectedTenants}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Features in Offering:</span>
                      <span className="font-medium text-foreground">{validationResult.featuresCount}</span>
                    </div>

                    {validationResult.warnings.length > 0 && (
                      <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium mb-1 text-sm">
                          <AlertTriangle className="h-4 w-4" />
                          Warnings
                        </div>
                        <ul className="list-disc list-inside text-amber-600 dark:text-amber-400 text-xs space-y-0.5">
                          {validationResult.warnings.slice(0, 5).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                          {validationResult.warnings.length > 5 && (
                            <li>...and {validationResult.warnings.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {validationResult.errors.length > 0 && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 text-destructive font-medium mb-1 text-sm">
                          <XCircle className="h-4 w-4" />
                          Errors
                        </div>
                        <ul className="list-disc list-inside text-destructive text-xs space-y-0.5">
                          {validationResult.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {!dryRun && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>This will modify tenant feature grants and role permissions.</span>
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeploy}
              disabled={validationResult?.errors && validationResult.errors.length > 0}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {dryRun ? 'Running...' : 'Deploying...'}
                </>
              ) : dryRun ? (
                'Run Preview'
              ) : (
                'Deploy Now'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
