'use client';

import * as React from 'react';
import {
  CreditCard,
  Smartphone,
  Building2,
  Star,
  Trash2,
  Loader2,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { PaymentMethodType } from '@/models/donation.model';

// API response type matching PaymentMethodDisplay from model
interface PaymentMethod {
  id: string;
  payment_type: PaymentMethodType;
  display_name: string;
  masked_account: string | null;
  channel_code: string | null;
  is_default: boolean;
  nickname: string | null;
  icon: string;
}

export interface PaymentMethodManagerProps {
  /** Title for the section */
  title?: string;
  /** Description for the section */
  description?: string;
  /** CSS class name */
  className?: string;
  /** Callback when a payment method is set as default */
  onDefaultChange?: (paymentMethodId: string) => void;
  /** Callback when a payment method is removed */
  onRemove?: (paymentMethodId: string) => void;
}

const PAYMENT_TYPE_ICONS: Record<PaymentMethodType, React.ReactNode> = {
  card: <CreditCard className="h-5 w-5" />,
  ewallet: <Smartphone className="h-5 w-5" />,
  bank_transfer: <Building2 className="h-5 w-5" />,
  direct_debit: <Building2 className="h-5 w-5" />,
};

const PAYMENT_TYPE_LABELS: Record<PaymentMethodType, string> = {
  card: 'Credit/Debit Card',
  ewallet: 'E-Wallet',
  bank_transfer: 'Bank Transfer',
  direct_debit: 'Direct Debit',
};

export function PaymentMethodManager({
  title = 'Saved Payment Methods',
  description = 'Manage your saved payment methods for faster donations',
  className,
  onDefaultChange,
  onRemove,
}: PaymentMethodManagerProps) {
  const [paymentMethods, setPaymentMethods] = React.useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = React.useState<string | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [methodToRemove, setMethodToRemove] = React.useState<PaymentMethod | null>(null);

  // Fetch payment methods on mount
  const fetchPaymentMethods = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/members/me/payment-methods');
      const result = await response.json();

      if (result.success && result.data) {
        setPaymentMethods(result.data);
      } else {
        setError(result.error || 'Failed to load payment methods');
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err);
      setError('Failed to load payment methods');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleSetDefault = async (paymentMethod: PaymentMethod) => {
    if (paymentMethod.is_default) return;

    try {
      setSettingDefaultId(paymentMethod.id);
      const response = await fetch(
        `/api/members/me/payment-methods/${paymentMethod.id}/default`,
        { method: 'PUT' }
      );
      const result = await response.json();

      if (result.success) {
        // Update local state
        setPaymentMethods((prev) =>
          prev.map((pm) => ({
            ...pm,
            is_default: pm.id === paymentMethod.id,
          }))
        );
        toast.success('Default payment method updated');
        onDefaultChange?.(paymentMethod.id);
      } else {
        toast.error(result.error || 'Failed to set default payment method');
      }
    } catch (err) {
      console.error('Error setting default:', err);
      toast.error('Failed to set default payment method');
    } finally {
      setSettingDefaultId(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!methodToRemove) return;

    try {
      setRemovingId(methodToRemove.id);
      const response = await fetch(
        `/api/members/me/payment-methods/${methodToRemove.id}`,
        { method: 'DELETE' }
      );
      const result = await response.json();

      if (result.success) {
        // Update local state
        setPaymentMethods((prev) => prev.filter((pm) => pm.id !== methodToRemove.id));
        toast.success('Payment method removed');
        onRemove?.(methodToRemove.id);
      } else {
        toast.error(result.error || 'Failed to remove payment method');
      }
    } catch (err) {
      console.error('Error removing payment method:', err);
      toast.error('Failed to remove payment method');
    } finally {
      setRemovingId(null);
      setMethodToRemove(null);
    }
  };

  const getPaymentMethodIcon = (paymentMethod: PaymentMethod) => {
    return PAYMENT_TYPE_ICONS[paymentMethod.payment_type] || <Wallet className="h-5 w-5" />;
  };

  const getPaymentMethodLabel = (paymentMethod: PaymentMethod) => {
    if (paymentMethod.channel_code) {
      return paymentMethod.channel_code.replace(/_/g, ' ');
    }
    return PAYMENT_TYPE_LABELS[paymentMethod.payment_type] || paymentMethod.payment_type;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={fetchPaymentMethods}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">{title}</CardTitle>
              {description && <CardDescription className="mt-1">{description}</CardDescription>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {paymentMethods.length > 0 ? (
            paymentMethods.map((paymentMethod) => (
              <div
                key={paymentMethod.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-lg border bg-card transition-colors',
                  paymentMethod.is_default && 'border-primary/50 bg-primary/5'
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center',
                    paymentMethod.is_default
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {getPaymentMethodIcon(paymentMethod)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {paymentMethod.nickname || paymentMethod.display_name}
                    </span>
                    {paymentMethod.is_default && (
                      <Badge variant="default" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Default
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getPaymentMethodLabel(paymentMethod)}
                    {paymentMethod.masked_account && ` - ${paymentMethod.masked_account}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {!paymentMethod.is_default && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSetDefault(paymentMethod)}
                      disabled={settingDefaultId === paymentMethod.id}
                      title="Set as default"
                    >
                      {settingDefaultId === paymentMethod.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Star className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMethodToRemove(paymentMethod)}
                    disabled={removingId === paymentMethod.id}
                    className="text-destructive hover:text-destructive"
                    title="Remove payment method"
                  >
                    {removingId === paymentMethod.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No saved payment methods</p>
              <p className="text-xs mt-1 text-muted-foreground">
                Save a payment method during your next donation for faster checkout
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!methodToRemove} onOpenChange={() => setMethodToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-medium">
                {methodToRemove?.nickname || methodToRemove?.display_name}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!removingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              disabled={!!removingId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PaymentMethodManager;
