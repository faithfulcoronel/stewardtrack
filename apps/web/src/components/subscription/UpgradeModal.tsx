'use client';

import { useRouter } from 'next/navigation';
import { Crown, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
  title?: string;
  description?: string;
}

/**
 * Modal displayed when a user tries to access a feature that requires an active subscription
 */
export function UpgradeModal({
  open,
  onOpenChange,
  featureName,
  title,
  description,
}: UpgradeModalProps) {
  const router = useRouter();

  const handleSubscribe = () => {
    onOpenChange(false);
    router.push('/admin/subscription');
  };

  const displayTitle = title || 'Subscribe to Use This Feature';
  const displayDescription =
    description ||
    (featureName
      ? `The ${featureName} feature requires an active subscription. Subscribe now to unlock this and other premium features.`
      : 'This feature requires an active subscription. Subscribe now to unlock premium features and get the most out of StewardTrack.');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary shadow-lg" style={{ background: "var(--sidebar)",
            color: "var(--sidebar-foreground)"}}>
            <Crown className="size-8" />
          </div>
          <DialogTitle className="text-xl">{displayTitle}</DialogTitle>
          <DialogDescription className="text-center">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Unlock Premium Features</p>
              <p className="text-xs text-muted-foreground">
                Access all advanced tools and features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Priority Support</p>
              <p className="text-xs text-muted-foreground">
                Get help when you need it most
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Advanced Analytics</p>
              <p className="text-xs text-muted-foreground">
                Deep insights into your church data
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleSubscribe}
            className="w-full"
          >
            <Crown className="mr-2 size-4" />
            Subscribe Now
          </Button>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
