/**
 * ================================================================================
 * DISCIPLESHIP PLAN COMPLETED EMAIL TEMPLATE
 * ================================================================================
 *
 * Celebration email when a discipleship plan is completed.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DiscipleshipPlanCompletedEmailProps {
  recipientName: string;
  memberName: string;
  pathwayName: string;
  completionDate: string;
  milestonesCompleted?: number;
  mentorName?: string;
  nextStepsUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  gold: '#f59e0b',
  goldBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DiscipleshipPlanCompletedEmail({
  recipientName,
  memberName,
  pathwayName,
  completionDate,
  milestonesCompleted,
  mentorName,
  nextStepsUrl,
  tenantName,
  baseUrl,
}: DiscipleshipPlanCompletedEmailProps) {
  const preview = `Congratulations! ${memberName} completed ${pathwayName}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Discipleship Completed!
      </Heading>

      <Section style={styles.celebrationRow}>
        <Text style={styles.celebrationEmoji}>&#127942; &#127881; &#11088;</Text>
      </Section>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Journey Complete</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.memberName}>{memberName}</Text>
        <Text style={styles.completedText}>has completed</Text>
        <Text style={styles.pathwayName}>{pathwayName}</Text>

        <Section style={styles.statsSection}>
          <Text style={styles.completionDate}>Completed on {completionDate}</Text>
          {milestonesCompleted && (
            <Text style={styles.milestoneCount}>
              {milestonesCompleted} milestones achieved
            </Text>
          )}
          {mentorName && (
            <Text style={styles.mentorText}>Mentored by {mentorName}</Text>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          This is a wonderful achievement in their spiritual growth journey. Their dedication and
          commitment to growing in faith is an inspiration to our entire church family.
        </Text>
      </Section>

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Being confident of this, that he who began a good work in you will carry it
          on to completion until the day of Christ Jesus.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Philippians 1:6</Text>
      </Section>

      {nextStepsUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={nextStepsUrl}>Explore Next Steps</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Celebrating together,</Text>
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
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  celebrationRow: {
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  celebrationEmoji: {
    fontSize: '32px',
    margin: 0,
  },
  badgeSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  badge: {
    backgroundColor: colors.goldBg,
    borderRadius: '16px',
    color: colors.gold,
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
    padding: '28px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  memberName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  completedText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  pathwayName: {
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  statsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  completionDate: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  milestoneCount: {
    color: colors.gold,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  mentorText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontStyle: 'italic' as const,
    margin: 0,
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

export default DiscipleshipPlanCompletedEmail;
