/**
 * ================================================================================
 * WELCOME EMAIL TEMPLATE
 * ================================================================================
 *
 * Welcome email sent to new users when they join a church/tenant.
 * Uses StewardTrack brand colors and fonts.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface WelcomeEmailProps {
  /** New user's first name */
  recipientName: string;
  /** Church/tenant name */
  tenantName: string;
  /** Tenant logo URL */
  tenantLogoUrl?: string;
  /** Login/dashboard URL */
  loginUrl: string;
  /** Optional custom welcome message */
  customMessage?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a', // green-600
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#4b5563', // gray-600
  textMuted: '#6b7280', // gray-500
  success: '#16a34a', // green-600
  successBg: '#dcfce7', // green-100
};

export function WelcomeEmail({
  recipientName,
  tenantName,
  tenantLogoUrl,
  loginUrl,
  customMessage,
  baseUrl,
}: WelcomeEmailProps) {
  const preview = `Welcome to ${tenantName}!`;

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      tenantLogoUrl={tenantLogoUrl}
      baseUrl={baseUrl}
    >
      {/* Welcome Badge */}
      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Welcome!</Text>
      </Section>

      {/* Greeting */}
      <Heading as="h1" style={styles.heading}>
        Hi {recipientName}, welcome to {tenantName}!
      </Heading>

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          We&apos;re excited to have you as part of our church community. Your
          account has been successfully created and you can now access all the
          features available to you.
        </Text>

        {customMessage && (
          <Text style={styles.customMessage}>{customMessage}</Text>
        )}

        <Text style={styles.bodyText}>Here&apos;s what you can do:</Text>
      </Section>

      {/* Features List */}
      <Section style={styles.featuresSection}>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> View upcoming events and
          register
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Connect with other members
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Manage your giving and
          donations
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Stay updated with church
          announcements
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={loginUrl}>Get Started</EmailButton>
      </Section>

      {/* Help Text */}
      <Section style={styles.helpSection}>
        <Text style={styles.helpText}>
          Need help getting started? Contact your church administrator or reply
          to this email for assistance.
        </Text>
      </Section>
    </EmailLayout>
  );
}

const styles = {
  badgeSection: {
    marginBottom: '16px',
  },
  badge: {
    backgroundColor: colors.successBg,
    borderRadius: '16px',
    color: colors.success,
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
  customMessage: {
    backgroundColor: '#f3f4f6',
    borderLeft: `4px solid ${colors.primary}`,
    borderRadius: '4px',
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: '16px 0',
    padding: '14px 18px',
  },
  featuresSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '24px',
  },
  featureItem: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '0 0 10px',
  },
  checkmark: {
    color: colors.success,
    fontWeight: 700,
    marginRight: '10px',
  },
  buttonSection: {
    margin: '0 0 28px',
    textAlign: 'center' as const,
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
    margin: 0,
    textAlign: 'center' as const,
  },
} as const;

export default WelcomeEmail;
