import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms | Flowspace",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Terms of Service</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Replace this placeholder copy with your product terms before inviting customers.
      </p>
      <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
        <li>- Flowspace is provided as-is for demonstration purposes.</li>
        <li>- Authentication and data storage are handled by your Supabase project.</li>
        <li>- Update this content with real policies for production launches.</li>
      </ul>
      <p className="mt-8 text-sm">
        <Link className="text-foreground underline-offset-4 hover:underline" href="/">
          Return home
        </Link>
      </p>
    </div>
  );
}
