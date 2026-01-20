'use client';

/**
 * ================================================================================
 * ADMIN PAYOUT CONFIGURATION SECTION
 * ================================================================================
 *
 * A component for configuring bank payout details for donation disbursements.
 * Used in the Financial Source management page.
 *
 * Features:
 * - Display Xendit sub-account status and balance
 * - Configure bank account for payouts
 * - Set disbursement schedule and minimum amount
 * - Mark as donation destination
 *
 * ================================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Wallet, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { PH_BANK_CHANNELS } from '@/models/financialSource.model';

interface PayoutConfig {
  sourceId: string;
  sourceName: string;
  xendit_channel_code: string | null;
  bank_account_holder_name: string | null;
  bank_account_number_masked: string | null;
  disbursement_schedule: 'manual' | 'daily' | 'weekly' | 'monthly' | null;
  disbursement_minimum_amount: number | null;
  is_donation_destination: boolean;
  last_disbursement_at: string | null;
}

interface SubAccountStatus {
  configured: boolean;
  subAccountId: string | null;
  status: string | null;
  balance: number | null;
  pendingBalance: number | null;
  currency: string | null;
}

export interface AdminPayoutConfigSectionProps {
  sourceId: string;
  sourceType?: string;
  tenantId?: string;
  onConfigUpdate?: (config: PayoutConfig) => void;
}

export function AdminPayoutConfigSection({
  sourceId,
  sourceType,
  tenantId,
  onConfigUpdate,
}: AdminPayoutConfigSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [config, setConfig] = useState<PayoutConfig | null>(null);
  const [subAccountStatus, setSubAccountStatus] = useState<SubAccountStatus | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    xendit_channel_code: '',
    bank_account_holder_name: '',
    bank_account_number: '',
    disbursement_schedule: 'manual' as 'manual' | 'daily' | 'weekly' | 'monthly',
    disbursement_minimum_amount: 1000,
    is_donation_destination: false,
  });

  const [isEditing, setIsEditing] = useState(false);

  // Fetch configuration
  const fetchConfig = useCallback(async () => {
    if (!sourceId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch payout config
      const configRes = await fetch(`/api/finance/sources/${sourceId}/payout-config`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);

        // Pre-populate form if config exists
        if (configData.xendit_channel_code) {
          setFormData({
            xendit_channel_code: configData.xendit_channel_code || '',
            bank_account_holder_name: configData.bank_account_holder_name || '',
            bank_account_number: '', // Don't pre-fill - they need to re-enter
            disbursement_schedule: configData.disbursement_schedule || 'manual',
            disbursement_minimum_amount: configData.disbursement_minimum_amount || 1000,
            is_donation_destination: configData.is_donation_destination || false,
          });
        }
      }

      // Fetch sub-account status if we have a tenantId
      if (tenantId) {
        const subAccountRes = await fetch(`/api/tenants/${tenantId}/xendit-account`);
        if (subAccountRes.ok) {
          const subAccountData = await subAccountRes.json();
          setSubAccountStatus(subAccountData);
        }
      }
    } catch (err) {
      setError('Failed to load configuration');
      console.error('Error fetching payout config:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceId, tenantId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Handle form submission
  const handleSave = async () => {
    if (!sourceId) return;

    // Validate required fields
    if (!formData.xendit_channel_code || !formData.bank_account_holder_name || !formData.bank_account_number) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`/api/finance/sources/${sourceId}/payout-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      const result = await res.json();
      setConfig(result.config);
      setIsEditing(false);
      setSuccess('Payout configuration saved successfully');

      // Clear bank account number from form (security)
      setFormData(prev => ({ ...prev, bank_account_number: '' }));

      if (onConfigUpdate) {
        onConfigUpdate(result.config);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Handle clear configuration
  const handleClear = async () => {
    if (!sourceId) return;

    if (!confirm('Are you sure you want to clear the payout configuration?')) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const res = await fetch(`/api/finance/sources/${sourceId}/payout-config`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to clear configuration');
      }

      setConfig(null);
      setFormData({
        xendit_channel_code: '',
        bank_account_holder_name: '',
        bank_account_number: '',
        disbursement_schedule: 'manual',
        disbursement_minimum_amount: 1000,
        is_donation_destination: false,
      });
      setIsEditing(false);
      setSuccess('Payout configuration cleared');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear configuration');
    } finally {
      setSaving(false);
    }
  };

  // Only show for bank/wallet source types
  if (sourceType && !['bank', 'wallet'].includes(sourceType)) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasConfig = config?.xendit_channel_code;
  const bankName = PH_BANK_CHANNELS.find(b => b.code === config?.xendit_channel_code)?.name;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Donation Payout Configuration
            </CardTitle>
            <CardDescription>
              Configure bank account details for receiving donation disbursements
            </CardDescription>
          </div>
          {config?.is_donation_destination && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Donation Destination
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Sub-account Status Banner */}
        {subAccountStatus && (
          <Alert className={subAccountStatus.configured ? 'border-green-500' : 'border-yellow-500'}>
            <Wallet className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {subAccountStatus.configured ? (
                  <>
                    Xendit sub-account is <strong>active</strong>. Balance:{' '}
                    <strong>
                      {subAccountStatus.currency} {(subAccountStatus.balance || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                    </strong>
                    {(subAccountStatus.pendingBalance || 0) > 0 && (
                      <span className="text-muted-foreground">
                        {' '}
                        (Pending: {subAccountStatus.currency} {subAccountStatus.pendingBalance?.toLocaleString('en-PH', { minimumFractionDigits: 2 })})
                      </span>
                    )}
                  </>
                ) : (
                  'Xendit sub-account not yet configured. Donations will be collected to the master account.'
                )}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert className="border-green-500">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Display Mode (when configured) */}
        {hasConfig && !isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-sm">Bank</Label>
                <p className="font-medium">{bankName || config.xendit_channel_code}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Account Number</Label>
                <p className="font-medium font-mono">{config.bank_account_number_masked || '••••••••'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Account Holder</Label>
                <p className="font-medium">{config.bank_account_holder_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Disbursement Schedule</Label>
                <p className="font-medium capitalize">{config.disbursement_schedule || 'Manual'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Minimum Amount</Label>
                <p className="font-medium">
                  PHP {(config.disbursement_minimum_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                </p>
              </div>
              {config.last_disbursement_at && (
                <div>
                  <Label className="text-muted-foreground text-sm">Last Disbursement</Label>
                  <p className="font-medium">
                    {new Date(config.last_disbursement_at).toLocaleDateString('en-PH')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit Bank Details
              </Button>
              <Button variant="destructive" onClick={handleClear} disabled={saving}>
                Remove Configuration
              </Button>
            </div>
          </div>
        ) : (
          /* Edit/Create Mode */
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="bank">Bank *</Label>
                <Select
                  value={formData.xendit_channel_code}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, xendit_channel_code: value }))}
                >
                  <SelectTrigger id="bank">
                    <SelectValue placeholder="Select a bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {PH_BANK_CHANNELS.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountHolder">Account Holder Name *</Label>
                <Input
                  id="accountHolder"
                  placeholder="Enter account holder name"
                  value={formData.bank_account_holder_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account_holder_name: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Must match the name on your bank account exactly
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="accountNumber">Account Number *</Label>
                <Input
                  id="accountNumber"
                  type="password"
                  placeholder="Enter account number"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Your account number is encrypted and stored securely
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="schedule">Disbursement Schedule</Label>
                  <Select
                    value={formData.disbursement_schedule}
                    onValueChange={(value: 'manual' | 'daily' | 'weekly' | 'monthly') =>
                      setFormData(prev => ({ ...prev, disbursement_schedule: value }))
                    }
                  >
                    <SelectTrigger id="schedule">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="minimumAmount">Minimum Amount (PHP)</Label>
                  <Input
                    id="minimumAmount"
                    type="number"
                    min={100}
                    step={100}
                    value={formData.disbursement_minimum_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, disbursement_minimum_amount: parseInt(e.target.value) || 1000 }))}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="donationDestination"
                  checked={formData.is_donation_destination}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_donation_destination: checked }))}
                />
                <Label htmlFor="donationDestination" className="text-sm">
                  Mark as donation destination
                </Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Only one financial source can be the donation destination. Disbursements will be sent here.
              </p>
            </div>
          </div>
        )}
      </CardContent>

      {/* Footer with save/cancel buttons (edit mode only) */}
      {(isEditing || !hasConfig) && (
        <CardFooter className="flex justify-end gap-2">
          {hasConfig && (
            <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
              Cancel
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasConfig ? 'Update Configuration' : 'Save Configuration'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
