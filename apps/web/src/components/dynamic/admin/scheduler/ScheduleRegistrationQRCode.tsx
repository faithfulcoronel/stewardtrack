'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  QrCode,
  RefreshCw,
  Download,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Printer,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import {
  QRCodeWithLogo,
  downloadQRCode,
  getQRCodeDataUrl,
  sanitizeFilename,
} from '@/components/ui/qr-code';

interface QRTokenData {
  token: string;
  registrationUrl: string;
  expiresAt: string;
  expiresInHours: number;
}

export interface ScheduleRegistrationQRCodeProps {
  scheduleId: string;
  scheduleName?: string;
  registrationRequired?: boolean;
  className?: string;
  logoUrl?: string;
}

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

// Get default datetime for custom expiry (7 days from now)
const getDefaultCustomExpiry = (): Date => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};

export function ScheduleRegistrationQRCode({
  scheduleId,
  scheduleName = 'Schedule',
  registrationRequired = false,
  className,
  logoUrl = '/logo_square.svg',
}: ScheduleRegistrationQRCodeProps) {
  const [qrData, setQrData] = useState<QRTokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiryMode, setExpiryMode] = useState<string>('168'); // 7 days default
  const [customExpiry, setCustomExpiry] = useState<Date | undefined>(getDefaultCustomExpiry());
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const fetchQRToken = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/community/scheduler/schedules/${scheduleId}/registration-qr`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data?.token) {
          setQrData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching registration QR token:', error);
    } finally {
      setIsLoading(false);
    }
  }, [scheduleId]);

  useEffect(() => {
    if (registrationRequired) {
      fetchQRToken();
    } else {
      setIsLoading(false);
    }
  }, [fetchQRToken, registrationRequired]);

  const handleGenerateToken = async () => {
    try {
      setIsGenerating(true);

      let requestBody: { expires_in_hours?: number; expires_at?: string };
      let description: string;

      if (expiryMode === 'custom') {
        if (!customExpiry) {
          toast({
            title: 'Invalid Date',
            description: 'Please select an expiration date and time.',
            variant: 'destructive',
          });
          setIsGenerating(false);
          return;
        }
        if (customExpiry <= new Date()) {
          toast({
            title: 'Invalid Date',
            description: 'Expiration time must be in the future.',
            variant: 'destructive',
          });
          setIsGenerating(false);
          return;
        }
        requestBody = { expires_at: customExpiry.toISOString() };
        description = `Valid until ${formatDateTime(customExpiry.toISOString())}.`;
      } else {
        const hours = parseInt(expiryMode);
        requestBody = { expires_in_hours: hours };
        description = `Valid for ${hours > 24 ? `${hours / 24} days` : `${hours} hours`}.`;
      }

      const response = await fetch(
        `/api/community/scheduler/schedules/${scheduleId}/registration-qr`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate registration QR token');
      }

      const result = await response.json();
      setQrData(result.data);

      toast({
        title: 'Registration QR Code Generated',
        description,
      });
    } catch (error) {
      console.error('Error generating registration QR token:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate registration QR code.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = async () => {
    if (!qrData?.registrationUrl) return;

    try {
      await navigator.clipboard.writeText(qrData.registrationUrl);
      toast({
        title: 'Copied',
        description: 'Registration link copied to clipboard.',
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadQR = useCallback(async () => {
    if (!qrData?.registrationUrl) return;

    const filename = `${sanitizeFilename(scheduleName)}_RegistrationQR.jpg`;
    const success = await downloadQRCode(qrContainerRef, filename, logoUrl);

    if (success) {
      toast({
        title: 'Downloaded',
        description: 'Registration QR code image downloaded.',
      });
    }
  }, [qrData?.registrationUrl, scheduleName, logoUrl, toast]);

  const handlePrint = useCallback(async () => {
    if (!qrData?.registrationUrl) return;

    const qrImageUrl = await getQRCodeDataUrl(qrContainerRef, logoUrl);
    if (!qrImageUrl) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Registration QR Code - ${scheduleName}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: system-ui, sans-serif;
            }
            h1 { margin-bottom: 10px; }
            p { color: #666; margin-bottom: 30px; }
            img { border: 1px solid #ddd; padding: 20px; }
            .instructions {
              margin-top: 30px;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 8px;
              max-width: 400px;
              text-align: center;
            }
            .instructions h3 { margin-bottom: 10px; }
            .instructions ol { text-align: left; margin: 0; padding-left: 20px; }
            .instructions li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <h1>${scheduleName}</h1>
          <p>Scan to register for this event</p>
          <img src="${qrImageUrl}" alt="Registration QR Code" />
          <p style="margin-top: 20px; font-size: 12px;">
            Valid until: ${formatDateTime(qrData.expiresAt)}
          </p>
          <div class="instructions">
            <h3>How to Register</h3>
            <ol>
              <li>Open your phone's camera</li>
              <li>Point it at this QR code</li>
              <li>Tap the link that appears</li>
              <li>Fill out the registration form</li>
              <li>You'll receive a confirmation!</li>
            </ol>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }, [qrData?.registrationUrl, qrData?.expiresAt, scheduleName, logoUrl]);

  const handleShare = async () => {
    if (!qrData?.registrationUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Register: ${scheduleName}`,
          text: 'Scan this QR code or use this link to register for the event',
          url: qrData.registrationUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      await navigator.clipboard.writeText(qrData.registrationUrl);
      toast({
        title: 'Link Copied',
        description: 'Registration link copied to clipboard.',
      });
    }
  };

  // Don't show if registration is not required
  if (!registrationRequired) {
    return null;
  }

  const isExpired = qrData?.expiresAt ? new Date(qrData.expiresAt) < new Date() : false;

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5" />
                Registration QR Code
              </CardTitle>
              <CardDescription>
                Generate a QR code for guests to scan and register for this event
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* QR Code Display */}
            <div className="flex flex-col items-center space-y-4">
              {isLoading ? (
                <div className="w-64 h-64 bg-muted animate-pulse rounded-lg" />
              ) : qrData?.registrationUrl ? (
                <>
                  <div className="relative">
                    <div ref={qrContainerRef}>
                      <QRCodeWithLogo
                        value={qrData.registrationUrl}
                        size={256}
                        logoUrl={logoUrl}
                        disabled={isExpired}
                      />
                    </div>
                    {isExpired && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                        <Badge variant="destructive" className="text-lg px-4 py-2">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Expired
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="text-center">
                    {isExpired ? (
                      <p className="text-destructive flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Registration link has expired
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Valid until {formatDateTime(qrData.expiresAt)}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleDownloadQR}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleShare}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-64 h-64 border-2 border-dashed rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-12 h-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No registration QR code</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Generate Registration QR Code</h3>

                <div className="space-y-2">
                  <Label>Validity Period</Label>
                  <Select value={expiryMode} onValueChange={setExpiryMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="24">1 day</SelectItem>
                      <SelectItem value="72">3 days</SelectItem>
                      <SelectItem value="168">7 days (1 week)</SelectItem>
                      <SelectItem value="336">14 days (2 weeks)</SelectItem>
                      <SelectItem value="720">30 days (1 month)</SelectItem>
                      <SelectItem value="custom">Custom date/time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {expiryMode === 'custom' && (
                  <div className="space-y-2">
                    <Label>Expires At</Label>
                    <DateTimePicker
                      value={customExpiry}
                      onChange={setCustomExpiry}
                      placeholder="Select expiration date & time"
                      title="Set Expiration"
                      description="Choose when the registration link should expire"
                      minDate={new Date()}
                      clearable={false}
                    />
                  </div>
                )}

                <Button
                  onClick={handleGenerateToken}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      {qrData?.token ? 'Regenerate QR Code' : 'Generate QR Code'}
                    </>
                  )}
                </Button>
              </div>

              {qrData?.registrationUrl && (
                <>
                  <div className="space-y-2">
                    <Label>Registration Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={qrData.registrationUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={handleCopyLink}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-medium text-sm">How It Works</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                        <span>Guests scan the QR code with their phone camera</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                        <span>They fill out the registration form</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                        <span>Confirmation is sent via email</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600 shrink-0" />
                        <span>No account required for guests</span>
                      </li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
