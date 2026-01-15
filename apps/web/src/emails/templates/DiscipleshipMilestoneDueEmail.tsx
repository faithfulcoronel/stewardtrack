/**
 * ================================================================================
 * DISCIPLESHIP MILESTONE DUE EMAIL TEMPLATE
 * ================================================================================
 *
 * Reminder email when a discipleship milestone is due.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DiscipleshipMilestoneDueEmailProps {
  recipientName: string;
  memberName: string;
  milestoneName: string;
  pathwayName: string;
  dueDate: string;
  isOverdue?: boolean;
  planUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  discipleship: '#8b5cf6',
  discipleshipBg: '#f3e8ff',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DiscipleshipMilestoneDueEmail({
  recipientName,
  memberName,
  milestoneName,
  pathwayName,
  dueDate,
  isOverdue,
  planUrl,
  tenantName,
  baseUrl,
}: DiscipleshipMilestoneDueEmailProps) {
  const preview = isOverdue
    ? `Overdue: ${milestoneName} milestone for ${memberName}`
    : `Upcoming: ${milestoneName} milestone for ${memberName}`;

  const statusColor = isOverdue ? colors.danger : colors.warning;
  const statusBg = isOverdue ? colors.dangerBg : colors.warningBg;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Milestone {isOverdue ? 'Overdue' : 'Due Soon'}
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={{ ...styles.badge, backgroundColor: statusBg, color: statusColor }}>
          {isOverdue ? 'Overdue' : 'Due Soon'}
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.milestoneLabel}>Milestone</Text>
        <Text style={styles.milestoneName}>{milestoneName}</Text>

        <Section style={styles.detailsSection}>
          <Text style={styles.detailRow}>
            <strong>Member:</strong> {memberName}
          </Text>
          <Text style={styles.detailRow}>
            <strong>Pathway:</strong> {pathwayName}
          </Text>
          <Text style={{ ...styles.detailRow, color: statusColor, fontWeight: 600 }}>
            <strong>Due:</strong> {dueDate}
          </Text>
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          {isOverdue
            ? "This milestone is past its due date. Please connect with the member to discuss progress and provide support."
            : "This milestone is coming up soon. Please prepare to help the member complete this step in their discipleship journey."}
        </Text>
      </Section>

      {planUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={planUrl}>View Plan Details</EmailButton>
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
    borderRadius: '16px',
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
  milestoneLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  milestoneName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  detailsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    textAlign: 'left' as const,
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

export default DiscipleshipMilestoneDueEmail;
