'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  Bell,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  RefreshCw,
  Webhook,
  Shield,
  Globe,
  Copy,
  Key,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

export interface SuperAdminIntegrationSettingsProps {
  title?: string;
  description?: string;
  showTwilio?: boolean;
  showEmail?: boolean;
  showFirebase?: boolean;
  showWebhook?: boolean;
}

interface IntegrationStatus {
  configured: boolean;
  verified: boolean;
  lastTested?: string;
  error?: string;
}

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  senderId?: string; // Alphanumeric Sender ID for international SMS
  messagingServiceSid?: string;
}

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

interface FirebaseConfig {
  projectId: string;
  privateKey: string;
  clientEmail: string;
  vapidKey?: string;
  enabled: boolean;
}

interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
  retryPolicy: 'none' | 'exponential' | 'linear';
  maxRetries: number;
}

export function SuperAdminIntegrationSettings({
  title = 'System Integration Settings',
  description = 'Configure system-wide integrations for all tenants',
  showTwilio = true,
  showEmail = true,
  showFirebase = true,
  showWebhook = true,
}: SuperAdminIntegrationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'twilio' | 'email' | 'firebase' | 'webhook' | null>(null);
  const [testing, setTesting] = useState<'twilio' | 'email' | 'firebase' | 'webhook' | null>(null);

  // Visibility toggles for sensitive fields
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showEmailApiKey, setShowEmailApiKey] = useState(false);
  const [showFirebaseKey, setShowFirebaseKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  // Integration status
  const [twilioStatus, setTwilioStatus] = useState<IntegrationStatus>({
    configured: false,
    verified: false,
  });
  const [emailStatus, setEmailStatus] = useState<IntegrationStatus>({
    configured: false,
    verified: false,
  });
  const [firebaseStatus, setFirebaseStatus] = useState<IntegrationStatus>({
    configured: false,
    verified: false,
  });
  const [webhookStatus, setWebhookStatus] = useState<IntegrationStatus>({
    configured: false,
    verified: false,
  });

  // Form states
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    fromNumber: '',
    senderId: '',
    messagingServiceSid: '',
  });
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'resend',
    apiKey: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
  });
  const [firebaseConfig, setFirebaseConfig] = useState<FirebaseConfig>({
    projectId: '',
    privateKey: '',
    clientEmail: '',
    vapidKey: '',
    enabled: false,
  });
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: '',
    secret: '',
    enabled: true,
    retryPolicy: 'exponential',
    maxRetries: 3,
  });

  // Test configuration
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testFcmToken, setTestFcmToken] = useState('');
  const [gettingFcmToken, setGettingFcmToken] = useState(false);

  const { toast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/system-settings/integrations');
      if (!response.ok) throw new Error('Failed to fetch system integrations');
      const data = await response.json();

      if (data.twilio) {
        setTwilioConfig({
          accountSid: data.twilio.accountSid || '',
          authToken: data.twilio.authToken ? '••••••••••••••••' : '',
          fromNumber: data.twilio.fromNumber || '',
          senderId: data.twilio.senderId || '',
          messagingServiceSid: data.twilio.messagingServiceSid || '',
        });
        setTwilioStatus({
          configured: data.twilio.configured || false,
          verified: data.twilio.verified || false,
          lastTested: data.twilio.lastTested,
        });
      }

      if (data.email) {
        setEmailConfig({
          provider: data.email.provider || 'resend',
          apiKey: data.email.apiKey ? '••••••••••••••••' : '',
          fromEmail: data.email.fromEmail || '',
          fromName: data.email.fromName || '',
          replyTo: data.email.replyTo || '',
        });
        setEmailStatus({
          configured: data.email.configured || false,
          verified: data.email.verified || false,
          lastTested: data.email.lastTested,
        });
      }

      if (data.firebase) {
        setFirebaseConfig({
          projectId: data.firebase.projectId || '',
          privateKey: data.firebase.privateKey ? '••••••••••••••••' : '',
          clientEmail: data.firebase.clientEmail || '',
          vapidKey: data.firebase.vapidKey || '',
          enabled: data.firebase.enabled ?? false,
        });
        setFirebaseStatus({
          configured: data.firebase.configured || false,
          verified: data.firebase.verified || false,
          lastTested: data.firebase.lastTested,
        });
      }

      if (data.webhook) {
        setWebhookConfig({
          url: data.webhook.url || '',
          secret: data.webhook.secret ? '••••••••••••••••' : '',
          enabled: data.webhook.enabled ?? true,
          retryPolicy: data.webhook.retryPolicy || 'exponential',
          maxRetries: data.webhook.maxRetries ?? 3,
        });
        setWebhookStatus({
          configured: data.webhook.configured || false,
          verified: data.webhook.verified || false,
          lastTested: data.webhook.lastTested,
        });
      }
    } catch (error) {
      console.error('Error fetching system integrations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const saveTwilioConfig = async () => {
    setSaving('twilio');
    try {
      const response = await fetch('/api/system-settings/integrations/twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(twilioConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save Twilio configuration');
      }

      const data = await response.json();
      setTwilioStatus({
        configured: true,
        verified: data.verified || false,
        lastTested: data.lastTested,
      });

      toast({
        title: 'Twilio Configuration Saved',
        description: 'System-wide SMS integration settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const saveEmailConfig = async () => {
    setSaving('email');
    try {
      const response = await fetch('/api/system-settings/integrations/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save email configuration');
      }

      const data = await response.json();
      setEmailStatus({
        configured: true,
        verified: data.verified || false,
        lastTested: data.lastTested,
      });

      toast({
        title: 'Email Configuration Saved',
        description: 'System-wide email integration settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const saveFirebaseConfig = async () => {
    setSaving('firebase');
    try {
      const response = await fetch('/api/system-settings/integrations/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(firebaseConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save Firebase configuration');
      }

      const data = await response.json();
      setFirebaseStatus({
        configured: true,
        verified: data.verified || false,
        lastTested: data.lastTested,
      });

      toast({
        title: 'Firebase Configuration Saved',
        description: 'System-wide push notification settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const saveWebhookConfig = async () => {
    setSaving('webhook');
    try {
      const response = await fetch('/api/system-settings/integrations/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to save webhook configuration');
      }

      const data = await response.json();
      setWebhookStatus({
        configured: true,
        verified: data.verified || false,
        lastTested: data.lastTested,
      });

      toast({
        title: 'Webhook Configuration Saved',
        description: 'System-wide webhook settings have been updated.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  };

  const testTwilio = async () => {
    if (!testPhone.trim()) {
      toast({
        title: 'Phone Required',
        description: 'Enter a phone number to send a test SMS',
        variant: 'destructive',
      });
      return;
    }

    setTesting('twilio');
    try {
      const response = await fetch('/api/system-settings/integrations/twilio/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Test failed');
      }

      setTwilioStatus(prev => ({
        ...prev,
        verified: true,
        lastTested: new Date().toISOString(),
      }));

      toast({
        title: 'Test SMS Sent',
        description: `Check ${testPhone} for the test message`,
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test SMS',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const testEmailIntegration = async () => {
    if (!testEmail.trim()) {
      toast({
        title: 'Email Required',
        description: 'Enter an email address to send a test email',
        variant: 'destructive',
      });
      return;
    }

    setTesting('email');
    try {
      const response = await fetch('/api/system-settings/integrations/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Test failed');
      }

      setEmailStatus(prev => ({
        ...prev,
        verified: true,
        lastTested: new Date().toISOString(),
      }));

      toast({
        title: 'Test Email Sent',
        description: `Check ${testEmail} for the test message`,
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const testFirebase = async () => {
    if (!testFcmToken.trim()) {
      toast({
        title: 'FCM Token Required',
        description: 'Enter an FCM device token to send a test push notification',
        variant: 'destructive',
      });
      return;
    }

    setTesting('firebase');
    try {
      const response = await fetch('/api/system-settings/integrations/firebase/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcmToken: testFcmToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Test failed');
      }

      setFirebaseStatus(prev => ({
        ...prev,
        verified: true,
        lastTested: new Date().toISOString(),
      }));

      toast({
        title: 'Test Push Notification Sent',
        description: 'Check the device for the test notification',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test push notification',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const testWebhook = async () => {
    setTesting('webhook');
    try {
      const response = await fetch('/api/system-settings/integrations/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Test failed');
      }

      setWebhookStatus(prev => ({
        ...prev,
        verified: true,
        lastTested: new Date().toISOString(),
      }));

      toast({
        title: 'Test Webhook Sent',
        description: 'Check your webhook endpoint for the test payload',
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: error instanceof Error ? error.message : 'Failed to send test webhook',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  const getFcmToken = async () => {
    setGettingFcmToken(true);
    try {
      // Dynamically import the Firebase client library to avoid SSR issues
      const { requestNotificationPermission, isPushSupported, isFirebaseConfigured, onForegroundMessage } = await import('@/lib/firebase');

      if (!isPushSupported()) {
        toast({
          title: 'Push Not Supported',
          description: 'Push notifications are not supported in this browser. Try using Chrome, Firefox, or Edge.',
          variant: 'destructive',
        });
        return;
      }

      if (!isFirebaseConfigured()) {
        toast({
          title: 'Firebase Not Configured',
          description: 'Firebase client-side configuration is missing. Ensure NEXT_PUBLIC_FIREBASE_* environment variables are set.',
          variant: 'destructive',
        });
        return;
      }

      const result = await requestNotificationPermission();

      if (!result.granted) {
        toast({
          title: 'Permission Denied',
          description: result.error || 'Notification permission was not granted. Please allow notifications in your browser settings.',
          variant: 'destructive',
        });
        return;
      }

      if (!result.token) {
        toast({
          title: 'Token Error',
          description: result.error || 'Failed to get FCM device token.',
          variant: 'destructive',
        });
        return;
      }

      // Set up foreground message handler to show notifications while the page is open
      onForegroundMessage((payload) => {
        console.log('[Firebase] Foreground message received:', payload);
        // Show browser notification
        if (Notification.permission === 'granted') {
          new Notification(payload.title, {
            body: payload.body,
            icon: '/icon-192x192.png',
          });
        }
        // Also show a toast
        toast({
          title: payload.title,
          description: payload.body,
        });
        // Dispatch custom event to refresh notification bell
        // This allows the NotificationBell component to update its unread count
        window.dispatchEvent(new CustomEvent('notification-received'));
      });

      // Set the token in the input field
      setTestFcmToken(result.token);

      toast({
        title: 'FCM Token Retrieved',
        description: 'The device token has been filled in. You can now send a test push notification.',
      });
    } catch (error) {
      console.error('Error getting FCM token:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get FCM device token',
        variant: 'destructive',
      });
    } finally {
      setGettingFcmToken(false);
    }
  };

  const copyFcmToken = async () => {
    if (!testFcmToken) return;

    try {
      await navigator.clipboard.writeText(testFcmToken);
      toast({
        title: 'Copied',
        description: 'FCM token copied to clipboard',
      });
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy token to clipboard',
        variant: 'destructive',
      });
    }
  };

  const renderStatusBadge = (status: IntegrationStatus) => {
    if (status.verified) {
      return (
        <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    if (status.configured) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
          <AlertCircle className="h-3 w-3 mr-1" />
          Not Tested
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Not Configured
      </Badge>
    );
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
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/20">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* System-wide notice */}
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Globe className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-700 dark:text-amber-500 mb-1">System-Wide Configuration</p>
              <p className="text-muted-foreground">
                These settings apply to the entire StewardTrack platform. Individual tenants can override
                some settings based on their subscription tier.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible className="space-y-4" defaultValue={showEmail ? 'email' : 'twilio'}>
        {/* Email Integration */}
        {showEmail && (
          <AccordionItem value="email" className="border rounded-lg overflow-hidden">
            <Card className="border-0 shadow-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2.5 rounded-lg bg-blue-500/10">
                    <Mail className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Email Service</span>
                      {renderStatusBadge(emailStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      System-wide transactional and notification emails
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  {/* Email Form */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email-provider">Provider</Label>
                      <Select
                        value={emailConfig.provider}
                        onValueChange={(value) => setEmailConfig(prev => ({ ...prev, provider: value as EmailConfig['provider'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resend">Resend</SelectItem>
                          <SelectItem value="sendgrid">SendGrid</SelectItem>
                          <SelectItem value="smtp">Custom SMTP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-api-key">API Key</Label>
                      <div className="relative">
                        <Input
                          id="email-api-key"
                          type={showEmailApiKey ? 'text' : 'password'}
                          placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={emailConfig.apiKey}
                          onChange={(e) => setEmailConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                          className="font-mono text-sm pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowEmailApiKey(!showEmailApiKey)}
                        >
                          {showEmailApiKey ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-from">From Email</Label>
                      <Input
                        id="email-from"
                        type="email"
                        placeholder="noreply@stewardtrack.com"
                        value={emailConfig.fromEmail}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-name">From Name</Label>
                      <Input
                        id="email-name"
                        placeholder="StewardTrack"
                        value={emailConfig.fromName}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email-reply">Reply-To Email (Optional)</Label>
                      <Input
                        id="email-reply"
                        type="email"
                        placeholder="support@stewardtrack.com"
                        value={emailConfig.replyTo}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, replyTo: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Test Section */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="text-sm font-medium mb-3">Test Configuration</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        type="email"
                        placeholder="Enter email address to test"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={testEmailIntegration}
                        disabled={testing === 'email' || !emailStatus.configured}
                        className="shrink-0"
                      >
                        {testing === 'email' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Test Email
                      </Button>
                    </div>
                    {emailStatus.lastTested && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last tested: {new Date(emailStatus.lastTested).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="link" size="sm" asChild className="px-0 text-muted-foreground">
                    <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Resend Dashboard
                    </a>
                  </Button>
                  <Button
                    onClick={saveEmailConfig}
                    disabled={saving === 'email'}
                  >
                    {saving === 'email' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                </CardFooter>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        {/* Twilio SMS Integration */}
        {showTwilio && (
          <AccordionItem value="twilio" className="border rounded-lg overflow-hidden">
            <Card className="border-0 shadow-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2.5 rounded-lg bg-purple-500/10">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Twilio SMS</span>
                      {renderStatusBadge(twilioStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      System-wide SMS notifications and alerts
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  {/* Twilio Form */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="twilio-sid">Account SID</Label>
                      <Input
                        id="twilio-sid"
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={twilioConfig.accountSid}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, accountSid: e.target.value }))}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twilio-token">Auth Token</Label>
                      <div className="relative">
                        <Input
                          id="twilio-token"
                          type={showTwilioToken ? 'text' : 'password'}
                          placeholder="Enter your auth token"
                          value={twilioConfig.authToken}
                          onChange={(e) => setTwilioConfig(prev => ({ ...prev, authToken: e.target.value }))}
                          className="font-mono text-sm pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowTwilioToken(!showTwilioToken)}
                        >
                          {showTwilioToken ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twilio-number">From Phone Number</Label>
                      <Input
                        id="twilio-number"
                        placeholder="+1234567890"
                        value={twilioConfig.fromNumber}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, fromNumber: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Twilio phone number in E.164 format (used for US numbers)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twilio-sender-id">Alphanumeric Sender ID (Optional)</Label>
                      <Input
                        id="twilio-sender-id"
                        placeholder="YourChurch"
                        value={twilioConfig.senderId}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, senderId: e.target.value }))}
                        maxLength={11}
                      />
                      <p className="text-xs text-muted-foreground">
                        Used for international SMS (non-US). Must be registered with Twilio. Max 11 characters.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twilio-messaging-sid">Messaging Service SID (Optional)</Label>
                      <Input
                        id="twilio-messaging-sid"
                        placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={twilioConfig.messagingServiceSid}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, messagingServiceSid: e.target.value }))}
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Test Section */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="text-sm font-medium mb-3">Test Configuration</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input
                        placeholder="Enter phone number to test"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={testTwilio}
                        disabled={testing === 'twilio' || !twilioStatus.configured}
                        className="shrink-0"
                      >
                        {testing === 'twilio' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Test SMS
                      </Button>
                    </div>
                    {twilioStatus.lastTested && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last tested: {new Date(twilioStatus.lastTested).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="link" size="sm" asChild className="px-0 text-muted-foreground">
                    <a href="https://www.twilio.com/console" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Twilio Console
                    </a>
                  </Button>
                  <Button
                    onClick={saveTwilioConfig}
                    disabled={saving === 'twilio'}
                  >
                    {saving === 'twilio' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                </CardFooter>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        {/* Firebase Push Notifications */}
        {showFirebase && (
          <AccordionItem value="firebase" className="border rounded-lg overflow-hidden">
            <Card className="border-0 shadow-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2.5 rounded-lg bg-orange-500/10">
                    <Bell className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Firebase Cloud Messaging</span>
                      {renderStatusBadge(firebaseStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      System-wide push notifications for web and mobile
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  {/* Firebase Form */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="firebase-project">Project ID</Label>
                      <Input
                        id="firebase-project"
                        placeholder="your-project-id"
                        value={firebaseConfig.projectId}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, projectId: e.target.value }))}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firebase-email">Client Email</Label>
                      <Input
                        id="firebase-email"
                        type="email"
                        placeholder="firebase-adminsdk@your-project.iam.gserviceaccount.com"
                        value={firebaseConfig.clientEmail}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, clientEmail: e.target.value }))}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="firebase-key">Private Key</Label>
                      <div className="relative">
                        <Input
                          id="firebase-key"
                          type={showFirebaseKey ? 'text' : 'password'}
                          placeholder="-----BEGIN PRIVATE KEY-----\n..."
                          value={firebaseConfig.privateKey}
                          onChange={(e) => setFirebaseConfig(prev => ({ ...prev, privateKey: e.target.value }))}
                          className="font-mono text-sm pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowFirebaseKey(!showFirebaseKey)}
                        >
                          {showFirebaseKey ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        From your Firebase service account JSON file
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="firebase-vapid">VAPID Key (Optional)</Label>
                      <Input
                        id="firebase-vapid"
                        placeholder="BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        value={firebaseConfig.vapidKey}
                        onChange={(e) => setFirebaseConfig(prev => ({ ...prev, vapidKey: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Web push certificate key pair for browser notifications
                      </p>
                    </div>

                    <div className="space-y-2 flex items-center justify-between sm:col-span-1">
                      <div>
                        <Label htmlFor="firebase-enabled">Enable Push Notifications</Label>
                        <p className="text-xs text-muted-foreground">
                          Toggle system-wide push notification delivery
                        </p>
                      </div>
                      <Switch
                        id="firebase-enabled"
                        checked={firebaseConfig.enabled}
                        onCheckedChange={(checked) => setFirebaseConfig(prev => ({ ...prev, enabled: checked }))}
                      />
                    </div>
                  </div>

                  {/* Test Section */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="text-sm font-medium mb-3">Test Configuration</h4>
                    <div className="space-y-3">
                      {/* Get FCM Token Button */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <Input
                            placeholder="Click 'Get FCM Token' or enter token manually"
                            value={testFcmToken}
                            onChange={(e) => setTestFcmToken(e.target.value)}
                            className="font-mono text-xs pr-10"
                          />
                          {testFcmToken && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                              onClick={copyFcmToken}
                              title="Copy token"
                            >
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          onClick={getFcmToken}
                          disabled={gettingFcmToken}
                          className="shrink-0"
                        >
                          {gettingFcmToken ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Key className="h-4 w-4 mr-2" />
                          )}
                          Get FCM Token
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click &quot;Get FCM Token&quot; to request notification permission and retrieve this browser&apos;s device token.
                      </p>
                      {/* Send Test Push Button */}
                      <div className="flex justify-end pt-2">
                        <Button
                          variant="outline"
                          onClick={testFirebase}
                          disabled={testing === 'firebase' || !firebaseStatus.configured || !testFcmToken}
                          className="shrink-0"
                        >
                          {testing === 'firebase' ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Send Test Push
                        </Button>
                      </div>
                    </div>
                    {firebaseStatus.lastTested && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last tested: {new Date(firebaseStatus.lastTested).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="link" size="sm" asChild className="px-0 text-muted-foreground">
                    <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open Firebase Console
                    </a>
                  </Button>
                  <Button
                    onClick={saveFirebaseConfig}
                    disabled={saving === 'firebase'}
                  >
                    {saving === 'firebase' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                </CardFooter>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}

        {/* Webhook Integration */}
        {showWebhook && (
          <AccordionItem value="webhook" className="border rounded-lg overflow-hidden">
            <Card className="border-0 shadow-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10">
                    <Webhook className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Webhook Delivery</span>
                      {renderStatusBadge(webhookStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      System-wide event notifications to external systems
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  {/* Webhook Form */}
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">Webhook URL</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        placeholder="https://your-system.com/webhook/stewardtrack"
                        value={webhookConfig.url}
                        onChange={(e) => setWebhookConfig(prev => ({ ...prev, url: e.target.value }))}
                        className="font-mono text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">Signing Secret</Label>
                      <div className="relative">
                        <Input
                          id="webhook-secret"
                          type={showWebhookSecret ? 'text' : 'password'}
                          placeholder="Enter a secret key for signature verification"
                          value={webhookConfig.secret}
                          onChange={(e) => setWebhookConfig(prev => ({ ...prev, secret: e.target.value }))}
                          className="font-mono text-sm pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                        >
                          {showWebhookSecret ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="webhook-retry">Retry Policy</Label>
                        <Select
                          value={webhookConfig.retryPolicy}
                          onValueChange={(value) => setWebhookConfig(prev => ({ ...prev, retryPolicy: value as WebhookConfig['retryPolicy'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select retry policy" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Retries</SelectItem>
                            <SelectItem value="linear">Linear Backoff</SelectItem>
                            <SelectItem value="exponential">Exponential Backoff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="webhook-retries">Max Retries</Label>
                        <Input
                          id="webhook-retries"
                          type="number"
                          min="0"
                          max="10"
                          value={webhookConfig.maxRetries}
                          onChange={(e) => setWebhookConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="webhook-enabled">Enable Webhook Delivery</Label>
                        <p className="text-xs text-muted-foreground">
                          Toggle system-wide webhook event delivery
                        </p>
                      </div>
                      <Switch
                        id="webhook-enabled"
                        checked={webhookConfig.enabled}
                        onCheckedChange={(checked) => setWebhookConfig(prev => ({ ...prev, enabled: checked }))}
                      />
                    </div>
                  </div>

                  {/* Test Section */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="text-sm font-medium mb-3">Test Configuration</h4>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <p className="flex-1 text-sm text-muted-foreground">
                        Send a test payload to verify your webhook endpoint is receiving and processing events correctly.
                      </p>
                      <Button
                        variant="outline"
                        onClick={testWebhook}
                        disabled={testing === 'webhook' || !webhookStatus.configured}
                        className="shrink-0"
                      >
                        {testing === 'webhook' ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Test Webhook
                      </Button>
                    </div>
                    {webhookStatus.lastTested && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Last tested: {new Date(webhookStatus.lastTested).toLocaleString()}
                      </p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between border-t pt-4">
                  <Button variant="link" size="sm" asChild className="px-0 text-muted-foreground">
                    <a href="https://webhook.site" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Test with Webhook.site
                    </a>
                  </Button>
                  <Button
                    onClick={saveWebhookConfig}
                    disabled={saving === 'webhook'}
                  >
                    {saving === 'webhook' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Save Configuration
                  </Button>
                </CardFooter>
              </AccordionContent>
            </Card>
          </AccordionItem>
        )}
      </Accordion>

      {/* Security Note */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Security Note</p>
              <p>
                API keys and tokens are encrypted before storage. These system-wide settings affect all tenants.
                Always test your configuration in a staging environment before enabling in production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
