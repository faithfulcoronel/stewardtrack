"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { forgotPassword, type ForgotPasswordState } from "@/lib/auth/actions";

const initialState: ForgotPasswordState = {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" disabled={pending}>
      {pending ? "Sending..." : "Send Reset Instructions"}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(forgotPassword, initialState);
  const [email, setEmail] = useState("");

  if (state.success) {
    return (
      <div className="space-y-6">
        {/* Success State */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle2 className="size-8 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">
              Check your email
            </h2>
            <p className="text-sm text-gray-600">
              We&apos;ve sent password reset instructions to{" "}
              <span className="font-medium text-gray-900">{email}</span>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <p className="text-sm text-gray-600">
            Didn&apos;t receive the email? Check your spam folder or make sure
            you entered the correct email address.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              // Reset the form to allow trying again
              window.location.reload();
            }}
          >
            Try a different email
          </Button>
          <Link href="/login" className="block">
            <Button variant="ghost" className="w-full">
              Return to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <label
          className="block text-sm font-medium text-foreground"
          htmlFor="email"
        >
          Email address
        </label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Mail className="size-4" />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="pastor@church.com"
            className="h-11 pl-10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {state.error ? (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        </div>
      ) : null}

      <SubmitButton />

      <div className="text-center text-sm">
        <span className="text-gray-500">Remember your password? </span>
        <Link
          href="/login"
          className="font-semibold text-[#179a65] hover:text-green-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </form>
  );
}
