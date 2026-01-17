/**
 * ================================================================================
 * TENANT SUBSCRIPTION WELCOME EMAIL TEMPLATE
 * ================================================================================
 *
 * Welcome email sent to new tenants when they subscribe/create an account.
 * Welcomes them to StewardTrack and highlights key features.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface TenantSubscriptionWelcomeEmailProps {
  /** Admin's first name */
  adminName: string;
  /** Church/tenant name */
  tenantName: string;
  /** Subscription tier (Essential, Professional, etc.) */
  subscriptionTier: string;
  /** Whether this is a trial subscription */
  isTrial?: boolean;
  /** Trial days remaining (if trial) */
  trialDays?: number;
  /** Login/dashboard URL */
  dashboardUrl: string;
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
  infoBg: '#dbeafe', // blue-100
  infoText: '#1e40af', // blue-800
};

export function TenantSubscriptionWelcomeEmail({
  adminName,
  tenantName,
  subscriptionTier,
  isTrial = false,
  trialDays,
  dashboardUrl,
  baseUrl,
}: TenantSubscriptionWelcomeEmailProps) {
  const preview = `Welcome to StewardTrack, ${tenantName}!`;

  return (
    <EmailLayout
      preview={preview}
      tenantName="StewardTrack"
      baseUrl={baseUrl}
    >
      {/* Welcome Badge */}
      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Welcome to StewardTrack!</Text>
      </Section>

      {/* Greeting */}
      <Heading as="h1" style={styles.heading}>
        Hi {adminName}, your church is all set up!
      </Heading>

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          Thank you for choosing StewardTrack for <strong>{tenantName}</strong>.
          We&apos;re thrilled to have you join our community of churches streamlining
          their ministry operations.
        </Text>

        {/* Subscription Info Box */}
        <Section style={styles.subscriptionBox}>
          <Text style={styles.subscriptionLabel}>Your Subscription</Text>
          <Text style={styles.subscriptionTier}>
            {subscriptionTier} {isTrial ? 'Trial' : 'Plan'}
          </Text>
          {isTrial && trialDays && (
            <Text style={styles.trialNote}>
              You have {trialDays} days to explore all features
            </Text>
          )}
        </Section>

        <Text style={styles.bodyText}>
          Your account is ready to go! Here&apos;s what you can start doing right away:
        </Text>
      </Section>

      {/* Features List */}
      <Section style={styles.featuresSection}>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Manage your church members and families
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Track donations and generate giving reports
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Schedule events and manage attendance
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Set up ministries and volunteer teams
        </Text>
        <Text style={styles.featureItem}>
          <span style={styles.checkmark}>&#10003;</span> Send communications to your congregation
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={dashboardUrl}>Go to Dashboard</EmailButton>
      </Section>

      {/* Getting Started Tips */}
      <Section style={styles.tipsSection}>
        <Text style={styles.tipsHeading}>Getting Started Tips</Text>
        <Text style={styles.tipItem}>
          <strong>1. Complete your profile</strong> - Add your church logo and details
        </Text>
        <Text style={styles.tipItem}>
          <strong>2. Invite your team</strong> - Add staff and volunteers to help manage
        </Text>
        <Text style={styles.tipItem}>
          <strong>3. Import members</strong> - Bring your existing member data into StewardTrack
        </Text>
      </Section>

      {/* Help Text */}
      <Section style={styles.helpSection}>
        <Text style={styles.helpText}>
          Have questions? Our support team is here to help. Simply reply to this email
          or visit our help center for tutorials and guides.
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
  subscriptionBox: {
    backgroundColor: colors.infoBg,
    borderRadius: '10px',
    margin: '20px 0',
    padding: '20px',
    textAlign: 'center' as const,
  },
  subscriptionLabel: {
    color: colors.infoText,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
  },
  subscriptionTier: {
    color: colors.infoText,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  trialNote: {
    color: colors.infoText,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: 0,
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
  tipsSection: {
    backgroundColor: '#fef3c7', // amber-100
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '20px',
  },
  tipsHeading: {
    color: '#92400e', // amber-800
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 700,
    margin: '0 0 12px',
  },
  tipItem: {
    color: '#78350f', // amber-900
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0 0 8px',
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

export default TenantSubscriptionWelcomeEmail;
