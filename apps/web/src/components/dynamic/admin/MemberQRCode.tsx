"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, QrCode, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface MemberQRCodeProps {
  memberId: string;
  memberName: string;
  /** Pre-generated short token for the member. If not provided, memberId is used directly (less secure). */
  token?: string;
  title?: string;
  description?: string;
  size?: number;
  logoUrl?: string;
  baseUrl?: string;
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_")
    .trim();
}

export function MemberQRCode({
  memberId,
  memberName,
  token,
  title = "Member QR Code",
  description = "Scan this QR code to identify this member.",
  size = 200,
  logoUrl = "/logo_square.svg",
  baseUrl,
}: MemberQRCodeProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Calculate logo size (approximately 20% of QR code size)
  const logoSize = Math.floor(size * 0.2);

  // Determine base URL: use prop, env var, or current origin
  const resolvedBaseUrl = baseUrl
    ?? process.env.NEXT_PUBLIC_APP_URL
    ?? (typeof window !== "undefined" ? window.location.origin : "https://stewardtrack.com");

  // Build the member profile URL - use short URL if token provided
  const memberProfileUrl = token
    ? `${resolvedBaseUrl}/s/${token}`
    : `${resolvedBaseUrl}/admin/members/${memberId}`;

  const handleDownload = React.useCallback(async () => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) {
      return;
    }

    // Create a new canvas with white background for JPG export
    const exportCanvas = document.createElement("canvas");
    const padding = 20;
    exportCanvas.width = canvas.width + padding * 2;
    exportCanvas.height = canvas.height + padding * 2;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) {
      return;
    }

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the QR code centered with padding
    ctx.drawImage(canvas, padding, padding);

    // Draw the dark background for logo in the center
    const exportLogoSize = Math.floor(canvas.width * 0.2);
    const logoCenterX = padding + (canvas.width - exportLogoSize) / 2;
    const logoCenterY = padding + (canvas.height - exportLogoSize) / 2;

    // Draw dark background
    ctx.fillStyle = "#18181b"; // zinc-900
    ctx.fillRect(logoCenterX, logoCenterY, exportLogoSize, exportLogoSize);

    // Load and draw the logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject(new Error("Failed to load logo"));
        logoImg.src = logoUrl;
      });

      // Draw logo centered within the dark background
      const logoPadding = 4;
      const innerLogoSize = exportLogoSize - logoPadding * 2;
      ctx.drawImage(
        logoImg,
        logoCenterX + logoPadding,
        logoCenterY + logoPadding,
        innerLogoSize,
        innerLogoSize
      );
    } catch (error) {
      console.warn("Could not include logo in download:", error);
    }

    // Convert to JPG and download
    const dataUrl = exportCanvas.toDataURL("image/jpeg", 0.95);
    const filename = `${sanitizeFilename(memberName)}_QRCode.jpg`;

    const link = document.createElement("a");
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }, [memberName, logoUrl]);

  if (!memberId) {
    return (
      <Card className={cn(
        "group relative overflow-hidden",
        "border-border/40 bg-card/50 backdrop-blur-sm"
      )}>
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/40" />

        <CardHeader className="relative space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60 ring-1 ring-border/40">
              <QrCode className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <CardDescription className="text-sm">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 shadow-inner mb-3">
              <AlertCircle className="h-6 w-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm text-muted-foreground">
              No member ID available to generate QR code.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "group relative overflow-hidden",
      "border-border/40 bg-card/50 backdrop-blur-sm",
      "transition-all duration-300",
      "hover:border-border hover:shadow-lg hover:shadow-primary/5"
    )}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/60" />

      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

      <CardHeader className="relative space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/20">
            <QrCode className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative flex flex-col items-center gap-4 sm:gap-5">
        {/* QR Code Container */}
        <div
          ref={canvasRef}
          className={cn(
            "relative rounded-xl p-4 sm:p-5",
            "bg-white",
            "ring-1 ring-border/40",
            "shadow-sm transition-shadow duration-300",
            "group-hover:shadow-md group-hover:ring-border/60"
          )}
        >
          <QRCodeCanvas
            value={memberProfileUrl}
            size={size}
            level="H"
            includeMargin={false}
            bgColor="#ffffff"
            fgColor="#000000"
            imageSettings={{
              src: logoUrl,
              height: logoSize,
              width: logoSize,
              excavate: true,
            }}
          />
          {/* Dark background overlay for logo visibility */}
          <div
            className="absolute pointer-events-none flex items-center justify-center bg-zinc-900 rounded-sm"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: logoSize,
              height: logoSize,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoUrl}
              alt="StewardTrack"
              width={logoSize - 8}
              height={logoSize - 8}
              className="object-contain"
            />
          </div>
        </div>

        {/* URL Display */}
        <div className={cn(
          "w-full max-w-[280px] p-3 rounded-lg",
          "bg-muted/40 border border-border/30",
          "text-center"
        )}>
          <p className="text-[10px] sm:text-xs text-muted-foreground break-all font-mono leading-relaxed">
            {memberProfileUrl}
          </p>
        </div>

        {/* Download Button */}
        <Button
          variant="outline"
          onClick={handleDownload}
          className={cn(
            "gap-2 h-11 min-h-[44px] px-5 w-full sm:w-auto",
            "border-border/60 hover:border-primary/40 hover:bg-primary/5",
            "touch-manipulation transition-colors"
          )}
        >
          <Download className="size-4" />
          Download QR Code
        </Button>
      </CardContent>
    </Card>
  );
}
