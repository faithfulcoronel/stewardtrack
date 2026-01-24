'use client';

import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, ExternalLink, Share2, Loader2, Link2, AlertCircle, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DonationLinkData {
  tenantId: string;
  tenantName: string;
  token?: string;
  donationUrl?: string;
  shortPath?: string;
  isConfigured: boolean;
  configurationRequired?: boolean;
  message?: string;
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
  const [isLoading, setIsLoading] = useState(true);
  const [linkData, setLinkData] = useState<DonationLinkData | null>(null);
  const [copied, setCopied] = useState(false);

  // Check configuration status on mount
  useEffect(() => {
    fetchDonationLink();
  }, []);

  // Refetch when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchDonationLink();
    }
  }, [isOpen]);

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

  const isConfigured = linkData?.isConfigured ?? false;

  const handleCopyLink = async () => {
    if (!linkData?.donationUrl) return;

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
    if (!linkData?.donationUrl) return;
    window.open(linkData.donationUrl, '_blank');
  };

  const handleShare = async () => {
    if (!linkData?.donationUrl) return;

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

  // If still loading initial state, show loading button
  if (isLoading && !linkData) {
    return (
      <Button
        variant={triggerVariant}
        disabled
        className={cn(
          "gap-2",
          triggerVariant === 'outline' && "border-border/60"
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {triggerLabel}
      </Button>
    );
  }

  // If not configured, show disabled button with tooltip
  if (!isConfigured) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex">
              <Button
                variant={triggerVariant}
                disabled
                className={cn(
                  "gap-2 cursor-not-allowed opacity-60",
                  triggerVariant === 'outline' && "border-border/60"
                )}
              >
                <Share2 className="h-4 w-4" />
                {triggerLabel}
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-3">
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-sm">
                  Online donations require a financial source with payout settings configured.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 mt-1"
                asChild
              >
                <Link href="/admin/finance/sources">
                  <Settings className="h-3.5 w-3.5" />
                  Configure Financial Sources
                </Link>
              </Button>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          className={cn(
            "gap-2",
            triggerVariant === 'outline' && "border-border/60 hover:border-primary/40"
          )}
        >
          <Share2 className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md border-border/40 bg-background/95 backdrop-blur-md">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="h-5 w-1 rounded-full bg-primary" />
            Share Donation Link
          </DialogTitle>
          <DialogDescription className="pl-3">
            Share this link with your congregation to receive online donations.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Loading donation link...</p>
          </div>
        ) : linkData && linkData.donationUrl ? (
          <Tabs defaultValue="link" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger
                value="link"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Link
              </TabsTrigger>
              <TabsTrigger
                value="qr"
                className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
              >
                <QrCode className="mr-2 h-4 w-4" />
                QR Code
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="space-y-4 mt-4 animate-in fade-in-0 slide-in-from-left-2 duration-200">
              <div className="space-y-2">
                <Label htmlFor="donation-link" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Donation URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="donation-link"
                    value={linkData.donationUrl}
                    readOnly
                    className="font-mono text-xs sm:text-sm border-border/60 bg-muted/30"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={handleCopyLink}
                    className={cn(
                      "shrink-0 border-border/60 transition-all duration-200",
                      copied && "border-emerald-500/50 bg-emerald-500/10"
                    )}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-border/60 hover:border-primary/40"
                  onClick={handleOpenLink}
                >
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  variant="default"
                  className="flex-1 gap-2 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98]"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              <p className="text-xs text-muted-foreground/80 bg-muted/30 rounded-lg p-3">
                Donors can use this link to make one-time or recurring donations
                securely via Xendit.
              </p>
            </TabsContent>

            <TabsContent value="qr" className="space-y-4 mt-4 animate-in fade-in-0 slide-in-from-right-2 duration-200">
              <div className="flex flex-col items-center gap-4">
                <div className={cn(
                  "rounded-2xl border-2 border-border/40 bg-white p-4 sm:p-5",
                  "shadow-lg shadow-black/5 transition-all duration-200",
                  "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10"
                )}>
                  <QRCodeSVG
                    id="donation-qr-code"
                    value={linkData.donationUrl}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Scan to donate to <span className="font-medium text-foreground">{linkData.tenantName}</span>
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2 border-border/60 hover:border-primary/40"
                onClick={handleDownloadQR}
              >
                <QrCode className="h-4 w-4" />
                Download QR Code
              </Button>

              <p className="text-xs text-muted-foreground/80 bg-muted/30 rounded-lg p-3">
                Print this QR code for bulletins, posters, or display screens.
              </p>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/50">
              <Link2 className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">Unable to load donation link</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DonationLinkShare;
