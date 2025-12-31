'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, MessageSquare, Smartphone, Webhook, Loader2, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import type { NotificationPreference } from '@/models/notification/notificationPreference.model';
import type { NotificationCategory } from '@/models/notification/notification.model';
import type { DeliveryChannelType } from '@/models/notification/notificationEvent.model';

export interface AdminNotificationPreferencesProps {
  title?: string;
  description?: string;
  showQuietHours?: boolean;
  showDigestOptions?: boolean;
  availableChannels?: DeliveryChannelType[];
  availableCategories?: (NotificationCategory | 'all')[];
}

interface ChannelConfig {
  type: DeliveryChannelType;
  label: string;
  description: string;
  icon: React.ReactNode;
  tier: 'essential' | 'professional' | 'enterprise';
}

interface CategoryConfig {
  category: NotificationCategory | 'all';
  label: string;
  description: string;
}

const ALL_CHANNELS: ChannelConfig[] = [
  {
    type: 'in_app',
    label: 'In-App',
    description: 'Notifications in the bell icon',
    icon: <Bell className="h-4 w-4" />,
    tier: 'essential',
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Email notifications',
    icon: <Mail className="h-4 w-4" />,
    tier: 'essential',
  },
  {
    type: 'sms',
    label: 'SMS',
    description: 'Text message alerts',
    icon: <MessageSquare className="h-4 w-4" />,
    tier: 'professional',
  },
  {
    type: 'push',
    label: 'Push',
    description: 'Mobile/browser push',
    icon: <Smartphone className="h-4 w-4" />,
    tier: 'professional',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    description: 'External integrations',
    icon: <Webhook className="h-4 w-4" />,
    tier: 'enterprise',
  },
];

const ALL_CATEGORIES: CategoryConfig[] = [
  { category: 'all', label: 'All Notifications', description: 'Default setting for all categories' },
  { category: 'system', label: 'System', description: 'System alerts and maintenance' },
  { category: 'security', label: 'Security', description: 'Login alerts and permission changes' },
  { category: 'member', label: 'Members', description: 'Member-related updates' },
  { category: 'finance', label: 'Finance', description: 'Donations, pledges, budgets' },
  { category: 'event', label: 'Events', description: 'Event reminders and updates' },
  { category: 'communication', label: 'Communication', description: 'Messages and announcements' },
];

const DIGEST_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'hourly', label: 'Hourly digest' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
];

