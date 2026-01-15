/**
 * ================================================================================
 * PLEDGE REMINDER EMAIL TEMPLATE
 * ================================================================================
 *
 * Reminder email for upcoming or overdue pledge payments.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface PledgeReminderEmailProps {
  recipientName: string;
  pledgeName: string;
  totalPledged: string;
  amountPaid: string;
  amountRemaining: string;
  nextPaymentDate?: string;
  nextPaymentAmount?: string;
  isOverdue?: boolean;
  giveUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function PledgeReminderEmail({
  recipientName,
  pledgeName,
  totalPledged,
  amountPaid,
  amountRemaining,
  nextPaymentDate,
  nextPaymentAmount,
  isOverdue,
  giveUrl,
  tenantName,
  baseUrl,
}: PledgeReminderEmailProps) {
  const preview = isOverdue
    ? `Pledge reminder: Your ${pledgeName} payment is overdue`
    : `Pledge reminder: ${pledgeName} payment coming up`;

  const statusColor = isOverdue ? colors.danger : colors.warning;
  const statusBg = isOverdue ? colors.dangerBg : colors.warningBg;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Pledge Reminder
      </Heading>

      <Section style={{ ...styles.badge, backgroundColor: statusBg }}>
        <Text style={{ ...styles.badgeText, color: statusColor }}>
          {isOverdue ? 'Payment Overdue' : 'Payment Due Soon'}
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.pledgeName}>{pledgeName}</Text>

        <Section style={styles.progressSection}>
          <Text style={styles.progressLabel}>Progress</Text>
          <Text style={styles.progressAmount}>
            {amountPaid} of {totalPledged}
          </Text>
          <Text style={styles.remainingText}>
            {amountRemaining} remaining
          </Text>
        </Section>

        {(nextPaymentDate || nextPaymentAmount) && (
          <Section style={styles.nextPayment}>
            {nextPaymentDate && (
              <Text style={styles.detailRow}>
                <strong>Next Payment:</strong> {nextPaymentDate}
              </Text>
            )}
            {nextPaymentAmount && (
              <Text style={styles.detailRow}>
                <strong>Amount Due:</strong> {nextPaymentAmount}
              </Text>
            )}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          {isOverdue
            ? "We noticed your pledge payment is past due. We understand that circumstances change, and we're here to support you. If you need to adjust your pledge, please don't hesitate to reach out."
            : "This is a friendly reminder about your upcoming pledge payment. Your faithful giving helps us continue our mission and serve our community."}
        </Text>
      </Section>

      {giveUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={giveUrl}>
            {isOverdue ? 'Make Payment' : 'Give Now'}
          </EmailButton>
        </Section>
      )}

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Honor the Lord with your wealth, with the firstfruits of all your crops.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Proverbs 3:9</Text>
      </Section>

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Blessings,</Text>
        <Text style={styles.signature}>{tenantName || 'Your Church Family'}</Text>
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
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  badge: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
    padding: '6px 16px',
    borderRadius: '16px',
    display: 'inline-block' as const,
  },
  badgeText: {
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  pledgeName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  progressSection: {
    margin: '0 0 16px',
  },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  progressAmount: {
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  remainingText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  nextPayment: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  detailRow: {
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
    margin: 0,
    textAlign: 'center' as const,
  },
  buttonSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  scriptureSection: {
    backgroundColor: colors.primaryBg,
    borderRadius: '10px',
    padding: '24px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  scriptureText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: '0 0 8px',
  },
  scriptureRef: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
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

export default PledgeReminderEmail;
