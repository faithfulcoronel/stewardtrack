'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, CheckCircle, XCircle, ChevronRight, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';
import type { ProductOffering } from '@/models/productOffering.model';
import type { TenantForAssignment } from '@/models/licenseAssignment.model';

interface AssignLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedTenantId?: string;
}

interface FeatureChange {
  id: string;
  name: string;
  description: string | null;
}

interface FeatureChanges {
  features_to_add: FeatureChange[];
  features_to_remove: FeatureChange[];
  features_to_keep: FeatureChange[];
}

export function AssignLicenseDialog({
  open,
  onOpenChange,
  onSuccess,
  preSelectedTenantId,
}: AssignLicenseDialogProps) {
  const [step, setStep] = useState(1);
  const [tenants, setTenants] = useState<TenantForAssignment[]>([]);
  const [offerings, setOfferings] = useState<ProductOffering[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedOfferingId, setSelectedOfferingId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [featureChanges, setFeatureChanges] = useState<FeatureChanges | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Load tenants and offerings when dialog opens
  useEffect(() => {
    if (open) {
      loadTenants();
      loadOfferings();
      if (preSelectedTenantId) {
        setSelectedTenantId(preSelectedTenantId);
      }
    } else {
      // Reset state when dialog closes
      setStep(1);
      setSelectedTenantId(preSelectedTenantId || '');
      setSelectedOfferingId('');
      setNotes('');
      setFeatureChanges(null);
    }
  }, [open, preSelectedTenantId]);

  async function loadTenants() {
    setIsLoadingTenants(true);
    try {
      const response = await fetch('/api/licensing/tenants');
      const result = await response.json();

      if (result.success) {
        setTenants(result.data || []);
      } else {
        toast.error(result.error || 'Failed to load tenants');
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      toast.error('Failed to load tenants');
    } finally {
      setIsLoadingTenants(false);
    }
  }

  async function loadOfferings() {
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

  async function loadFeatureChanges(tenantId: string, offeringId: string) {
    setIsLoadingFeatures(true);
    try {
      const response = await fetch(
        `/api/licensing/feature-changes?tenantId=${tenantId}&offeringId=${offeringId}`
      );
      const result = await response.json();

      if (result.success) {
        setFeatureChanges(result.data);
      } else {
        toast.error(result.error || 'Failed to load feature changes');
      }
    } catch (error) {
      console.error('Error loading feature changes:', error);
      toast.error('Failed to load feature changes');
    } finally {
      setIsLoadingFeatures(false);
    }
  }

  function handleNext() {
    if (!selectedTenantId || !selectedOfferingId) {
      toast.error('Please select both a tenant and an offering');
      return;
    }

    // Load feature changes for confirmation step
    loadFeatureChanges(selectedTenantId, selectedOfferingId);
    setStep(2);
  }

  function handleBack() {
    setStep(1);
  }

  async function handleConfirm() {
    if (!selectedTenantId || !selectedOfferingId) {
      return;
    }

    setIsAssigning(true);
    try {
      const response = await fetch('/api/licensing/assign-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: selectedTenantId,
          offeringId: selectedOfferingId,
          notes: notes || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('License assigned successfully');
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to assign license');
      }
    } catch (error) {
      console.error('Error assigning license:', error);
      toast.error('Failed to assign license');
    } finally {
      setIsAssigning(false);
    }
  }

  const selectedTenant = tenants.find((t) => t.tenant_id === selectedTenantId);
  const selectedOffering = offerings.find((o) => o.id === selectedOfferingId);

  function getTierColor(tier: string) {
    switch (tier?.toLowerCase()) {
      case 'starter':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'professional':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'enterprise':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign License to Church</DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Step 1 of 2: Select the church and product offering'
              : 'Step 2 of 2: Review and confirm the assignment'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-6 py-4">
            {/* Tenant Selection */}
            <div className="space-y-2">
              <Label htmlFor="tenant">Church</Label>
              {isLoadingTenants ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <>
                  <Select
                    value={selectedTenantId}
                    onValueChange={setSelectedTenantId}
                    disabled={!!preSelectedTenantId}
                  >
                    <SelectTrigger id="tenant">
                      <SelectValue placeholder="Select a church..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.tenant_id} value={tenant.tenant_id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{tenant.tenant_name}</span>
                            {tenant.current_offering_name && (
                              <Badge variant="outline" className="text-xs">
                                {tenant.current_offering_name}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTenant?.current_offering_name && (
                    <p className="text-sm text-gray-600">
                      Current: {selectedTenant.current_offering_name} (
                      {selectedTenant.feature_count} features)
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Offering Selection */}
            <div className="space-y-2">
              <Label htmlFor="offering">New Product Offering</Label>
              {isLoadingOfferings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <Select value={selectedOfferingId} onValueChange={setSelectedOfferingId}>
                  <SelectTrigger id="offering">
                    <SelectValue placeholder="Select an offering..." />
                  </SelectTrigger>
                  <SelectContent>
                    {offerings
                      .filter((o) => o.is_active)
                      .map((offering) => (
                        <SelectItem key={offering.id} value={offering.id}>
                          <div className="flex items-center gap-2">
                            <span>{offering.name}</span>
                            <Badge
                              variant="outline"
                              className={getTierColor(offering.tier)}
                            >
                              {offering.tier}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this assignment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Confirmation Details */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div>
                <div className="text-sm text-gray-600">Church</div>
                <div className="font-medium">{selectedTenant?.tenant_name}</div>
              </div>

              <div>
                <div className="text-sm text-gray-600">License Change</div>
                <div className="flex items-center gap-2 mt-1">
                  {selectedTenant?.current_offering_name ? (
                    <>
                      <span>{selectedTenant.current_offering_name}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{selectedOffering?.name}</span>
                    </>
                  ) : (
                    <span className="font-medium">{selectedOffering?.name}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Feature Changes */}
            <div className="space-y-3">
              <h4 className="font-medium">Feature Changes</h4>

              {isLoadingFeatures ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : featureChanges ? (
                <div className="space-y-3">
                  {featureChanges.features_to_add.length > 0 && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Plus className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">
                          New Features ({featureChanges.features_to_add.length})
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {featureChanges.features_to_add.map((feature) => (
                          <li key={feature.id} className="text-sm text-green-800 flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {featureChanges.features_to_remove.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Minus className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">
                          Features Being Removed ({featureChanges.features_to_remove.length})
                        </span>
                      </div>
                      <ul className="space-y-1">
                        {featureChanges.features_to_remove.map((feature) => (
                          <li key={feature.id} className="text-sm text-red-800 flex items-start gap-2">
                            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{feature.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {featureChanges.features_to_keep.length > 0 && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">
                          Existing Features ({featureChanges.features_to_keep.length})
                        </span>
                      </div>
                      <p className="text-sm text-blue-800">
                        These features will remain active
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {notes && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">Notes</div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                  {notes}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleNext}
                disabled={!selectedTenantId || !selectedOfferingId || isLoadingTenants || isLoadingOfferings}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isAssigning}>
                Back
              </Button>
              <Button onClick={handleConfirm} disabled={isAssigning || isLoadingFeatures}>
                {isAssigning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  'Confirm Assignment'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
