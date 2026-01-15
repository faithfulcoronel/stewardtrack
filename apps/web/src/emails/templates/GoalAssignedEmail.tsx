/**
 * ================================================================================
 * GOAL ASSIGNED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a goal is assigned to a user.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface GoalAssignedEmailProps {
  recipientName: string;
  goalTitle: string;
  goalDescription?: string;
  assignedBy?: string;
  dueDate?: string;
  objectivesCount?: number;
  goalUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  goals: '#0891b2',
  goalsBg: '#ecfeff',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function GoalAssignedEmail({
  recipientName,
  goalTitle,
  goalDescription,
  assignedBy,
  dueDate,
  objectivesCount,
  goalUrl,
  tenantName,
  baseUrl,
}: GoalAssignedEmailProps) {
  const preview = `New goal assigned: ${goalTitle}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        New Goal Assigned
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Goal Assignment</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.goalLabel}>Your Goal</Text>
        <Text style={styles.goalTitle}>{goalTitle}</Text>

        {goalDescription && (
          <Text style={styles.goalDescription}>{goalDescription}</Text>
        )}

        <Section style={styles.detailsSection}>
          {assignedBy && (
            <Text style={styles.detailRow}>
              <strong>Assigned by:</strong> {assignedBy}
            </Text>
          )}
          {dueDate && (
            <Text style={styles.detailRow}>
              <strong>Due:</strong> {dueDate}
            </Text>
          )}
          {objectivesCount !== undefined && objectivesCount > 0 && (
            <Text style={styles.detailRow}>
              <strong>Objectives:</strong> {objectivesCount}
            </Text>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          A new goal has been assigned to you. Review the objectives and key results
          to understand what's expected. Regular progress updates will help track your
          journey toward achieving this goal.
        </Text>
      </Section>

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Commit to the Lord whatever you do, and he will establish your plans.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Proverbs 16:3</Text>
      </Section>

      {goalUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={goalUrl}>View Goal Details</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Blessings on your journey,</Text>
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
    color: colors.goals,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 12px',
  },
  goalDescription: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
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
  scriptureSection: {
    backgroundColor: colors.goalsBg,
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
    color: colors.goals,
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

export default GoalAssignedEmail;
