'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CanvaStyleSettingsLayout, type SettingsNavSection } from './CanvaStyleSettingsLayout';
import { ChurchProfileSection, type ChurchProfileData } from './ChurchProfileSection';
import { AdminNotificationPreferences } from './AdminNotificationPreferences';
import { AdminIntegrationSettings } from './AdminIntegrationSettings';
import { TeamMembersSection } from './TeamMembersSection';
import { AdminAICreditsSettings } from './AdminAICreditsSettings';

// ============================================================================
// Types
// ============================================================================

export interface CanvaStyleSettingsPageProps {
  /** Initial tenant data */
  initialData?: ChurchProfileData;
  /** Custom navigation sections (optional) */
  customSections?: SettingsNavSection[];
  /** Show notifications section */
  showNotifications?: boolean;
  /** Show integrations section */
  showIntegrations?: boolean;
  /** Show team section */
  showTeam?: boolean;
}

// ============================================================================
// Default Navigation Configuration
// ============================================================================

const defaultSections: SettingsNavSection[] = [
  {
    id: 'church-settings',
    title: 'Church Settings',
    items: [
      {
        id: 'profile',
        label: 'Church Profile',
        icon: 'church',
        description: 'Logo, name, contact info',
      },
      {
        id: 'preferences',
        label: 'Preferences',
        icon: 'settings',
        description: 'Currency, timezone, defaults',
      },
    ],
  },
  {
    id: 'communication',
    title: 'Communication',
    items: [
      {
        id: 'notifications',
        label: 'Notifications',
        icon: 'bell',
        description: 'Email and alert preferences',
      },
      {
        id: 'integrations',
        label: 'Integrations',
        icon: 'link',
        description: 'Email, SMS, webhooks',
      },
    ],
  },
  {
    id: 'ai-features',
    title: 'AI Features',
    items: [
      {
        id: 'ai-credits',
        label: 'AI Credits',
        icon: 'zap',
        description: 'Manage AI Assistant credits',
      },
    ],
  },
  {
    id: 'access',
    title: 'Access & Security',
    items: [
      {
        id: 'team',
        label: 'Team Members',
        icon: 'users',
        description: 'Manage staff and volunteers',
      },
      {
        id: 'security',
        label: 'Security',
        icon: 'shield',
        description: 'Authentication settings',
        disabled: true,
      },
    ],
  },
];

// ============================================================================
// Preferences Section Component
// ============================================================================

interface PreferencesSectionProps {
  data: ChurchProfileData;
  onUpdate: (field: string, value: string) => Promise<void>;
}

