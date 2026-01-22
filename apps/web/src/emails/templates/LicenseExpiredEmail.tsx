/**
 * ================================================================================
 * LICENSE EXPIRED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a license has expired.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface LicenseExpiredEmailProps {
  recipientName: string;
  licenseTier: string;
  expiredDate: string;
  gracePeriodDays?: number;
  renewalUrl?: string;
  supportEmail?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function LicenseExpiredEmail({
  recipientName,
  licenseTier,
  expiredDate,
  gracePeriodDays,
  renewalUrl,
  supportEmail,
  tenantName,
  baseUrl,
}: LicenseExpiredEmailProps) {
  const preview = `Your ${licenseTier} license has expired`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        License Expired
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Action Required</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.tierLabel}>Expired License</Text>
        <Text style={styles.tierName}>{licenseTier}</Text>

        <Section style={styles.detailsSection}>
          <Text style={styles.expiredText}>
            Expired on <strong>{expiredDate}</strong>
          </Text>
        </Section>

        {gracePeriodDays && gracePeriodDays > 0 && (
          <Section style={styles.graceSection}>
            <Text style={styles.graceText}>
              You have a {gracePeriodDays}-day grace period to renew without losing your data.
            </Text>
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Your license has expired and your access to premium features has been suspended.
          To restore full access and ensure your data remains secure, please renew your license
          as soon as possible.
        </Text>
      </Section>

      <Section style={styles.impactSection}>
        <Text style={styles.impactLabel}>What This Means</Text>
        <Text style={styles.impactItem}>&#8226; Premium features are now disabled</Text>
        <Text style={styles.impactItem}>&#8226; Read-only access to your data</Text>
        <Text style={styles.impactItem}>&#8226; Background jobs and automations paused</Text>
      </Section>

      {renewalUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={renewalUrl}>Renew License</EmailButton>
        </Section>
      )}

      {supportEmail && (
        <Section style={styles.supportSection}>
          <Text style={styles.supportText}>
            Need help? Contact us at{' '}
            <a href={`mailto:${supportEmail}`} style={styles.supportLink}>
              {supportEmail}
            </a>
          </Text>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>We're here to help,</Text>
        <Text style={styles.signature}>The StewardTrack Team</Text>
      </Section>
    </EmailLayout>
  );
}

const styles = {
  greeting: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '16px',
    margin: '0 0 20px',
  },
  heading: {
    color: colors.danger,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  badgeSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  badge: {
    backgroundColor: colors.dangerBg,
    borderRadius: '16px',
    color: colors.danger,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    padding: '6px 16px',
    margin: 0,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  tierLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  tierName: {
    color: colors.danger,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  detailsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  expiredText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  graceSection: {
    backgroundColor: colors.dangerBg,
    borderRadius: '8px',
    padding: '12px',
    marginTop: '16px',
  },
  graceText: {
    color: colors.danger,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    margin: 0,
  },
  messageSection: {
    margin: '0 0 24px',
  },
  messageText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: 0,
    textAlign: 'center' as const,
  },
  impactSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    margin: '0 0 24px',
    textAlign: 'left' as const,
  },
  impactLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  impactItem: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
  },
  buttonSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  supportSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  supportText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  supportLink: {
    color: colors.primary,
    textDecoration: 'none',
  },
  closingSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px',
    textAlign: 'center' as const,
  },
  closingText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 8px',
  },
  signature: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '16px',
    fontWeight: 600,
    margin: 0,
  },
} as const;

export default LicenseExpiredEmail;
