/**
 * ================================================================================
 * LICENSE EXPIRING EMAIL TEMPLATE
 * ================================================================================
 *
 * Warning notification when a license is about to expire.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface LicenseExpiringEmailProps {
  recipientName: string;
  licenseTier: string;
  expirationDate: string;
  daysRemaining: number;
  renewalUrl?: string;
  features?: string[];
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function LicenseExpiringEmail({
  recipientName,
  licenseTier,
  expirationDate,
  daysRemaining,
  renewalUrl,
  features,
  tenantName,
  baseUrl,
}: LicenseExpiringEmailProps) {
  const preview = `Your ${licenseTier} license expires in ${daysRemaining} days`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        License Expiring Soon
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>
          {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''} Remaining
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.tierLabel}>Your License</Text>
        <Text style={styles.tierName}>{licenseTier}</Text>

        <Section style={styles.detailsSection}>
          <Text style={styles.expirationText}>
            Expires on <strong>{expirationDate}</strong>
          </Text>
        </Section>

        {features && features.length > 0 && (
          <Section style={styles.featuresSection}>
            <Text style={styles.featuresLabel}>Features You'll Lose</Text>
            {features.slice(0, 5).map((feature, index) => (
              <Text key={index} style={styles.featureItem}>
                &#8226; {feature}
              </Text>
            ))}
            {features.length > 5 && (
              <Text style={styles.moreFeatures}>
                + {features.length - 5} more features
              </Text>
            )}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Don't let your access lapse! Renew your license before the expiration date
          to maintain uninterrupted access to all your features and data.
        </Text>
      </Section>

      {renewalUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={renewalUrl}>Renew Now</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Thank you for choosing StewardTrack,</Text>
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
    color: colors.warning,
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
    backgroundColor: colors.warningBg,
    borderRadius: '16px',
    color: colors.warning,
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
    color: colors.warning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  detailsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  expirationText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  featuresSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  featuresLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  featureItem: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
  },
  moreFeatures: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontStyle: 'italic' as const,
    margin: '8px 0 0',
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
  buttonSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
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

export default LicenseExpiringEmail;
