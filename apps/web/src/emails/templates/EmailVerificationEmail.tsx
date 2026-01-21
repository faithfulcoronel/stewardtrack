/**
 * ================================================================================
 * EMAIL VERIFICATION EMAIL TEMPLATE
 * ================================================================================
 *
 * Email sent when a new user registers to verify their email address.
 * Uses StewardTrack brand colors and fonts.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface EmailVerificationEmailProps {
  /** User's first name */
  recipientName: string;
  /** Email verification URL with token */
  verificationUrl: string;
  /** Church name being registered */
  churchName: string;
  /** Expiry time (e.g., "24 hours") */
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
  info: '#2563eb', // blue-600
  infoBg: '#dbeafe', // blue-100
  warning: '#d97706', // amber-600
  warningBg: '#fef3c7', // amber-100
};

export function EmailVerificationEmail({
  recipientName,
  verificationUrl,
  churchName,
  expiresIn = '24 hours',
  baseUrl,
}: EmailVerificationEmailProps) {
  const preview = `Verify your email to complete ${churchName} registration`;

  return (
    <EmailLayout
      preview={preview}
      tenantName="StewardTrack"
      baseUrl={baseUrl}
    >
      {/* Verification Badge */}
      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Email Verification</Text>
      </Section>

      {/* Greeting */}
      <Heading as="h1" style={styles.heading}>
        Welcome, {recipientName}!
      </Heading>

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          Thank you for registering <strong>{churchName}</strong> with StewardTrack.
          To complete your registration and set up your church management system,
          please verify your email address by clicking the button below.
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={verificationUrl}>Verify Email Address</EmailButton>
      </Section>

      {/* Expiry Notice */}
      <Section style={styles.expirySection}>
        <Text style={styles.expiryText}>
          &#9200; This link will expire in {expiresIn}
        </Text>
      </Section>

      {/* What's Next Section */}
      <Section style={styles.infoSection}>
        <Text style={styles.infoTitle}>
          &#128161; What happens next?
        </Text>
        <Text style={styles.infoText}>
          After verifying your email, we'll automatically set up your church's
          StewardTrack account. This includes creating your dashboard, setting up
          your admin account, and preparing your church management tools.
        </Text>
      </Section>

      {/* Security Notice */}
      <Section style={styles.securitySection}>
        <Text style={styles.securityTitle}>
          &#128274; Security Notice
        </Text>
        <Text style={styles.securityText}>
          If you did not create an account with StewardTrack, please ignore this
          email. No account will be created without email verification.
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
        <Text style={styles.urlText}>{verificationUrl}</Text>
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
  infoSection: {
    backgroundColor: colors.infoBg,
    borderRadius: '10px',
    margin: '0 0 24px',
    padding: '20px',
  },
  infoTitle: {
    color: colors.info,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 700,
    margin: '0 0 10px',
  },
  infoText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.6',
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

export default EmailVerificationEmail;
