'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft } from 'lucide-react';

export function SubscriptionExpiredActions() {
  const router = useRouter();

  const handleSubscribe = () => {
    router.push('/admin/subscription');
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/admin');
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={handleSubscribe}
        className="w-full"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Renew Subscription
      </Button>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleGoBack}
          className="flex-1"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>

        <Button
          variant="ghost"
          onClick={handleGoHome}
          className="flex-1"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
