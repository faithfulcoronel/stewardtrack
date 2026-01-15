/**
 * ================================================================================
 * DONATION RECEIVED EMAIL TEMPLATE
 * ================================================================================
 *
 * Thank you email sent when a donation is received.
 * Includes donation details and tax-deductible acknowledgment.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DonationReceivedEmailProps {
  recipientName: string;
  amount: string;
  donationDate: string;
  fundName?: string;
  transactionId?: string;
  isRecurring?: boolean;
  receiptUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DonationReceivedEmail({
  recipientName,
  amount,
  donationDate,
  fundName,
  transactionId,
  isRecurring,
  receiptUrl,
  tenantName,
  baseUrl,
}: DonationReceivedEmailProps) {
  const preview = `Thank you for your generous gift of ${amount}!`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Thank You for Your Generosity!
      </Heading>

      <Section style={styles.badge}>
        <Text style={styles.badgeText}>Donation Received</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.amountLabel}>Amount</Text>
        <Text style={styles.amount}>{amount}</Text>

        <Section style={styles.details}>
          <Text style={styles.detailRow}>
            <strong>Date:</strong> {donationDate}
          </Text>
          {fundName && (
            <Text style={styles.detailRow}>
              <strong>Fund:</strong> {fundName}
            </Text>
          )}
          {transactionId && (
            <Text style={styles.detailRow}>
              <strong>Transaction ID:</strong> {transactionId}
            </Text>
          )}
          {isRecurring && (
            <Text style={styles.recurringBadge}>Recurring Gift</Text>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Your generous contribution helps us continue our mission and serve our community.
          We are deeply grateful for your faithful support.
        </Text>
      </Section>

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Each of you should give what you have decided in your heart to give,
          not reluctantly or under compulsion, for God loves a cheerful giver.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— 2 Corinthians 9:7</Text>
      </Section>

      {receiptUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={receiptUrl}>View Receipt</EmailButton>
        </Section>
      )}

      <Section style={styles.taxNote}>
        <Text style={styles.taxNoteText}>
          This letter serves as your official receipt for tax purposes.
          No goods or services were provided in exchange for this contribution.
        </Text>
      </Section>

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>With heartfelt thanks,</Text>
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
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  badge: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  badgeText: {
    backgroundColor: colors.primaryBg,
    borderRadius: '16px',
    color: colors.primary,
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
  amountLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  amount: {
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '36px',
    fontWeight: 700,
    margin: '0 0 16px',
  },
  details: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  detailRow: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 8px',
  },
  recurringBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: '8px',
    color: '#1d4ed8',
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 12px',
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
  buttonSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  taxNote: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '16px',
    margin: '0 0 24px',
  },
  taxNoteText: {
    color: '#92400e',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    lineHeight: '1.5',
    margin: 0,
    textAlign: 'center' as const,
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

export default DonationReceivedEmail;
