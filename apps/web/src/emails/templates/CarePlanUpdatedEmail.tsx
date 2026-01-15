/**
 * ================================================================================
 * CARE PLAN UPDATED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a care plan has been updated.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface CarePlanUpdatedEmailProps {
  recipientName: string;
  memberName: string;
  updateSummary?: string;
  newStatus?: string;
  updatedBy?: string;
  carePlanUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  care: '#ec4899',
  careBg: '#fce7f3',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function CarePlanUpdatedEmail({
  recipientName,
  memberName,
  updateSummary,
  newStatus,
  updatedBy,
  carePlanUrl,
  tenantName,
  baseUrl,
}: CarePlanUpdatedEmailProps) {
  const preview = `Care plan updated for ${memberName}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Care Plan Updated
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Update Notice</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.memberLabel}>Care Recipient</Text>
        <Text style={styles.memberName}>{memberName}</Text>

        {newStatus && (
          <Section style={styles.statusSection}>
            <Text style={styles.statusLabel}>New Status</Text>
            <Text style={styles.statusValue}>{newStatus}</Text>
          </Section>
        )}

        {updateSummary && (
          <Section style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Update Summary</Text>
            <Text style={styles.summaryText}>{updateSummary}</Text>
          </Section>
        )}

        {updatedBy && (
          <Text style={styles.updatedBy}>Updated by {updatedBy}</Text>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Please review the updated care plan to ensure you're aware of any changes to the care approach or schedule.
        </Text>
      </Section>

      {carePlanUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={carePlanUrl}>View Care Plan</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Thank you for your care ministry,</Text>
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
    color: colors.care,
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
    backgroundColor: colors.careBg,
    borderRadius: '16px',
    color: colors.care,
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
  memberLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  memberName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  statusSection: {
    margin: '0 0 16px',
  },
  statusLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  statusValue: {
    backgroundColor: colors.primaryBg,
    borderRadius: '8px',
    color: colors.primary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    padding: '6px 12px',
    margin: 0,
  },
  summarySection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    textAlign: 'left' as const,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  summaryText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
  },
  updatedBy: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '16px 0 0',
    fontStyle: 'italic' as const,
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

export default CarePlanUpdatedEmail;
