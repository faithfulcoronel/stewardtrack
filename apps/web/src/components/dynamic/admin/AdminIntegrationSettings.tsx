'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  MessageSquare,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Send,
  RefreshCw,
  Webhook,
  Crown,
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

export interface AdminIntegrationSettingsProps {
  title?: string;
  description?: string;
  showTwilio?: boolean;
  showEmail?: boolean;
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
}

interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'smtp';
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
}

interface WebhookConfig {
  url: string;
  secret: string;
  enabled: boolean;
}

export function AdminIntegrationSettings({
  title = 'Integration Settings',
  description = 'Configure external services for messaging and email',
  showTwilio = true,
  showEmail = true,
  showWebhook = true,
}: AdminIntegrationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'twilio' | 'email' | 'webhook' | null>(null);
  const [testing, setTesting] = useState<'twilio' | 'email' | 'webhook' | null>(null);

  // Visibility toggles for sensitive fields
  const [showTwilioToken, setShowTwilioToken] = useState(false);
  const [showEmailApiKey, setShowEmailApiKey] = useState(false);
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
  const [webhookStatus, setWebhookStatus] = useState<IntegrationStatus>({
    configured: false,
    verified: false,
  });

  // Form states
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    fromNumber: '',
  });
  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: 'resend',
    apiKey: '',
    fromEmail: '',
    fromName: '',
    replyTo: '',
  });
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    url: '',
    secret: '',
    enabled: true,
  });

  // Test configuration
  const [testPhone, setTestPhone] = useState('');
  const [testEmail, setTestEmail] = useState('');

  const { toast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    try {
      const response = await fetch('/api/settings/integrations');
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();

      if (data.twilio) {
        setTwilioConfig({
          accountSid: data.twilio.accountSid || '',
          authToken: data.twilio.authToken ? '••••••••••••••••' : '',
          fromNumber: data.twilio.fromNumber || '',
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

      if (data.webhook) {
        setWebhookConfig({
          url: data.webhook.url || '',
          secret: data.webhook.secret ? '••••••••••••••••' : '',
          enabled: data.webhook.enabled ?? true,
        });
        setWebhookStatus({
          configured: data.webhook.configured || false,
          verified: data.webhook.verified || false,
          lastTested: data.webhook.lastTested,
        });
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
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
      const response = await fetch('/api/settings/integrations/twilio', {
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
        description: 'Your SMS integration settings have been updated.',
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
      const response = await fetch('/api/settings/integrations/email', {
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
        description: 'Your email integration settings have been updated.',
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
      const response = await fetch('/api/settings/integrations/twilio/test', {
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
      const response = await fetch('/api/settings/integrations/email/test', {
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

  const saveWebhookConfig = async () => {
    setSaving('webhook');
    try {
      const response = await fetch('/api/settings/integrations/webhook', {
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
        description: 'Your webhook integration settings have been updated.',
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

  const testWebhook = async () => {
    setTesting('webhook');
    try {
      const response = await fetch('/api/settings/integrations/webhook/test', {
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
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      <Accordion type="single" collapsible className="space-y-4" defaultValue={showTwilio ? 'twilio' : 'email'}>
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
                      Send SMS notifications and alerts to members
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
                      <p className="text-xs text-muted-foreground">
                        Found in your Twilio Console dashboard
                      </p>
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

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="twilio-number">From Phone Number</Label>
                      <Input
                        id="twilio-number"
                        placeholder="+1234567890"
                        value={twilioConfig.fromNumber}
                        onChange={(e) => setTwilioConfig(prev => ({ ...prev, fromNumber: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Twilio phone number in E.164 format
                      </p>
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
                      Transactional and notification emails via Resend
                    </p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <CardContent className="pt-0 space-y-6">
                  <Separator />

                  {/* Email Form */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
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
                      <p className="text-xs text-muted-foreground">
                        Your Resend API key for sending emails
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-from">From Email</Label>
                      <Input
                        id="email-from"
                        type="email"
                        placeholder="noreply@yourchurch.org"
                        value={emailConfig.fromEmail}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Verified sender email address
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-name">From Name</Label>
                      <Input
                        id="email-name"
                        placeholder="Your Church Name"
                        value={emailConfig.fromName}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, fromName: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email-reply">Reply-To Email (Optional)</Label>
                      <Input
                        id="email-reply"
                        type="email"
                        placeholder="admin@yourchurch.org"
                        value={emailConfig.replyTo}
                        onChange={(e) => setEmailConfig(prev => ({ ...prev, replyTo: e.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        Replies will be sent to this address
                      </p>
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

        {/* Webhook Integration (Enterprise) */}
        {showWebhook && (
          <AccordionItem value="webhook" className="border rounded-lg overflow-hidden">
            <Card className="border-0 shadow-none">
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center gap-4 w-full">
                  <div className="p-2.5 rounded-lg bg-orange-500/10">
                    <Webhook className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">Webhook Delivery</span>
                      {renderStatusBadge(webhookStatus)}
                      <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                        <Crown className="h-3 w-3 mr-1" />
                        Enterprise
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Send notifications to external systems via HTTP webhooks
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
                        placeholder="https://your-system.com/webhook/notifications"
                        value={webhookConfig.url}
                        onChange={(e) => setWebhookConfig(prev => ({ ...prev, url: e.target.value }))}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        HTTPS endpoint that will receive notification payloads (HTTP allowed for localhost only)
                      </p>
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
                      <p className="text-xs text-muted-foreground">
                        Used to sign payloads with HMAC-SHA256. Verify the <code className="px-1 py-0.5 bg-muted rounded text-[11px]">X-StewardTrack-Signature</code> header.
                      </p>
                    </div>
                  </div>

                  {/* Webhook Payload Info */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <h4 className="text-sm font-medium mb-2">Payload Format</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Webhooks are sent as POST requests with the following headers:
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                      <li><code className="px-1 py-0.5 bg-muted rounded">Content-Type: application/json</code></li>
                      <li><code className="px-1 py-0.5 bg-muted rounded">X-StewardTrack-Signature</code> - HMAC-SHA256 signature</li>
                      <li><code className="px-1 py-0.5 bg-muted rounded">X-StewardTrack-Timestamp</code> - Unix timestamp</li>
                      <li><code className="px-1 py-0.5 bg-muted rounded">X-StewardTrack-Event-Type</code> - Event type (e.g., member.joined)</li>
                    </ul>
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

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Security Note</p>
              <p>
                API keys and tokens are encrypted before storage. Never share these credentials.
                Test your configuration before enabling notifications in production.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
