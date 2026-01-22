import { Metadata } from 'next';
import { Crown } from 'lucide-react';
import { SubscriptionExpiredActions } from './SubscriptionExpiredActions';

export const metadata: Metadata = {
  title: 'Subscription Expired | StewardTrack',
  description: 'Your subscription has expired. Renew to continue using premium features.',
};

export default function SubscriptionExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <div className="bg-card shadow-lg rounded-lg p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 rounded-full p-4">
              <Crown className="h-12 w-12 text-primary" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Subscription Expired
          </h1>

          {/* Message */}
          <p className="text-muted-foreground mb-2">
            Your subscription has expired and access to premium features is no longer available.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            Renew your subscription to continue using all the features of StewardTrack,
            including finance management, advanced planning, and more.
          </p>

          {/* Actions - Client Component */}
          <SubscriptionExpiredActions />

          {/* Additional Info */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Need help? Contact our support team for assistance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
