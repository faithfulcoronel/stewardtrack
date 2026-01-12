"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Clock } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  useInactivityTimeout,
  type InactivityTimeoutConfig,
} from "@/hooks/useInactivityTimeout";

export type InactivityTimeoutProviderProps = {
  children: React.ReactNode;
  /** Server action to perform logout, with optional return URL for redirect after login */
  logoutAction: (returnUrl?: string) => Promise<void>;
  /** Timeout duration in milliseconds before showing warning (default: 15 minutes) */
  timeoutMs?: number;
  /** Warning duration in milliseconds before auto-logout (default: 60 seconds) */
  warningMs?: number;
  /** Whether the timeout is enabled (default: true) */
  enabled?: boolean;
};

export function InactivityTimeoutProvider({
  children,
  logoutAction,
  timeoutMs,
  warningMs,
  enabled = true,
}: InactivityTimeoutProviderProps) {
  const [isPending, startTransition] = useTransition();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Build the full return URL including search params
  const getCurrentUrl = useCallback(() => {
    const search = searchParams.toString();
    return search ? `${pathname}?${search}` : pathname;
  }, [pathname, searchParams]);

  const handleTimeout = useCallback(() => {
    const returnUrl = getCurrentUrl();
    startTransition(async () => {
      await logoutAction(returnUrl);
    });
  }, [logoutAction, getCurrentUrl]);

  const { showWarning, remainingSeconds, resetTimer, triggerLogout } =
    useInactivityTimeout({
      timeoutMs,
      warningMs,
      onTimeout: handleTimeout,
      enabled,
    } satisfies InactivityTimeoutConfig);

  const handleStayLoggedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const handleLogoutNow = useCallback(() => {
    triggerLogout();
  }, [triggerLogout]);

  return (
    <>
      {children}
      <InactivityWarningDialog
        open={showWarning}
        remainingSeconds={remainingSeconds}
        isPending={isPending}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleLogoutNow}
      />
    </>
  );
}

type InactivityWarningDialogProps = {
  open: boolean;
  remainingSeconds: number;
  isPending: boolean;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
};

function InactivityWarningDialog({
  open,
  remainingSeconds,
  isPending,
  onStayLoggedIn,
  onLogoutNow,
}: InactivityWarningDialogProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    }
    return `${secs} second${secs !== 1 ? "s" : ""}`;
  };

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <AlertDialogTitle className="text-center">
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session is about to expire due to inactivity. You will be
            automatically logged out in{" "}
            <span className="font-semibold text-foreground">
              {formatTime(remainingSeconds)}
            </span>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={onLogoutNow}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? "Logging out..." : "Log Out Now"}
          </Button>
          <AlertDialogAction
            onClick={onStayLoggedIn}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Stay Logged In
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
