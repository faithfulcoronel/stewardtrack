/**
 * ================================================================================
 * DISCIPLESHIP PLAN UPDATED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a discipleship plan has been updated.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DiscipleshipPlanUpdatedEmailProps {
  recipientName: string;
  memberName: string;
  pathwayName: string;
  updateSummary?: string;
  updatedBy?: string;
  planUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  discipleship: '#8b5cf6',
  discipleshipBg: '#f3e8ff',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DiscipleshipPlanUpdatedEmail({
  recipientName,
  memberName,
  pathwayName,
  updateSummary,
  updatedBy,
  planUrl,
  tenantName,
  baseUrl,
}: DiscipleshipPlanUpdatedEmailProps) {
  const preview = `Discipleship plan updated for ${memberName}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Discipleship Plan Updated
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Plan Update</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.memberName}>{memberName}</Text>
        <Text style={styles.pathwayName}>{pathwayName}</Text>

        {updateSummary && (
          <Section style={styles.summarySection}>
            <Text style={styles.summaryLabel}>What Changed</Text>
            <Text style={styles.summaryText}>{updateSummary}</Text>
          </Section>
        )}

        {updatedBy && (
          <Text style={styles.updatedBy}>Updated by {updatedBy}</Text>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Please review the updated plan to stay informed about the discipleship journey progress.
        </Text>
      </Section>

      {planUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={planUrl}>View Plan</EmailButton>
        </Section>
      )}

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
    color: colors.discipleship,
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
    backgroundColor: colors.discipleshipBg,
    borderRadius: '16px',
    color: colors.discipleship,
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
  memberName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  pathwayName: {
    color: colors.discipleship,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 20px',
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

export default DiscipleshipPlanUpdatedEmail;
