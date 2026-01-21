"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