function PreferencesSection({ data, onUpdate }: PreferencesSectionProps) {
  const [currency, setCurrency] = useState(data.currency || 'PHP');
  const [timezone, setTimezone] = useState(data.timezone || 'Asia/Manila');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (field: string, value: string) => {
    setIsSaving(true);
    try {
      await onUpdate(field, value);
      toast.success('Preference updated successfully');
    } catch (error) {
      toast.error('Failed to update preference');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preferences</h2>
        <p className="text-sm text-muted-foreground mt-1">Configure default settings for your church</p>
      </div>

      {/* Currency Selection */}
      <div className="py-4 border-b">
        <label className="block text-sm font-medium text-foreground mb-2">Default Currency</label>
        <select
          value={currency}
          onChange={(e) => {
            setCurrency(e.target.value);
            handleSave('currency', e.target.value);
          }}
          disabled={isSaving}
          className="w-full max-w-xs px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="PHP">Philippine Peso (PHP)</option>
          <option value="USD">US Dollar (USD)</option>
          <option value="EUR">Euro (EUR)</option>
          <option value="GBP">British Pound (GBP)</option>
          <option value="AUD">Australian Dollar (AUD)</option>
          <option value="CAD">Canadian Dollar (CAD)</option>
          <option value="SGD">Singapore Dollar (SGD)</option>
          <option value="MYR">Malaysian Ringgit (MYR)</option>
          <option value="IDR">Indonesian Rupiah (IDR)</option>
          <option value="THB">Thai Baht (THB)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Used for donations and financial reports</p>
      </div>

      {/* Timezone Selection */}
      <div className="py-4 border-b">
        <label className="block text-sm font-medium text-foreground mb-2">Timezone</label>
        <select
          value={timezone}
          onChange={(e) => {
            setTimezone(e.target.value);
            handleSave('timezone', e.target.value);
          }}
          disabled={isSaving}
          className="w-full max-w-xs px-3 py-2 border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
          <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (GMT+9)</option>
          <option value="Asia/Hong_Kong">Asia/Hong Kong (GMT+8)</option>
          <option value="America/New_York">America/New York (EST)</option>
          <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
          <option value="America/Chicago">America/Chicago (CST)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Europe/Paris">Europe/Paris (CET)</option>
          <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Used for scheduling and date/time display</p>
      </div>
    </div>
  );
}


// ============================================================================
// AI Credits Section Component
// ============================================================================

interface AICreditsSectionProps {
  currency: string;
}

function AICreditsSection({ currency }: AICreditsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiCreditsData, setAICreditsData] = useState<any>(null);

  useEffect(() => {
    const fetchAICreditsData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all AI Credits data in parallel
        const [balanceRes, packagesRes, purchaseHistoryRes, transactionsRes] = await Promise.all([
          fetch('/api/ai-credits/balance'),
          fetch(`/api/ai-credits/packages?currency=${currency}`),
          fetch('/api/ai-credits/purchase-history?limit=10'),
          fetch('/api/ai-credits/transactions?limit=30'),
        ]);

        if (!balanceRes.ok || !packagesRes.ok || !purchaseHistoryRes.ok || !transactionsRes.ok) {
          throw new Error('Failed to fetch AI Credits data');
        }

        const [balance, packages, purchaseHistory, transactions] = await Promise.all([
          balanceRes.json(),
          packagesRes.json(),
          purchaseHistoryRes.json(),
          transactionsRes.json(),
        ]);

        // Calculate usage stats from transactions
        const txData = transactions.data?.transactions || [];
        const uniqueSessions = new Set(txData.map((t: any) => t.session_id));
        const totalConversations = uniqueSessions.size;
        const totalCredits = txData.reduce((sum: number, t: any) => sum + t.credits_used, 0);
        const avgCreditsPerConversation = totalConversations > 0 ? totalCredits / totalConversations : 0;
        const totalInputTokens = txData.reduce((sum: number, t: any) => sum + t.input_tokens, 0);
        const totalOutputTokens = txData.reduce((sum: number, t: any) => sum + t.output_tokens, 0);

        // Get auto-recharge settings from balance
        const autoRecharge = {
          enabled: balance.data?.auto_recharge_enabled || false,
          packageId: balance.data?.auto_recharge_package_id || null,
          threshold: balance.data?.low_credit_threshold || 10,
        };

        setAICreditsData({
          balance: {
            total: balance.data?.total_credits || 0,
            used: balance.data?.used_credits || 0,
            remaining: balance.data?.remaining_credits || 0,
            percentage: balance.data?.total_credits > 0
              ? Math.round((balance.data.remaining_credits / balance.data.total_credits) * 100)
              : 0,
            lowThreshold: balance.data?.low_credit_threshold || 10,
            isLow: balance.data?.remaining_credits < (balance.data?.low_credit_threshold || 10),
          },
          packages: (packages.data?.packages || []).map((pkg: any) => ({
            ...pkg,
            pricePerCredit: (pkg.price / pkg.credits).toFixed(4),
          })),
          purchaseHistory: (purchaseHistory.data?.purchases || []).map((p: any) => ({
            id: p.id,
            date: new Date(p.created_at).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            packageName: p.package_name,
            credits: p.credits_purchased,
            amount: p.amount_paid,
            currency: p.currency,
            status: p.payment_status,
            statusLabel: p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1),
          })),
          usageStats: {
            totalConversations,
            avgCreditsPerConversation: Math.round(avgCreditsPerConversation * 10) / 10,
            totalInputTokens,
            totalOutputTokens,
            dailyUsage: [],
          },
          autoRecharge,
          currency: packages.data?.currency || currency,
        });
      } catch (err: any) {
        console.error('Error fetching AI Credits data:', err);
        setError(err.message || 'Failed to load AI Credits data');
      } finally {
        setLoading(false);
      }
    };

    fetchAICreditsData();
  }, [currency]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading AI Credits...</p>
        </div>
      </div>
    );
  }

  if (error || !aiCreditsData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || 'Failed to load AI Credits data'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <AdminAICreditsSettings {...aiCreditsData} />;
}

