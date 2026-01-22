/**
 * Admin AI Credits Settings Component
 * Displays AI credit balance, packages, purchase history, and usage statistics
 */

'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export interface AdminAICreditsSettingsProps {
  balance: {
    total: number;
    used: number;
    remaining: number;
    percentage: number;
    lowThreshold: number;
    isLow: boolean;
  };
  packages: Array<{
    id: string;
    name: string;
    description?: string;
    credits: number;
    price: number;
    currency: string;
    badge?: string;
    savings?: number;
    featured?: boolean;
    pricePerCredit: string;
  }>;
  purchaseHistory: Array<{
    id: string;
    date: string;
    packageName: string;
    credits: number;
    amount: number;
    currency: string;
    status: string;
    statusLabel: string;
  }>;
  usageStats: {
    totalConversations: number;
    avgCreditsPerConversation: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    dailyUsage: Array<{
      date: string;
      credits: number;
      conversations: number;
    }>;
  };
  autoRecharge: {
    enabled: boolean;
    packageId: string | null;
    threshold: number;
  };
  currency: string;
}

export function AdminAICreditsSettings({
  balance,
  packages,
  purchaseHistory,
  usageStats,
  autoRecharge,
  currency,
}: AdminAICreditsSettingsProps) {
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    try {
      setPurchasingPackageId(packageId);

      const response = await fetch('/api/ai-credits/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageId: packageId,
          successUrl: `${window.location.origin}/admin/settings?section=ai-credits&purchase=success`,
          failureUrl: `${window.location.origin}/admin/settings?section=ai-credits&purchase=failed`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create purchase');
      }

      // Redirect to Xendit payment page
      if (data.data?.invoice_url) {
        window.location.href = data.data.invoice_url;
      } else {
        throw new Error('No invoice URL returned');
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      toast.error(error.message || 'Failed to initiate purchase');
      setPurchasingPackageId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Balance Section */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Credit Balance</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-2xl font-bold">{balance.remaining}</div>
            <div className="text-sm text-muted-foreground">Credits Remaining</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{balance.total}</div>
            <div className="text-sm text-muted-foreground">Total Purchased</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{balance.used}</div>
            <div className="text-sm text-muted-foreground">Credits Used</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Usage: {balance.percentage}%</span>
            {balance.isLow && (
              <span className="text-destructive font-medium">Low Balance</span>
            )}
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                balance.isLow ? 'bg-destructive' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100 - balance.percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Packages Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Purchase Credits</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`rounded-lg border p-4 ${
                pkg.featured ? 'border-primary shadow-md' : ''
              }`}
            >
              {pkg.badge && (
                <div className="text-xs font-medium text-primary mb-2">
                  {pkg.badge}
                </div>
              )}
              <div className="text-xl font-bold">{pkg.credits} Credits</div>
              <div className="text-2xl font-bold mt-2">
                {pkg.currency} {pkg.price?.toFixed(2) || '0.00'}
              </div>
              <div className="text-sm text-muted-foreground">
                {pkg.currency} {pkg.pricePerCredit || '0.0000'} per credit
              </div>
              {pkg.savings && (
                <div className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Save {pkg.savings}%
                </div>
              )}
              {pkg.description && (
                <div className="text-sm text-muted-foreground mt-2">
                  {pkg.description}
                </div>
              )}
              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasingPackageId !== null}
                className="w-full mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {purchasingPackageId === pkg.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Buy Now'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Stats */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Usage Statistics</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-2xl font-bold">
              {usageStats.totalConversations}
            </div>
            <div className="text-sm text-muted-foreground">
              Total Conversations
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {usageStats.avgCreditsPerConversation.toFixed(1)}
            </div>
            <div className="text-sm text-muted-foreground">
              Avg Credits/Conversation
            </div>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Purchase History</h3>
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Package</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Credits</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {purchaseHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No purchase history yet
                  </td>
                </tr>
              ) : (
                purchaseHistory.map((purchase) => (
                  <tr key={purchase.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm">{purchase.date}</td>
                    <td className="px-4 py-3 text-sm">{purchase.packageName}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {purchase.credits}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {purchase.currency} {purchase.amount?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          purchase.status === 'completed'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : purchase.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                        }`}
                      >
                        {purchase.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Auto-Recharge Section */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Auto-Recharge</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-Recharge</div>
              <div className="text-sm text-muted-foreground">
                Automatically purchase credits when balance is low
              </div>
            </div>
            <div className="text-sm">
              {autoRecharge.enabled ? (
                <span className="text-green-600 dark:text-green-400">Enabled</span>
              ) : (
                <span className="text-muted-foreground">Disabled</span>
              )}
            </div>
          </div>
          {autoRecharge.enabled && (
            <div className="text-sm text-muted-foreground">
              Threshold: {autoRecharge.threshold} credits
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
