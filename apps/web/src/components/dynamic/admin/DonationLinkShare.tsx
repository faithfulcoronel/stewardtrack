'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, ExternalLink, Share2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DonationLinkData {
  tenantId: string;
  tenantName: string;
  token: string;
  donationUrl: string;
  shortPath: string;
}

export interface DonationLinkShareProps {
  triggerLabel?: string;
  triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

export function DonationLinkShare({
  triggerLabel = 'Share Donation Link',
  triggerVariant = 'outline',
}: DonationLinkShareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [linkData, setLinkData] = useState<DonationLinkData | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !linkData) {
      fetchDonationLink();
    }
  }, [isOpen, linkData]);

  const fetchDonationLink = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/donations/share-link');
      const result = await response.json();

      if (result.success) {
        setLinkData(result.data);
      } else {
        toast.error(result.error || 'Failed to load donation link');
      }
    } catch (error) {
      console.error('Error fetching donation link:', error);
      toast.error('Failed to load donation link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!linkData) return;

    try {
      await navigator.clipboard.writeText(linkData.donationUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleOpenLink = () => {
    if (!linkData) return;
    window.open(linkData.donationUrl, '_blank');
  };

  const handleShare = async () => {
    if (!linkData) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Donate to ${linkData.tenantName}`,
          text: `Support ${linkData.tenantName} with a donation`,
          url: linkData.donationUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        if ((error as Error).name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('donation-qr-code');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `donation-qr-${linkData?.tenantName?.replace(/\s+/g, '-').toLowerCase() || 'code'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} className="gap-2">
          <Share2 className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Donation Link</DialogTitle>
          <DialogDescription>
            Share this link with your congregation to receive online donations.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : linkData ? (
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="qr">QR Code</TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="donation-link">Donation URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="donation-link"
                    value={linkData.donationUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleOpenLink}
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Donors can use this link to make one-time or recurring donations
                securely via Xendit.
              </p>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border bg-white p-4">
                  <QRCodeSVG
                    id="donation-qr-code"
                    value={linkData.donationUrl}
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Scan to donate to {linkData.tenantName}
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleDownloadQR}
              >
                <QrCode className="h-4 w-4" />
                Download QR Code
              </Button>

              <p className="text-xs text-muted-foreground">
                Print this QR code for bulletins, posters, or display screens.
              </p>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Unable to load donation link
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DonationLinkShare;
