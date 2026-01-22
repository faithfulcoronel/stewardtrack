/**
 * ================================================================================
 * EMAIL BUTTON COMPONENT
 * ================================================================================
 *
 * Reusable CTA button for email templates.
 * Uses StewardTrack brand colors (green).
 *
 * ================================================================================
 */

import { Button } from '@react-email/components';
import * as React from 'react';

interface EmailButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
}

const colors = {
  primary: '#16a34a', // green-600
  primaryDark: '#15803d', // green-700
  secondary: '#4b5563', // gray-600
  secondaryDark: '#374151', // gray-700
  white: '#ffffff',
};

export function EmailButton({
  href,
  children,
  variant = 'primary',
}: EmailButtonProps) {
  const buttonStyles = {
    primary: {
      backgroundColor: colors.primary,
      borderRadius: '8px',
      color: colors.white,
      display: 'inline-block' as const,
      fontFamily: "'Urbanist', Arial, sans-serif",
      fontSize: '15px',
      fontWeight: 600,
      padding: '14px 28px',
      textAlign: 'center' as const,
      textDecoration: 'none',
    },
    secondary: {
      backgroundColor: colors.secondary,
      borderRadius: '8px',
      color: colors.white,
      display: 'inline-block' as const,
      fontFamily: "'Urbanist', Arial, sans-serif",
      fontSize: '15px',
      fontWeight: 600,
      padding: '14px 28px',
      textAlign: 'center' as const,
      textDecoration: 'none',
    },
    outline: {
      backgroundColor: 'transparent',
      border: `2px solid ${colors.primary}`,
      borderRadius: '8px',
      color: colors.primary,
      display: 'inline-block' as const,
      fontFamily: "'Urbanist', Arial, sans-serif",
      fontSize: '15px',
      fontWeight: 600,
      padding: '12px 26px',
      textAlign: 'center' as const,
      textDecoration: 'none',
    },
  };

  return (
    <Button href={href} style={buttonStyles[variant]}>
      {children}
    </Button>
  );
}

export default EmailButton;
