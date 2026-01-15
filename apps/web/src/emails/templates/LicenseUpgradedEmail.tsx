/**
 * ================================================================================
 * LICENSE UPGRADED EMAIL TEMPLATE
 * ================================================================================
 *
 * Congratulations notification when a license is upgraded.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface LicenseUpgradedEmailProps {
  recipientName: string;
  previousTier: string;
  newTier: string;
  effectiveDate: string;
  newFeatures?: string[];
  dashboardUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  upgrade: '#8b5cf6',
  upgradeBg: '#f3e8ff',
  gold: '#f59e0b',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function LicenseUpgradedEmail({
  recipientName,
  previousTier,
  newTier,
  effectiveDate,
  newFeatures,
  dashboardUrl,
  tenantName,
  baseUrl,
}: LicenseUpgradedEmailProps) {
  const preview = `Congratulations! You've upgraded to ${newTier}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Welcome to {newTier}!
      </Heading>

      <Section style={styles.celebrationRow}>
        <Text style={styles.celebrationEmoji}>&#127881; &#11088; &#127881;</Text>
      </Section>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Upgrade Complete</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.upgradeLabel}>Your Upgrade</Text>
        <Section style={styles.tierChange}>
          <Text style={styles.previousTier}>{previousTier}</Text>
          <Text style={styles.arrow}>&#8594;</Text>
          <Text style={styles.newTier}>{newTier}</Text>
        </Section>

        <Section style={styles.detailsSection}>
          <Text style={styles.effectiveText}>
            Effective from <strong>{effectiveDate}</strong>
          </Text>
        </Section>

        {newFeatures && newFeatures.length > 0 && (
          <Section style={styles.featuresSection}>
            <Text style={styles.featuresLabel}>New Features Unlocked</Text>
            {newFeatures.map((feature, index) => (
              <Text key={index} style={styles.featureItem}>
                &#10003; {feature}
              </Text>
            ))}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Thank you for upgrading! Your new features are now active and ready to use.
          We're excited to help you make the most of your enhanced capabilities.
        </Text>
      </Section>

      {dashboardUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={dashboardUrl}>Explore New Features</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Thank you for your trust,</Text>
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
    color: colors.upgrade,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  celebrationRow: {
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  celebrationEmoji: {
    fontSize: '28px',
    margin: 0,
  },
  badgeSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  badge: {
    backgroundColor: colors.upgradeBg,
    borderRadius: '16px',
    color: colors.upgrade,
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
  upgradeLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 16px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  tierChange: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    margin: '0 0 20px',
  },
  previousTier: {
    color: colors.textSecondary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '18px',
    fontWeight: 500,
    margin: 0,
  },
  arrow: {
    color: colors.gold,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '20px',
    margin: '0 12px',
  },
  newTier: {
    color: colors.upgrade,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  },
  detailsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  effectiveText: {
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
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
    fontWeight: 500,
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

export default LicenseUpgradedEmail;
