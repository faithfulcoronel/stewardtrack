'use client';

import * as React from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '@/lib/utils';

export interface QRCodeWithLogoProps {
  /** The data/URL to encode in the QR code */
  value: string;
  /** Size of the QR code in pixels (default: 256) */
  size?: number;
  /** Logo URL to display in center (default: /logo_square.svg) */
  logoUrl?: string;
  /** Logo size as percentage of QR code size (default: 0.2 = 20%) */
  logoSizeRatio?: number;
  /** Background color for the logo (default: #18181b - zinc-900) */
  logoBgColor?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to render with reduced opacity (e.g., for expired state) */
  disabled?: boolean;
  /** Alt text for the logo image */
  logoAlt?: string;
}

/**
 * QR Code component with StewardTrack logo overlay.
 * Provides a standardized QR code design with the logo centered on a dark background.
 */
export function QRCodeWithLogo({
  value,
  size = 256,
  logoUrl = '/logo_square.svg',
  logoSizeRatio = 0.2,
  logoBgColor = '#18181b',
  className,
  disabled = false,
  logoAlt = 'StewardTrack',
}: QRCodeWithLogoProps) {
  const logoSize = Math.floor(size * logoSizeRatio);

  return (
    <div
      className={cn(
        'relative rounded-lg p-4 bg-white ring-1 ring-border/40',
        disabled && 'opacity-50',
        className
      )}
    >
      <QRCodeCanvas
        value={value}
        size={size}
        level="H" // High error correction to allow logo overlay
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
        className="absolute pointer-events-none flex items-center justify-center rounded-sm"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: logoSize,
          height: logoSize,
          backgroundColor: logoBgColor,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={logoAlt}
          width={logoSize - 8}
          height={logoSize - 8}
          className="object-contain"
        />
      </div>
    </div>
  );
}

/**
 * Utility function to download a QR code with logo as a JPG image.
 * Must be called with a ref to the QRCodeWithLogo container element.
 */
export async function downloadQRCode(
  containerRef: React.RefObject<HTMLDivElement | null>,
  filename: string,
  logoUrl: string = '/logo_square.svg'
): Promise<boolean> {
  const canvas = containerRef.current?.querySelector('canvas');
  if (!canvas) return false;

  // Create a new canvas with white background for JPG export
  const exportCanvas = document.createElement('canvas');
  const padding = 20;
  exportCanvas.width = canvas.width + padding * 2;
  exportCanvas.height = canvas.height + padding * 2;

  const ctx = exportCanvas.getContext('2d');
  if (!ctx) return false;

  // Fill with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

  // Draw the QR code centered with padding
  ctx.drawImage(canvas, padding, padding);

  // Draw the dark background for logo in the center
  const exportLogoSize = Math.floor(canvas.width * 0.2);
  const logoCenterX = padding + (canvas.width - exportLogoSize) / 2;
  const logoCenterY = padding + (canvas.height - exportLogoSize) / 2;

  // Draw dark background
  ctx.fillStyle = '#18181b'; // zinc-900
  ctx.fillRect(logoCenterX, logoCenterY, exportLogoSize, exportLogoSize);

  // Load and draw the logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject(new Error('Failed to load logo'));
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
    console.warn('Could not include logo in download:', error);
  }

  // Convert to JPG and download
  const dataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();

  return true;
}

/**
 * Utility function to get a printable QR code image data URL with logo.
 * Must be called with a ref to the QRCodeWithLogo container element.
 */
export async function getQRCodeDataUrl(
  containerRef: React.RefObject<HTMLDivElement | null>,
  logoUrl: string = '/logo_square.svg'
): Promise<string | null> {
  const canvas = containerRef.current?.querySelector('canvas');
  if (!canvas) return null;

  // Create a new canvas with logo for print
  const printCanvas = document.createElement('canvas');
  printCanvas.width = canvas.width;
  printCanvas.height = canvas.height;
  const ctx = printCanvas.getContext('2d');
  if (!ctx) return null;

  // Draw the QR code
  ctx.drawImage(canvas, 0, 0);

  // Draw the dark background for logo in the center
  const exportLogoSize = Math.floor(canvas.width * 0.2);
  const logoCenterX = (canvas.width - exportLogoSize) / 2;
  const logoCenterY = (canvas.height - exportLogoSize) / 2;

  ctx.fillStyle = '#18181b';
  ctx.fillRect(logoCenterX, logoCenterY, exportLogoSize, exportLogoSize);

  // Load and draw the logo
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => reject(new Error('Failed to load logo'));
      logoImg.src = logoUrl;
    });

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
    console.warn('Could not include logo in print:', error);
  }

  return printCanvas.toDataURL('image/png');
}

/**
 * Utility function to sanitize filename for download
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}
