import { Metadata } from "next";
import Link from "next/link";
import { FileQuestion, Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found | StewardTrack",
  description: "The page you are looking for does not exist or has been moved.",
};

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4">
      <div className="max-w-lg w-full text-center">
        {/* Animated 404 Display */}
        <div className="relative mb-8">
          <div className="text-[10rem] font-bold leading-none text-muted-foreground/10 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/10 rounded-full p-6 backdrop-blur-sm">
              <FileQuestion className="h-16 w-16 text-primary" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-card shadow-xl rounded-2xl border border-border/50 p-8 backdrop-blur-sm">
          {/* Title */}
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Page Not Found
          </h1>

          {/* Message */}
          <p className="text-muted-foreground mb-2">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <p className="text-sm text-muted-foreground/80 mb-8">
            Check the URL for typos, or use the navigation below to find what you need.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/admin">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-4 text-xs text-muted-foreground uppercase tracking-wider">
                or try
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Link
              href="/admin/members"
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              Members
            </Link>
            <Link
              href="/admin/community/households"
              className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            >
              <Search className="h-4 w-4" />
              Households
            </Link>
          </div>
        </div>

        {/* Footer Info */}
        <p className="mt-6 text-xs text-muted-foreground/60">
          Error Code: 404 &middot; Resource Not Found
        </p>
      </div>
    </div>
  );
}
