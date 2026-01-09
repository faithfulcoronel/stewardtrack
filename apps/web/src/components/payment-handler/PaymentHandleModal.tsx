"use client";

import { CheckCircle2, CircleX, ShieldEllipsis , Loader2, PartyPopper, XCircle, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "../ui";

interface PaymentHandleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId?: string;
  onClose?: () => void;
  source: string;
}

export function PaymentHandleModal({
  open,
  onOpenChange,
  paymentId,
  onClose,
  source,
}: PaymentHandleModalProps) {
  const handleClose = () => {
    // Clean up URL by removing payment-related query parameters
    const currentParams = new URLSearchParams(window.location.search);
    currentParams.delete('payment');
    currentParams.delete('external_id');
    currentParams.delete('invoice_id');
    currentParams.delete('failed_payment');
    currentParams.delete('reason');

    const newUrl = currentParams.toString()
      ? `${window.location.pathname}?${currentParams.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);

    if (onClose) {
      onClose();
    }
    onOpenChange(false);
  };

  const router = useRouter();
  const searchParams = useSearchParams();

  const failedPayment = searchParams?.get('failed_payment') ? searchParams?.get('failed_payment') : null;
  const reason = searchParams?.get('reason') || 'Payment was not completed';
  const [isFailed, setIsFailed] = useState(false)

  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<any>(null);
  const [subscription, setSubscription] = useState<any | null>(null);
  const externalId = searchParams?.get('external_id') ? searchParams?.get('external_id') : null;
  const invoiceId = searchParams?.get('invoice_id') ? searchParams?.get('invoice_id') : null;

  const verifyPayment = useCallback(async () => {
    // Guard: don't attempt verification without identifiers
    if (!externalId && !invoiceId) {
      setError('No payment reference found. Please return to signup or contact support.');
      setVerifying(false);
      return;
    }

    try {
      setVerifying(true);
      const params = new URLSearchParams();
      if (externalId) params.append('external_id', externalId);
      if (invoiceId) params.append('invoice_id', invoiceId);

      const response = await fetch(`/api/checkout/verify-payment?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      if (data.status === 'paid' || data.status === 'settled') {
        setVerified(true);
        setPayment(data.payment);

        // Close modal and clean up URL after 3 seconds
        setTimeout(() => {
          // Clean up URL by removing payment-related query parameters
          const currentParams = new URLSearchParams(window.location.search);
          currentParams.delete('payment');
          currentParams.delete('external_id');
          currentParams.delete('invoice_id');
          currentParams.delete('failed_payment');
          currentParams.delete('reason');

          const newUrl = currentParams.toString()
            ? `${window.location.pathname}?${currentParams.toString()}`
            : window.location.pathname;

          window.history.replaceState({}, '', newUrl);

          if (onClose) {
            onClose();
          }
          onOpenChange(false);
        }, 3000);
      } else {
        setError(`Payment status: ${data.status}. Please contact support if you believe this is an error.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify payment');
    } finally {
      setVerifying(false);
    }
  }, [externalId, invoiceId]);

  useEffect(() => {
    if(failedPayment) {
        setIsFailed(true);
    }
    else {
      // Only attempt verification if we have at least one identifier
      if (externalId || invoiceId) {
        verifyPayment();
      } else {
        // No payment identifiers provided - show error immediately
        setError('No payment reference found. Please return to signup or contact support.');
        setVerifying(false);
      }
    }

  }, [failedPayment, externalId, invoiceId, verifyPayment]);

  const handleRetryPayment = () => {
  }

  const handleContactSupport = () => {
    // TODO: Replace with actual support email or link
    window.location.href = 'mailto:support@stewardtrack.com?subject=Payment Failed - Need Assistance';
  };

  if (isFailed) {
    return (
      <Dialog open={open} >
        <DialogContent className="sm:max-w-md"  showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} >
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              <DialogTitle className="text-center text-2xl">
              Payment Not Completed
            </DialogTitle>
            </div>
            <DialogDescription>
              Your payment could not be processed
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="rounded-full bg-red-100 p-6">
              <XCircle className="h-16 w-16 text-red-600" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Payment Failed</h3>
              <p className="text-sm text-gray-600">
                We were unable to process your payment
              </p>
            </div>
          </div>

          <Alert variant="destructive">
            <AlertDescription>{reason}</AlertDescription>
          </Alert>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-sm">Common reasons for payment failure:</h4>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Insufficient funds in account</li>
              <li>Payment method declined by bank</li>
              <li>Payment timeout or expired session</li>
              <li>Incorrect payment details entered</li>
              <li>Network connection issues</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={handleRetryPayment}
              className="w-full"
              size="lg"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Try Payment Again
            </Button>

            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="w-full"
            >
              Contact Support
            </Button>

            <Button
                onClick={handleClose}
              variant="ghost"
              className="w-full"
            >
              Close
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Need help? We're here to assist you.</p>
            <p>Email: support@stewardtrack.com</p>
          </div>

        </DialogContent>
      </Dialog>
    )
  }

  if (verifying) {
    return (
      <Dialog open={open}>
          <DialogContent className="sm:max-w-md" showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <ShieldEllipsis className="size-12 text-blue-600" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl">
                Verifying Payment
              </DialogTitle>
              <DialogDescription className="text-center text-red-600">
                Please wait while we confirm your payment...
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              <span className="text-sm text-gray-600">Confirming transaction...</span>
            </div>
            <DialogFooter></DialogFooter>
          </DialogContent>
        </Dialog>
    )
  }

  if(error) {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md" showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CircleX className="size-12 text-red-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Payment Verification Issue!
            </DialogTitle>
            <DialogDescription className="text-center text-red-600">
              { error }
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:justify-center">
            <Button onClick={() => verifyPayment()} className="w-full sm:w-auto">
              Try Again
            </Button>
            <Button onClick={handleClose} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (verified) {
    return (
      <Dialog open={open} >
          <DialogContent className="sm:max-w-md"  showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} >
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="size-12 text-green-600" />
                </div>
              </div>
              <DialogTitle className="text-center text-2xl">
                Payment Successful!
              </DialogTitle>
              <DialogDescription className="text-center text-green-600">
                Your subscription has been activated
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="rounded-full bg-green-100 p-6">
                <PartyPopper className="h-16 w-16 text-green-600" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Welcome to StewardTrack!</h3>
                <p className="text-sm text-gray-600">
                  Your payment has been processed successfully
                </p>
              </div>
            </div>

            {payment && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-gray-700">Payment Details</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-green-800">
                    {payment.currency} {payment.amount.toFixed(2)}
                  </span>
                </div>
                {payment.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Method:</span>
                    <span className="font-medium text-gray-600 capitalize">
                      {payment.payment_method.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {payment.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid:</span>
                    <span className="font-medium text-xs text-gray-600">
                      {new Date(payment.paid_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Alert>
            <AlertDescription>
              Redirecting to {source == '/onboarding'? 'onboarding' : 'admin'} page in 3 seconds...
            </AlertDescription>
          </Alert>

            <DialogFooter className="sm:justify-center">
              <Button onClick={handleClose} className="w-full sm:w-auto">
                Back to Page
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    )
  }
}
