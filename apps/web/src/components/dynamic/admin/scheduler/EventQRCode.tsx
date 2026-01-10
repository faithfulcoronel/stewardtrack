'use client';

import { useState, useEffect, useCallback } from 'react';
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

interface QRTokenData {
  token: string;
  expiresAt: string;
  expiresInHours: number;
}

export interface EventQRCodeProps {
  occurrenceId: string;
  occurrenceTitle?: string;
  className?: string;
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

const generateQRCodeUrl = (data: string, size: number = 300): string => {
  // Using a QR code API service (you could also use a library like qrcode.react)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
};

export function EventQRCode({
  occurrenceId,
  occurrenceTitle = 'Event',
  className,
}: EventQRCodeProps) {
  const [qrData, setQrData] = useState<QRTokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expiryHours, setExpiryHours] = useState<string>('24');
  const { toast } = useToast();

  const fetchQRToken = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/qr-token`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.data?.token) {
          setQrData(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching QR token:', error);
    } finally {
      setIsLoading(false);
    }
  }, [occurrenceId]);

  useEffect(() => {
    fetchQRToken();
  }, [fetchQRToken]);

  const handleGenerateToken = async () => {
    try {
      setIsGenerating(true);
      const response = await fetch(
        `/api/community/scheduler/occurrences/${occurrenceId}/qr-token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expires_in_hours: parseInt(expiryHours) }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate QR token');
      }

      const result = await response.json();
      setQrData(result.data);

      toast({
        title: 'QR Code Generated',
        description: `Valid for ${expiryHours} hours.`,
      });
    } catch (error) {
      console.error('Error generating QR token:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate QR code.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToken = async () => {
    if (!qrData?.token) return;

    try {
      await navigator.clipboard.writeText(qrData.token);
      toast({
        title: 'Copied',
        description: 'Token copied to clipboard.',
      });
    } catch (error) {
      console.error('Error copying token:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy token.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadQR = () => {
    if (!qrData?.token) return;

    const link = document.createElement('a');
    link.href = generateQRCodeUrl(qrData.token, 500);
    link.download = `qr-code-${occurrenceId}.png`;
    link.click();

    toast({
      title: 'Downloaded',
      description: 'QR code image downloaded.',
    });
  };

  const handlePrint = () => {
    if (!qrData?.token) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>QR Code - ${occurrenceTitle}</title>
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
          </style>
        </head>
        <body>
          <h1>${occurrenceTitle}</h1>
          <p>Scan to check in</p>
          <img src="${generateQRCodeUrl(qrData.token, 400)}" alt="QR Code" />
          <p style="margin-top: 20px; font-size: 12px;">
            Valid until: ${formatDateTime(qrData.expiresAt)}
          </p>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShare = async () => {
    if (!qrData?.token) return;

    const checkInUrl = `${window.location.origin}/checkin?token=${qrData.token}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check-in: ${occurrenceTitle}`,
          text: 'Scan this QR code or use this link to check in',
          url: checkInUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      await navigator.clipboard.writeText(checkInUrl);
      toast({
        title: 'Link Copied',
        description: 'Check-in link copied to clipboard.',
      });
    }
  };

  const isExpired = qrData?.expiresAt ? new Date(qrData.expiresAt) < new Date() : false;

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Event QR Code
              </CardTitle>
              <CardDescription>
                Generate a QR code for self check-in
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
              ) : qrData?.token ? (
                <>
                  <div className="relative">
                    <img
                      src={generateQRCodeUrl(qrData.token, 256)}
                      alt="Event QR Code"
                      className={cn(
                        'w-64 h-64 border rounded-lg',
                        isExpired && 'opacity-50'
                      )}
                    />
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
                        QR code has expired
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
                    <p className="text-muted-foreground">No QR code generated</p>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Generate New QR Code</h3>

                <div className="space-y-2">
                  <Label>Validity Period</Label>
                  <Select value={expiryHours} onValueChange={setExpiryHours}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem>
                      <SelectItem value="2">2 hours</SelectItem>
                      <SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="8">8 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                      <SelectItem value="48">48 hours</SelectItem>
                      <SelectItem value="72">72 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

              {qrData?.token && (
                <>
                  <div className="space-y-2">
                    <Label>Token</Label>
                    <div className="flex gap-2">
                      <Input
                        value={qrData.token}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button variant="outline" size="icon" onClick={handleCopyToken}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <h4 className="font-medium text-sm">Instructions</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                        Display QR code at venue entrance
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                        Attendees scan with their phone camera
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                        They&apos;ll be taken to a check-in page
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-green-600" />
                        No app installation required
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
