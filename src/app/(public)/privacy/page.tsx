import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy | Flowspace",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        This is a placeholder policy. Replace it with your actual privacy details before launching.
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Flowspace does not store personal data beyond what Supabase manages for authentication. Consult your legal
        counsel when adapting this template.
      </p>
      <p className="mt-8 text-sm">
        <Link className="text-foreground underline-offset-4 hover:underline" href="/">
          Return home
        </Link>
      </p>
    </div>
  );
}
