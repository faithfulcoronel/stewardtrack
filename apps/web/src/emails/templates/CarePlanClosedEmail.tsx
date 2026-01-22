/**
 * ================================================================================
 * CARE PLAN CLOSED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a care plan has been completed/closed.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface CarePlanClosedEmailProps {
  recipientName: string;
  memberName: string;
  closureReason?: string;
  summary?: string;
  closedBy?: string;
  dashboardUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function CarePlanClosedEmail({
  recipientName,
  memberName,
  closureReason,
  summary,
  closedBy,
  dashboardUrl,
  tenantName,
  baseUrl,
}: CarePlanClosedEmailProps) {
  const preview = `Care plan completed for ${memberName}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Care Plan Completed
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>&#10003; Closed</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.memberLabel}>Care Recipient</Text>
        <Text style={styles.memberName}>{memberName}</Text>

        {closureReason && (
          <Section style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Closure Reason</Text>
            <Text style={styles.reasonText}>{closureReason}</Text>
          </Section>
        )}

        {summary && (
          <Section style={styles.summarySection}>
            <Text style={styles.summaryLabel}>Care Summary</Text>
            <Text style={styles.summaryText}>{summary}</Text>
          </Section>
        )}

        {closedBy && (
          <Text style={styles.closedBy}>Closed by {closedBy}</Text>
        )}
      </Section>

      <Section style={styles.thankYouSection}>
        <Text style={styles.thankYouText}>
          Thank you for your dedicated care and compassion. Your ministry has made a meaningful
          difference in {memberName}'s life. May God bless you for your faithful service.
        </Text>
      </Section>

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Carry each other's burdens, and in this way you will fulfill the law of Christ.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Galatians 6:2</Text>
      </Section>

      {dashboardUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={dashboardUrl}>View Care Dashboard</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>With gratitude,</Text>
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
  badgeSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  badge: {
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
  reasonSection: {
    margin: '0 0 16px',
  },
  reasonLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  reasonText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
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
  closedBy: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '16px 0 0',
    fontStyle: 'italic' as const,
  },
  thankYouSection: {
    margin: '0 0 24px',
  },
  thankYouText: {
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

export default CarePlanClosedEmail;