export function AdminNotificationPreferences({
  title = 'Notification Preferences',
  description = 'Configure how and when you receive notifications',
  showQuietHours = true,
  showDigestOptions = true,
  availableChannels,
  availableCategories,
}: AdminNotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');
  const { toast } = useToast();

  // Filter channels and categories based on props
  const channels = availableChannels
    ? ALL_CHANNELS.filter(c => availableChannels.includes(c.type))
    : ALL_CHANNELS;
  const categories = availableCategories
    ? ALL_CATEGORIES.filter(c => availableCategories.includes(c.category))
    : ALL_CATEGORIES;

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      const data = await response.json();
      setPreferences(data.preferences || []);

      // Check if quiet hours are set
      const anyWithQuietHours = data.preferences?.find(
        (p: NotificationPreference) => p.quiet_hours_start && p.quiet_hours_end
      );
      if (anyWithQuietHours) {
        setQuietHoursEnabled(true);
        setQuietHoursStart(anyWithQuietHours.quiet_hours_start || '22:00');
        setQuietHoursEnd(anyWithQuietHours.quiet_hours_end || '07:00');
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const getPreference = (category: NotificationCategory | 'all', channel: DeliveryChannelType) => {
    return preferences.find(p => p.category === category && p.channel === channel);
  };

  const isChannelEnabled = (category: NotificationCategory | 'all', channel: DeliveryChannelType) => {
    const pref = getPreference(category, channel);
    return pref?.enabled ?? true;
  };

  const getDigestFrequency = (category: NotificationCategory | 'all', channel: DeliveryChannelType) => {
    const pref = getPreference(category, channel);
    return pref?.digest_frequency || 'immediate';
  };

  const updatePreference = async (
    category: NotificationCategory | 'all',
    channel: DeliveryChannelType,
    updates: Partial<{
      enabled: boolean;
      digest_frequency: string;
    }>
  ) => {
    const key = `${category}-${channel}`;
    setSaving(key);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          channel,
          enabled: updates.enabled ?? isChannelEnabled(category, channel),
          digest_frequency: updates.digest_frequency ?? getDigestFrequency(category, channel),
          quiet_hours_start: quietHoursEnabled ? quietHoursStart : null,
          quiet_hours_end: quietHoursEnabled ? quietHoursEnd : null,
          quiet_hours_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!response.ok) throw new Error('Failed to update preference');

      const data = await response.json();

      setPreferences(prev => {
        const existing = prev.findIndex(p => p.category === category && p.channel === channel);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data.preference;
          return updated;
        }
        return [...prev, data.preference];
      });

      toast({
        title: 'Saved',
        description: 'Notification preference updated',
      });
    } catch (error) {
      console.error('Error updating preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preference',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const resetToDefaults = async () => {
    setSaving('reset');
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to reset preferences');

      setPreferences([]);
      setQuietHoursEnabled(false);
      setQuietHoursStart('22:00');
      setQuietHoursEnd('07:00');

      toast({
        title: 'Reset Complete',
        description: 'All preferences restored to defaults',
      });
    } catch (error) {
      console.error('Error resetting preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quiet Hours Section */}
      {showQuietHours && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">Quiet Hours</CardTitle>
            <CardDescription className="text-sm">
              Pause non-urgent notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours" className="flex-1 text-sm">
                Enable quiet hours
              </Label>
              <Switch
                id="quiet-hours"
                checked={quietHoursEnabled}
                onCheckedChange={setQuietHoursEnabled}
              />
            </div>

            {quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start" className="text-xs text-muted-foreground">Start time</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={quietHoursStart}
                    onChange={(e) => setQuietHoursStart(e.target.value)}
                    className="w-full h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end" className="text-xs text-muted-foreground">End time</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={quietHoursEnd}
                    onChange={(e) => setQuietHoursEnd(e.target.value)}
                    className="w-full h-9"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Channel Preferences */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            disabled={saving === 'reset'}
            className="h-8 px-2"
          >
            {saving === 'reset' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Reset</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map((cat, catIndex) => (
              <div key={cat.category}>
                {catIndex > 0 && <Separator className="my-6" />}

                <div className="mb-4">
                  <h4 className="text-sm font-medium">{cat.label}</h4>
                  <p className="text-xs text-muted-foreground">{cat.description}</p>
                </div>

                {/* Mobile: Compact list */}
                <div className="space-y-2 lg:hidden">
                  {channels.map((channel) => {
                    const key = `${cat.category}-${channel.type}`;
                    const enabled = isChannelEnabled(cat.category, channel.type);
                    const isSaving = saving === key;

                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/40"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={enabled ? 'text-primary' : 'text-muted-foreground'}>
                            {channel.icon}
                          </div>
                          <span className="text-sm">{channel.label}</span>
                          {channel.tier !== 'essential' && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1">
                              {channel.tier}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) =>
                              updatePreference(cat.category, channel.type, { enabled: checked })
                            }
                            disabled={isSaving}
                            className="scale-90"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: Grid layout */}
                <div className="hidden lg:grid lg:grid-cols-5 gap-3">
                  {channels.map((channel) => {
                    const key = `${cat.category}-${channel.type}`;
                    const enabled = isChannelEnabled(cat.category, channel.type);
                    const digestFrequency = getDigestFrequency(cat.category, channel.type);
                    const isSaving = saving === key;

                    return (
                      <div
                        key={key}
                        className={`p-3 rounded-lg border transition-all ${
                          enabled
                            ? 'bg-primary/5 border-primary/20'
                            : 'bg-muted/30 border-transparent hover:border-muted'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5">
                            <div className={enabled ? 'text-primary' : 'text-muted-foreground'}>
                              {channel.icon}
                            </div>
                            <span className="text-xs font-medium">{channel.label}</span>
                          </div>
                          {isSaving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                updatePreference(cat.category, channel.type, { enabled: checked })
                              }
                              disabled={isSaving}
                              className="scale-75"
                            />
                          )}
                        </div>

                        {enabled && showDigestOptions && channel.type === 'email' && (
                          <Select
                            value={digestFrequency}
                            onValueChange={(value) =>
                              updatePreference(cat.category, channel.type, { digest_frequency: value })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DIGEST_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}

                        {channel.tier !== 'essential' && (
                          <Badge variant="outline" className="mt-2 text-[10px] h-4 px-1">
                            {channel.tier}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
