/**
 * GateGuard Component
 *
 * React component wrapper for access control with declarative API
 */

'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GateGuardProps {
  // Access check function
  check: () => Promise<{ allowed: boolean; redirectTo?: string; reason?: string }>;

  // Content to show when access is granted
  children: ReactNode;

  // Content to show while checking access (optional)
  loading?: ReactNode;

  // Content to show when access is denied (optional)
  fallback?: ReactNode;

  // Whether to redirect on access denial
  redirect?: boolean;

  // Custom redirect path (overrides check result)
  redirectTo?: string;

  // Callback when access is denied
  onAccessDenied?: (reason?: string) => void;
}

/**
 * GateGuard - Declarative access control component
 *
 * @example
 * <GateGuard check={async () => ({ allowed: await canAccess() })}>
 *   <ProtectedContent />
 * </GateGuard>
 */
export function GateGuard({
  check,
  children,
  loading,
  fallback,
  redirect = false,
  redirectTo,
  onAccessDenied,
}: GateGuardProps) {
  const [state, setState] = useState<'checking' | 'allowed' | 'denied'>('checking');
  const [reason, setReason] = useState<string>();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function verifyAccess() {
      try {
        const result = await check();

        if (!mounted) return;

        if (result.allowed) {
          setState('allowed');
        } else {
          setState('denied');
          setReason(result.reason);

          if (onAccessDenied) {
            onAccessDenied(result.reason);
          }

          if (redirect) {
            const path = redirectTo || result.redirectTo || '/unauthorized';
            router.push(path);
          }
        }
      } catch (error) {
        if (!mounted) return;

        setState('denied');
        setReason(error instanceof Error ? error.message : 'Access check failed');

        if (onAccessDenied) {
          onAccessDenied(error instanceof Error ? error.message : 'Access check failed');
        }
      }
    }

    verifyAccess();

    return () => {
      mounted = false;
    };
  }, [check, redirect, redirectTo, router, onAccessDenied]);

  if (state === 'checking') {
    return <>{loading || <div>Verifying access...</div>}</>;
  }

  if (state === 'denied') {
    if (redirect) {
      // Show loading while redirecting
      return <>{loading || <div>Redirecting...</div>}</>;
    }

    return <>{fallback || <div>Access Denied: {reason}</div>}</>;
  }

  return <>{children}</>;
}
