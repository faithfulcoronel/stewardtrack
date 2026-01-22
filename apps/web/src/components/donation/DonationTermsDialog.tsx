'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Heart, Shield, CreditCard, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DonationTermsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void | Promise<void>;
  amount: number;
  totalCharged: number;
  xenditFee: number;
  platformFee: number;
  currency?: string;
  churchName?: string;
  isProcessing?: boolean;
}

interface TermItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  required: boolean;
}

const formatCurrency = (amount: number, currency: string = 'PHP') => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export function DonationTermsDialog({
  open,
  onOpenChange,
  onAccept,
  amount,
  totalCharged,
  xenditFee,
  platformFee,
  currency = 'PHP',
  churchName = 'the church',
  isProcessing = false,
}: DonationTermsDialogProps) {
  const [acceptedTerms, setAcceptedTerms] = useState<Record<string, boolean>>({
    donation_understanding: false,
    fee_acknowledgment: false,
    data_privacy: false,
    refund_policy: false,
  });

  const totalFees = xenditFee + platformFee;

  const terms: TermItem[] = [
    {
      id: 'donation_understanding',
      icon: <Heart className="h-4 w-4 text-rose-500" />,
      title: 'Donation Understanding',
      description: `I understand that I am making a voluntary donation of ${formatCurrency(amount, currency)} to ${churchName}. This donation is given freely and without expectation of goods or services in return.`,
      required: true,
    },
    {
      id: 'fee_acknowledgment',
      icon: <CreditCard className="h-4 w-4 text-blue-500" />,
      title: 'Transaction Fee Acknowledgment',
      description: `I acknowledge that transaction fees totaling ${formatCurrency(totalFees, currency)} (Payment Processing: ${formatCurrency(xenditFee, currency)} + Platform Fee: ${formatCurrency(platformFee, currency)}) will be added to my donation. The total amount charged to my payment method will be ${formatCurrency(totalCharged, currency)}. ${churchName} will receive the full ${formatCurrency(amount, currency)} donation.`,
      required: true,
    },
    {
      id: 'data_privacy',
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      title: 'Data Privacy Consent',
      description: `I consent to the collection and processing of my personal information (name, email, payment details) for the purpose of processing this donation. My payment details are securely processed by Xendit, a PCI-DSS compliant payment provider. ${churchName} will not store my sensitive payment information.`,
      required: true,
    },
    {
      id: 'refund_policy',
      icon: <FileText className="h-4 w-4 text-amber-500" />,
      title: 'Refund Policy',
      description: `I understand that donations are generally non-refundable. In exceptional circumstances, refund requests may be submitted within 14 days of the transaction and are subject to review. Transaction fees may not be refundable even if the donation is refunded.`,
      required: true,
    },
  ];

  const allRequiredAccepted = terms
    .filter((t) => t.required)
    .every((t) => acceptedTerms[t.id]);

  const handleTermChange = (termId: string, checked: boolean) => {
    setAcceptedTerms((prev) => ({
      ...prev,
      [termId]: checked,
    }));
  };

  const handleAccept = async () => {
    if (!allRequiredAccepted) return;
    await onAccept();
  };

  const handleCancel = () => {
    // Reset state when dialog closes
    setAcceptedTerms({
      donation_understanding: false,
      fee_acknowledgment: false,
      data_privacy: false,
      refund_policy: false,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-1.5">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Terms and Conditions
          </DialogTitle>
          <DialogDescription>
            Please review and accept the following terms before proceeding with your donation.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Card */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Donation Amount</span>
              <p className="font-semibold text-foreground">{formatCurrency(amount, currency)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Transaction Fees</span>
              <p className="font-semibold text-foreground">{formatCurrency(totalFees, currency)}</p>
            </div>
            <div className="col-span-2">
              <Separator className="my-2" />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total to be charged</span>
                <span className="font-bold text-lg text-primary">
                  {formatCurrency(totalCharged, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Terms List */}
        <ScrollArea className="flex-1 pr-4 max-h-[300px]">
          <div className="space-y-4 py-2">
            {terms.map((term, _index) => (
              <div
                key={term.id}
                className={cn(
                  'rounded-lg border p-4 transition-colors',
                  acceptedTerms[term.id]
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={term.id}
                    checked={acceptedTerms[term.id]}
                    onCheckedChange={(checked) =>
                      handleTermChange(term.id, checked === true)
                    }
                    disabled={isProcessing}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={term.id}
                      className="flex items-center gap-2 font-medium cursor-pointer"
                    >
                      {term.icon}
                      {term.title}
                      {term.required && (
                        <span className="text-xs text-destructive">*</span>
                      )}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                      {term.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Accept All Shortcut */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="accept_all"
            checked={allRequiredAccepted}
            onCheckedChange={(checked) => {
              const newState = checked === true;
              setAcceptedTerms({
                donation_understanding: newState,
                fee_acknowledgment: newState,
                data_privacy: newState,
                refund_policy: newState,
              });
            }}
            disabled={isProcessing}
          />
          <Label htmlFor="accept_all" className="text-sm font-medium cursor-pointer">
            I have read and agree to all terms and conditions
          </Label>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!allRequiredAccepted || isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Heart className="h-4 w-4 mr-2" />
                Accept & Donate {formatCurrency(totalCharged, currency)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
