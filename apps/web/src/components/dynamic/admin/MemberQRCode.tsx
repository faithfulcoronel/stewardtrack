"use client";

import * as React from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export interface MemberQRCodeProps {
  memberId: string;
  memberName: string;
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
  title = "Member QR Code",
  description = "Scan this QR code to identify this member.",
  size = 200,
  logoUrl = "/logo_square.svg",
  baseUrl = "https://stewardtrack.com",
}: MemberQRCodeProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);

  // Calculate logo size (approximately 20% of QR code size)
  const logoSize = Math.floor(size * 0.2);

  // Build the member profile URL
  const memberProfileUrl = `${baseUrl}/admin/members/${memberId}`;

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
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No member ID available to generate QR code.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div
          ref={canvasRef}
          className="relative rounded-lg border border-border/40 bg-white p-4"
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
        <div className="text-center max-w-[250px]">
          <p className="text-xs text-muted-foreground break-all font-mono">
            {memberProfileUrl}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="size-4" />
          Download QR Code
        </Button>
      </CardContent>
    </Card>
  );
}
