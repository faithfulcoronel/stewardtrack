"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState, useCallback } from "react";
import { Eye, EyeOff, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signInWithPassword, type SignInState } from "@/lib/auth/actions";

const initialState: SignInState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? "Signing in..." : "Sign in to your dashboard"}
    </Button>
  );
}

interface SignInFormProps {
  redirectTo?: string;
}

export function SignInForm({ redirectTo = '/admin' }: SignInFormProps) {
  const [state, formAction] = useActionState(signInWithPassword, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);

  /**
   * Handle resend verification email
   */
  const handleResendVerification = useCallback(async () => {
    if (!state.email || resending) return;

    setResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.email }),
      });

      const result = await response.json();

      if (response.status === 429) {
        setResendError(result.error || 'Too many attempts. Please wait before trying again.');
      } else if (!result.success) {
        setResendError(result.error || 'Failed to resend verification email.');
      } else {
        setResendSuccess(true);
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setResendError('An error occurred. Please try again.');
    } finally {
      setResending(false);
    }
  }, [state.email, resending]);

  // Show verification needed message
  if (state.needsVerification && state.email) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex items-start gap-3">
            <Mail className="size-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Email Verification Required
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Please verify your email address before signing in.
                Check your inbox for a verification link.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                {state.email}
              </p>
            </div>
          </div>
        </div>

        {resendSuccess && (
          <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Verification email sent! Please check your inbox.
            </AlertDescription>
          </Alert>
        )}

        {resendError && (
          <Alert variant="destructive">
            <AlertDescription>{resendError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleResendVerification}
            disabled={resending || resendSuccess}
            className="w-full"
          >
            {resending ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : resendSuccess ? (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Email Sent
              </>
            ) : (
              <>
                <Mail className="size-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Different Email
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Check your spam folder if you don't see the email.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden field to pass redirectTo to server action */}
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {/* Hidden field to pass Turnstile token to server action */}
      <input type="hidden" name="turnstileToken" value={turnstileToken || ''} />
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground" htmlFor="email">
          Email address
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="pastor@church.com"
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Checkbox id="remember" name="remember" />
          <label
            htmlFor="remember"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Remember me
          </label>
        </div>

        <a
          href="/forgot-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Forgot password?
        </a>
      </div>

      {state.error ? (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        </div>
      ) : null}

      {/* Cloudflare Turnstile CAPTCHA */}
      <div className="space-y-2">
        <div className="flex justify-center">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''}
            onSuccess={(token) => {
              setTurnstileToken(token);
              setTurnstileError(null);
            }}
            onError={() => {
              setTurnstileToken(null);
              setTurnstileError('Security check failed. Please try again.');
            }}
            onExpire={() => {
              setTurnstileToken(null);
            }}
            options={{
              theme: 'light',
              size: 'normal',
            }}
          />
        </div>
        {turnstileError && (
          <p className="text-sm text-destructive text-center">{turnstileError}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
