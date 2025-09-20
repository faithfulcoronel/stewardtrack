import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Sign in | Flowspace",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-5xl items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Use the credentials for your Supabase user to continue.
          </p>
        </div>
        <div className="mt-8">
          <SignInForm />
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Need an account? Manage users directly in Supabase and invite them by email. {" "}
          <Link className="font-medium text-foreground underline-offset-4 hover:underline" href="/">
            Go back
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
