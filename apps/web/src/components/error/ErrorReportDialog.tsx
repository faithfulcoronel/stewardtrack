'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { AlertTriangle, Bug, Send, RefreshCcw, X, Code, Layers, ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  sanitizeError,
  getUserFriendlyMessage,
  sanitizeErrorMessage,
  sanitizeStackTrace,
  sanitizeComponentStack,
} from './sanitizeError';

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

export interface ErrorInfo {
  error: Error;
  errorInfo?: React.ErrorInfo;
  errorId?: string;
}

interface ErrorReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorInfo: ErrorInfo | null;
  onRetry?: () => void;
}

export function ErrorReportDialog({
  open,
  onOpenChange,
  errorInfo,
  onRetry,
}: ErrorReportDialogProps) {
  const [userFeedback, setUserFeedback] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Sanitize error data to remove sensitive information
  const sanitizedData = useMemo(() => {
    if (!errorInfo) return null;
    return sanitizeError(errorInfo.error, errorInfo.errorInfo);
  }, [errorInfo]);

  // Get user-friendly message for production
  const userFriendlyMessage = useMemo(() => {
    if (!errorInfo) return 'An unexpected error occurred.';
    return getUserFriendlyMessage(errorInfo.error);
  }, [errorInfo]);

  const handleSendReport = async () => {
    if (!errorInfo || !sanitizedData) return;

    setIsSending(true);

    try {
      // Send sanitized data to the API
      const response = await fetch('/api/error-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorMessage: sanitizedData.message,
          stackTrace: sanitizedData.stack,
          componentStack: sanitizedData.componentStack,
          userFeedback: userFeedback.trim() || undefined,
          errorUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
          errorId: errorInfo.errorId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send error report');
      }

      setSent(true);
      toast.success('Error report sent successfully. Thank you for your feedback!');
    } catch (err) {
      console.error('Failed to send error report:', err);
      toast.error('Failed to send error report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    setUserFeedback('');
    setSent(false);
    onOpenChange(false);
  };

  const handleRetry = () => {
    handleClose();
    onRetry?.();
  };

  if (!errorInfo || !sanitizedData) return null;

  // Development mode: Show sanitized error information for debugging
  // Even in dev mode, we sanitize to prevent accidental exposure of secrets
  if (isDevelopment) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <DialogTitle>Development Error</DialogTitle>
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                    DEV MODE
                  </Badge>
                </div>
                <DialogDescription>
                  Sanitized error information is shown below for debugging.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Sensitive Data Warning */}
            {sanitizedData.hasSensitiveData && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
                <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Sensitive data was detected and redacted from the display.
                </p>
              </div>
            )}

            {/* Error Message - Sanitized */}
            <div className="rounded-lg border-2 border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-2">
                <Bug className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
                <div className="flex-1 space-y-1">
                  <p className="font-mono text-sm font-semibold text-destructive">
                    {sanitizedData.name}
                  </p>
                  <p className="font-mono text-sm text-destructive">
                    {sanitizedData.message}
                  </p>
                </div>
              </div>
              {errorInfo.errorId && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Error ID: <code className="rounded bg-muted px-1">{errorInfo.errorId}</code>
                </p>
              )}
            </div>

            {/* Stack Trace - Sanitized, visible in dev mode */}
            {sanitizedData.stack && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Stack Trace (Sanitized)</Label>
                </div>
                <pre className="max-h-48 overflow-auto rounded-lg border bg-zinc-950 p-3 font-mono text-xs text-zinc-100 dark:bg-zinc-900">
                  {sanitizedData.stack}
                </pre>
              </div>
            )}

            {/* Component Stack - Sanitized, visible in dev mode */}
            {sanitizedData.componentStack && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">Component Stack (Sanitized)</Label>
                </div>
                <pre className="max-h-48 overflow-auto rounded-lg border bg-zinc-950 p-3 font-mono text-xs text-zinc-100 dark:bg-zinc-900">
                  {sanitizedData.componentStack}
                </pre>
              </div>
            )}

            {/* URL where error occurred */}
            {typeof window !== 'undefined' && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">URL:</span>{' '}
                  <code className="break-all">{window.location.pathname}</code>
                </p>
              </div>
            )}

            {/* User Feedback - Optional in dev mode */}
            {!sent && (
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="feedback" className="border rounded-lg">
                  <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Add steps to reproduce & send report
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Full error details will be sent securely to the support team.
                      </p>
                      <Textarea
                        id="user-feedback-dev"
                        placeholder="Steps to reproduce:
1. I was on...
2. I clicked...
3. The error appeared..."
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                        rows={3}
                        disabled={isSending}
                      />
                      <Button onClick={handleSendReport} disabled={isSending} size="sm">
                        {isSending ? (
                          <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Send report
                          </>
                        )}
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {sent && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
                <p className="text-sm text-green-700 dark:text-green-300">
                  Error report sent to support team.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" />
              Close
            </Button>
            {onRetry && (
              <Button onClick={handleRetry}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Production mode: User-friendly error dialog - NO technical details shown
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>Something went wrong</DialogTitle>
              <DialogDescription>
                An unexpected error occurred. You can send a report to help us fix this issue.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* User-friendly Error Message - No technical details */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              {userFriendlyMessage}
            </p>
            {errorInfo.errorId && (
              <p className="mt-2 text-xs text-muted-foreground">
                Reference: <code className="rounded bg-muted px-1">{errorInfo.errorId}</code>
              </p>
            )}
          </div>

          {/* User Feedback - Steps to Reproduce */}
          {!sent && (
            <div className="space-y-2">
              <Label htmlFor="user-feedback">
                Steps to reproduce <span className="text-muted-foreground">(helps us fix it faster)</span>
              </Label>
              <Textarea
                id="user-feedback"
                placeholder="Please describe the steps you took before this error occurred:

1. I was on the [page name]...
2. I clicked on [button/link]...
3. Then I tried to...
4. The error appeared when..."
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                rows={5}
                disabled={isSending}
              />
              <p className="text-xs text-muted-foreground">
                Technical details will be sent securely to our support team.
              </p>
            </div>
          )}

          {sent && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-950">
              <p className="text-sm text-green-700 dark:text-green-300">
                Thank you for reporting this issue! Our team has been notified and will investigate.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {!sent ? (
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSending}>
                <X className="mr-2 h-4 w-4" />
                Close
              </Button>
              {onRetry && (
                <Button variant="secondary" onClick={handleRetry} disabled={isSending}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              )}
              <Button onClick={handleSendReport} disabled={isSending}>
                {isSending ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send report
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              {onRetry && (
                <Button onClick={handleRetry}>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ErrorReportDialog;
