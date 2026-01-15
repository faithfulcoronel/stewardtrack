/**
 * ================================================================================
 * GOAL STATUS CHANGED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a goal's status changes.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface GoalStatusChangedEmailProps {
  recipientName: string;
  goalTitle: string;
  previousStatus: string;
  newStatus: string;
  changedBy?: string;
  progressPercent?: number;
  goalUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  goals: '#0891b2',
  goalsBg: '#ecfeff',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

// Helper function to get status-specific colors
function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  if (statusLower.includes('complete') || statusLower.includes('achieved')) {
    return colors.primary;
  }
  if (statusLower.includes('risk') || statusLower.includes('blocked')) {
    return '#dc2626';
  }
  if (statusLower.includes('progress')) {
    return colors.goals;
  }
  return colors.warning;
}

export function GoalStatusChangedEmail({
  recipientName,
  goalTitle,
  previousStatus,
  newStatus,
  changedBy,
  progressPercent,
  goalUrl,
  tenantName,
  baseUrl,
}: GoalStatusChangedEmailProps) {
  const preview = `Goal status updated: ${goalTitle} - ${newStatus}`;
  const statusColor = getStatusColor(newStatus);

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Goal Status Updated
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Status Change</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.goalLabel}>Goal</Text>
        <Text style={styles.goalTitle}>{goalTitle}</Text>

        <Section style={styles.statusChange}>
          <Text style={styles.previousStatus}>{previousStatus}</Text>
          <Text style={styles.arrow}>&#8594;</Text>
          <Text style={{ ...styles.newStatus, color: statusColor }}>{newStatus}</Text>
        </Section>

        {progressPercent !== undefined && (
          <Section style={styles.progressSection}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Section style={styles.progressBar}>
              <Section
                style={{
                  ...styles.progressFill,
                  width: `${Math.min(progressPercent, 100)}%`,
                }}
              />
            </Section>
            <Text style={styles.progressText}>{progressPercent}% Complete</Text>
          </Section>
        )}

        {changedBy && (
          <Text style={styles.changedBy}>Updated by {changedBy}</Text>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          The status of your goal has been updated. Review the current progress
          and continue working toward achieving your objectives.
        </Text>
      </Section>

      {goalUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={goalUrl}>View Goal</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Keep pressing forward,</Text>
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
    color: colors.goals,
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
    backgroundColor: colors.goalsBg,
    borderRadius: '16px',
    color: colors.goals,
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
  goalLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  goalTitle: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  statusChange: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  previousStatus: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  arrow: {
    color: colors.goals,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '18px',
    margin: '0 12px',
  },
  newStatus: {
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
  },
  progressSection: {
    marginTop: '20px',
  },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  progressBar: {
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    height: '8px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    backgroundColor: colors.primary,
    height: '100%',
    borderRadius: '4px',
  },
  progressText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '8px 0 0',
  },
  changedBy: {
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

export default GoalStatusChangedEmail;
