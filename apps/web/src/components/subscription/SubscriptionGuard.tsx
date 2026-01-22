'use client';

import { ReactNode, useState, useCallback, cloneElement, isValidElement, ReactElement } from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { UpgradeModal } from './UpgradeModal';

interface SubscriptionGuardProps {
  /**
   * The content to protect. Can be any React node.
   * If children is a single element with onClick, it will be intercepted when subscription is expired.
   */
  children: ReactNode;

  /**
   * Name of the feature being protected (used in the upgrade modal)
   */
  featureName?: string;

  /**
   * Custom title for the upgrade modal
   */
  modalTitle?: string;

  /**
   * Custom description for the upgrade modal
   */
  modalDescription?: string;

  /**
   * If true, the child will be rendered but clicking will show the modal
   * If false, the child will not be rendered at all when expired
   * @default true
   */
  showDisabled?: boolean;

  /**
   * Content to render instead of children when subscription is expired and showDisabled is false
   */
  fallback?: ReactNode;

  /**
   * Callback when subscription is valid and user interacts with the content
   */
  onAccess?: () => void;

  /**
   * If true, skip the subscription check and always allow access
   * Useful for conditional feature gating
   * @default false
   */
  bypass?: boolean;
}

/**
 * SubscriptionGuard - Protects content based on subscription status
 *
 * This component checks if the user has an active subscription (not expired past grace period).
 * If subscription is expired, it will either:
 * 1. Show the upgrade modal when the user clicks on the protected content (showDisabled=true)
 * 2. Hide the content completely or show a fallback (showDisabled=false)
 *
 * @example
 * // Wrap a button - clicking shows upgrade modal when expired
 * <SubscriptionGuard featureName="Planning">
 *   <Button onClick={handlePlanningClick}>Open Planning</Button>
 * </SubscriptionGuard>
 *
 * @example
 * // Wrap navigation link - hide when expired
 * <SubscriptionGuard featureName="Reports" showDisabled={false}>
 *   <Link href="/admin/reports">Reports</Link>
 * </SubscriptionGuard>
 *
 * @example
 * // Conditional bypass based on feature flag
 * <SubscriptionGuard featureName="Basic Feature" bypass={isBasicTier}>
 *   <Button>Access Feature</Button>
 * </SubscriptionGuard>
 */
export function SubscriptionGuard({
  children,
  featureName,
  modalTitle,
  modalDescription,
  showDisabled = true,
  fallback,
  onAccess,
  bypass = false,
}: SubscriptionGuardProps) {
  const { status, isLoading } = useSubscriptionStatus();
  const [showModal, setShowModal] = useState(false);

  const handleInteraction = useCallback(
    (originalHandler?: (...args: any[]) => void) => {
      return (event: React.MouseEvent | React.KeyboardEvent) => {
        // If bypass is true, just call the original handler
        if (bypass) {
          originalHandler?.(event);
          onAccess?.();
          return;
        }

        // If subscription is expired, show upgrade modal
        if (status.isExpired) {
          event.preventDefault();
          event.stopPropagation();
          setShowModal(true);
          return;
        }

        // Subscription is active, allow the action
        originalHandler?.(event);
        onAccess?.();
      };
    },
    [bypass, status.isExpired, onAccess]
  );

  // While loading, show children as-is (optimistic rendering)
  if (isLoading) {
    return <>{children}</>;
  }

  // If bypass is true, render children without modification
  if (bypass) {
    return <>{children}</>;
  }

  // If subscription is expired and we shouldn't show disabled content
  if (status.isExpired && !showDisabled) {
    return <>{fallback || null}</>;
  }

  // If subscription is active, render children without modification
  if (!status.isExpired) {
    return <>{children}</>;
  }

  // Subscription is expired and showDisabled is true
  // We need to intercept clicks on the children
  const wrappedChildren = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        onClick: handleInteraction((children as ReactElement<any>).props?.onClick),
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            handleInteraction((children as ReactElement<any>).props?.onKeyDown)(event);
          }
        },
        // Add visual indicator that this is a premium feature
        className: `${(children as ReactElement<any>).props?.className || ''} cursor-pointer`.trim(),
      })
    : children;

  return (
    <>
      {wrappedChildren}
      <UpgradeModal
        open={showModal}
        onOpenChange={setShowModal}
        featureName={featureName}
        title={modalTitle}
        description={modalDescription}
      />
    </>
  );
}

/**
 * Hook version for programmatic subscription checks
 */
export function useSubscriptionGuard() {
  const { status, isLoading } = useSubscriptionStatus();
  const [showModal, setShowModal] = useState(false);

  const checkAccess = useCallback((): boolean => {
    if (status.isExpired) {
      setShowModal(true);
      return false;
    }
    return true;
  }, [status.isExpired]);

  const UpgradeModalComponent = useCallback(
    ({
      featureName,
      title,
      description,
    }: {
      featureName?: string;
      title?: string;
      description?: string;
    }) => (
      <UpgradeModal
        open={showModal}
        onOpenChange={setShowModal}
        featureName={featureName}
        title={title}
        description={description}
      />
    ),
    [showModal]
  );

  return {
    isExpired: status.isExpired,
    isActive: status.isActive,
    isInGracePeriod: status.isInGracePeriod,
    isLoading,
    checkAccess,
    showModal,
    setShowModal,
    UpgradeModal: UpgradeModalComponent,
  };
}