// ============================================================================
// Main Component
// ============================================================================

export function CanvaStyleSettingsPage({
  initialData,
  customSections,
  showNotifications = true,
  showIntegrations = true,
  showTeam = true,
}: CanvaStyleSettingsPageProps) {
  const [data, setData] = useState<ChurchProfileData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  // Fetch tenant data if not provided
  useEffect(() => {
    if (initialData) return;

    async function fetchTenantData() {
      try {
        const response = await fetch('/api/tenant/current');
        if (!response.ok) throw new Error('Failed to fetch tenant data');
        const result = await response.json();
        setData({
          tenantId: result.data.id,
          name: result.data.name,
          email: result.data.email,
          phone: result.data.contact_number,
          address: result.data.address,
          website: result.data.website,
          logoUrl: result.data.logo_url,
          coverUrl: result.data.church_image_url,
          currency: result.data.currency,
          timezone: result.data.timezone,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTenantData();
  }, [initialData]);

  // Handle field updates
  const handleFieldUpdate = useCallback(async (field: string, value: string) => {
    const response = await fetch('/api/tenant/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!response.ok) {
      throw new Error('Failed to update');
    }

    // Update local state
    setData((prev) =>
      prev
        ? {
            ...prev,
            [field]: value,
          }
        : prev
    );
  }, []);

  // Handle logo upload
  const handleLogoUpload = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/onboarding/upload-logo', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload logo');
    }

    const result = await response.json();

    // Update local state
    setData((prev) =>
      prev
        ? {
            ...prev,
            logoUrl: result.url,
          }
        : prev
    );

    return result.url;
  }, []);

  // Handle logo removal
  const handleLogoRemove = useCallback(async () => {
    const response = await fetch('/api/onboarding/upload-logo', {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to remove logo');
    }

    // Update local state
    setData((prev) =>
      prev
        ? {
            ...prev,
            logoUrl: undefined,
          }
        : prev
    );
  }, []);

  // Build navigation sections
  const sections = customSections || defaultSections;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error || 'Failed to load settings'}</span>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <CanvaStyleSettingsLayout sections={sections} defaultItem="profile" pageTitle="Settings">
      {/* Profile Section */}
      <ChurchProfileSection
        data={data}
        title=""
        description=""
        onUpdate={handleFieldUpdate}
        onLogoUpload={handleLogoUpload}
        onLogoRemove={handleLogoRemove}
      />

      {/* Preferences Section */}
      <PreferencesSection data={data} onUpdate={handleFieldUpdate} />

      {/* Notifications Section */}
      {showNotifications ? (
        <AdminNotificationPreferences
          title="Notification Preferences"
          description="Configure how and when you receive notifications"
          showQuietHours={true}
          showDigestOptions={true}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">Notifications not available</div>
      )}

      {/* Integrations Section */}
      {showIntegrations ? (
        <AdminIntegrationSettings
          title="Integrations"
          description="Connect third-party services for email, SMS, and more"
          showTwilio={true}
          showEmail={true}
          showWebhook={true}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">Integrations not available</div>
      )}

      {/* AI Credits Section */}
      <AICreditsSection currency={data.currency || 'PHP'} />

      {/* Team Section */}
      {showTeam ? (
        <TeamMembersSection
          title="Team Members"
          description="Manage staff, volunteers, and their access levels"
          tenantId={data.tenantId}
          tenantName={data.name}
          logoUrl={data.logoUrl}
          coverImageUrl={data.coverUrl}
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">Team not available</div>
      )}

      {/* Security Section (placeholder for disabled item) */}
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🔐</span>
        </div>
        <h3 className="font-medium text-foreground mb-2">Security Settings</h3>
        <p className="text-sm text-muted-foreground">Coming soon - Two-factor authentication and more</p>
      </div>
    </CanvaStyleSettingsLayout>
  );
}

export default CanvaStyleSettingsPage;
