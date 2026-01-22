/**
 * ================================================================================
 * PASSWORD RESET EMAIL TEMPLATE
 * ================================================================================
 *
 * Email sent when a user requests a password reset.
 * Uses StewardTrack brand colors and fonts.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface PasswordResetEmailProps {
  /** User's first name (if known) */
  recipientName?: string;
  /** Password reset URL with token */
  resetUrl: string;
  /** Expiry time (e.g., "1 hour") */
  expiresIn?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a', // green-600
  primaryBg: '#dcfce7', // green-100
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#4b5563', // gray-600
  textMuted: '#6b7280', // gray-500
  warning: '#d97706', // amber-600
  warningBg: '#fef3c7', // amber-100
};

export function PasswordResetEmail({
  recipientName,
  resetUrl,
  expiresIn = '1 hour',
  baseUrl,
}: PasswordResetEmailProps) {
  const preview = 'Reset your StewardTrack password';

  return (
    <EmailLayout
      preview={preview}
      tenantName="StewardTrack"
      baseUrl={baseUrl}
    >
      {/* Reset Badge */}
      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Password Reset</Text>
      </Section>

      {/* Greeting */}
      <Heading as="h1" style={styles.heading}>
        {recipientName ? `Hi ${recipientName},` : 'Hello,'}
      </Heading>

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          We received a request to reset the password for your StewardTrack
          account. Click the button below to create a new password.
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={resetUrl}>Reset Password</EmailButton>
      </Section>

      {/* Expiry Notice */}
      <Section style={styles.expirySection}>
        <Text style={styles.expiryText}>
          &#9200; This link will expire in {expiresIn}
        </Text>
      </Section>

      {/* Security Notice */}
      <Section style={styles.securitySection}>
        <Text style={styles.securityTitle}>
          &#128274; Security Notice
        </Text>
        <Text style={styles.securityText}>
          If you did not request a password reset, please ignore this email.
          Your password will remain unchanged and your account is secure.
        </Text>
      </Section>

      {/* Help Text */}
      <Section style={styles.helpSection}>
        <Text style={styles.helpText}>
          Having trouble? Contact support at{' '}
          <a href="mailto:support@cortanatechsolutions.com" style={styles.supportLink}>
            support@cortanatechsolutions.com
          </a>
        </Text>
        <Text style={styles.linkText}>
          Button not working? Copy and paste this link into your browser:
        </Text>
        <Text style={styles.urlText}>{resetUrl}</Text>
      </Section>
    </EmailLayout>
  );
}

const styles = {
  badgeSection: {
    marginBottom: '16px',
  },
  badge: {
    backgroundColor: colors.primaryBg,
    borderRadius: '16px',
    color: colors.primary,
    display: 'inline-block' as const,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '6px 14px',
    textTransform: 'uppercase' as const,
  },
  heading: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: '1.3',
    margin: '0 0 24px',
  },
  bodySection: {
    margin: '0 0 24px',
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 14px',
  },
  buttonSection: {
    margin: '0 0 28px',
    textAlign: 'center' as const,
  },
  expirySection: {
    backgroundColor: colors.warningBg,
    borderRadius: '8px',
    margin: '0 0 24px',
    padding: '14px 18px',
    textAlign: 'center' as const,
  },
  expiryText: {
    color: colors.warning,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    margin: 0,
  },
  securitySection: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '20px',
  },
  securityTitle: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 700,
    margin: '0 0 10px',
  },
  securityText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.6',
    margin: 0,
  },
  helpSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px',
  },
  helpText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 14px',
    textAlign: 'center' as const,
  },
  supportLink: {
    color: colors.primary,
    textDecoration: 'none',
  },
  linkText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  urlText: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '11px',
    margin: 0,
    textAlign: 'center' as const,
    wordBreak: 'break-all' as const,
  },
} as const;

export default PasswordResetEmail;
