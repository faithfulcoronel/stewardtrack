/**
 * ================================================================================
 * KEY RESULT COMPLETED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a key result has been completed.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface KeyResultCompletedEmailProps {
  recipientName: string;
  keyResultTitle: string;
  objectiveTitle: string;
  goalTitle?: string;
  completedDate: string;
  completedBy?: string;
  finalValue?: string;
  targetValue?: string;
  objectiveUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  planning: '#8b5cf6',
  planningBg: '#f5f3ff',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function KeyResultCompletedEmail({
  recipientName,
  keyResultTitle,
  objectiveTitle,
  goalTitle,
  completedDate,
  completedBy,
  finalValue,
  targetValue,
  objectiveUrl,
  tenantName,
  baseUrl,
}: KeyResultCompletedEmailProps) {
  const preview = `Key Result Completed: ${keyResultTitle}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Key Result Completed! 🎯
      </Heading>

      <Section style={styles.badge}>
        <Text style={styles.badgeText}>Achievement Unlocked</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.krLabel}>Key Result</Text>
        <Text style={styles.krTitle}>{keyResultTitle}</Text>

        <Section style={styles.hierarchySection}>
          <Text style={styles.hierarchyItem}>
            <strong>Objective:</strong> {objectiveTitle}
          </Text>
          {goalTitle && (
            <Text style={styles.hierarchyItem}>
              <strong>Goal:</strong> {goalTitle}
            </Text>
          )}
        </Section>

        <Section style={styles.details}>
          <Text style={styles.detailRow}>
            <strong>Completed on:</strong> {completedDate}
          </Text>
          {completedBy && (
            <Text style={styles.detailRow}>
              <strong>Completed by:</strong> {completedBy}
            </Text>
          )}
          {finalValue && targetValue && (
            <Text style={styles.detailRow}>
              <strong>Achievement:</strong> {finalValue} / {targetValue}
            </Text>
          )}
        </Section>

        <Section style={styles.successBadge}>
          <Text style={styles.successText}>✓ 100% Complete</Text>
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Congratulations on completing this key result! Your dedication and hard work
          have brought us one step closer to achieving our objective. Keep up the
          excellent work!
        </Text>
      </Section>

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Whatever you do, work at it with all your heart, as working for the Lord.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Colossians 3:23</Text>
      </Section>

      {objectiveUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={objectiveUrl}>View Objective</EmailButton>
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
  krLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  krTitle: {
    color: colors.planning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  hierarchySection: {
    backgroundColor: colors.planningBg,
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '0 0 16px',
    textAlign: 'left' as const,
  },
  hierarchyItem: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 4px',
  },
  details: {
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
  successBadge: {
    marginTop: '16px',
  },
  successText: {
    backgroundColor: colors.primaryBg,
    borderRadius: '20px',
    color: colors.primary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    padding: '8px 20px',
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

export default KeyResultCompletedEmail;
