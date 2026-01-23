/**
 * ================================================================================
 * SUBSCRIPTION GRACE PERIOD EMAIL TEMPLATE
 * ================================================================================
 *
 * Warning notification when a tenant's subscription payment is overdue and they
 * are in the grace period before access is restricted.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface SubscriptionGracePeriodEmailProps {
  recipientName: string;
  tenantName: string;
  subscriptionTier: string;
  daysRemaining: number;
  gracePeriodEndDate: string;
  paymentUrl?: string;
  supportEmail?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function SubscriptionGracePeriodEmail({
  recipientName,
  tenantName,
  subscriptionTier,
  daysRemaining,
  gracePeriodEndDate,
  paymentUrl,
  supportEmail = 'stewardtrack@gmail.com',
  baseUrl,
}: SubscriptionGracePeriodEmailProps) {
  const isUrgent = daysRemaining <= 2;
  const preview = `Action Required: ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until access is restricted`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={isUrgent ? styles.headingDanger : styles.headingWarning}>
        Payment Overdue - Grace Period Active
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={isUrgent ? styles.badgeDanger : styles.badgeWarning}>
          {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''} Remaining
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.tierLabel}>Your Subscription</Text>
        <Text style={isUrgent ? styles.tierNameDanger : styles.tierNameWarning}>
          {subscriptionTier}
        </Text>

        <Section style={styles.detailsSection}>
          <Text style={styles.detailText}>
            <strong>Organization:</strong> {tenantName}
          </Text>
          <Text style={styles.detailText}>
            <strong>Access Restricted On:</strong> {gracePeriodEndDate}
          </Text>
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Your subscription payment is overdue. You are currently in a grace period,
          and your access to StewardTrack will continue until{' '}
          <strong>{gracePeriodEndDate}</strong>.
        </Text>

        <Text style={styles.messageTextSecondary}>
          After this date, Your subscription will be downgraded to free tier with restrictions to premium features. All your data will remain
          safe and accessible once payment is completed.
        </Text>
      </Section>

      {isUrgent && (
        <Section style={styles.urgentNotice}>
          <Text style={styles.urgentText}>
            ⚠️ Urgent: Your subscription will be downgraded to free tier with restrictions to premium features in {daysRemaining} day
            {daysRemaining !== 1 ? 's' : ''}. Please complete your payment immediately
            to avoid service interruption.
          </Text>
        </Section>
      )}

      {paymentUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={paymentUrl}>Complete Payment Now</EmailButton>
        </Section>
      )}

      <Section style={styles.helpSection}>
        <Text style={styles.helpText}>
          If you believe this is an error or need assistance with your payment, please
          contact us at{' '}
          <a href={`mailto:${supportEmail}`} style={styles.link}>
            {supportEmail}
          </a>
          .
        </Text>
      </Section>

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>
          Thank you for being a valued StewardTrack customer,
        </Text>
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
  headingWarning: {
    color: colors.warning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  headingDanger: {
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
  badgeWarning: {
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
  badgeDanger: {
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
  tierNameWarning: {
    color: colors.warning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  tierNameDanger: {
    color: colors.danger,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  detailsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    textAlign: 'left' as const,
  },
  detailText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 8px',
  },
  messageSection: {
    margin: '0 0 24px',
  },
  messageText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 12px',
    textAlign: 'center' as const,
  },
  messageTextSecondary: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
    textAlign: 'center' as const,
  },
  urgentNotice: {
    backgroundColor: colors.dangerBg,
    borderRadius: '8px',
    borderLeft: `4px solid ${colors.danger}`,
    padding: '16px',
    margin: '0 0 24px',
  },
  urgentText: {
    color: colors.danger,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '1.5',
    margin: 0,
  },
  buttonSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  helpSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    margin: '0 0 24px',
  },
  helpText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
    textAlign: 'center' as const,
  },
  link: {
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

export default SubscriptionGracePeriodEmail;
