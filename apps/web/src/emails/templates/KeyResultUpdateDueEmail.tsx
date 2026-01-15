/**
 * ================================================================================
 * KEY RESULT UPDATE DUE EMAIL TEMPLATE
 * ================================================================================
 *
 * Reminder when a key result update is due.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface KeyResultUpdateDueEmailProps {
  recipientName: string;
  keyResultTitle: string;
  objectiveTitle: string;
  goalTitle: string;
  currentValue?: number;
  targetValue?: number;
  unit?: string;
  dueDate: string;
  isOverdue?: boolean;
  updateUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  keyResult: '#059669',
  keyResultBg: '#d1fae5',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function KeyResultUpdateDueEmail({
  recipientName,
  keyResultTitle,
  objectiveTitle,
  goalTitle,
  currentValue,
  targetValue,
  unit,
  dueDate,
  isOverdue,
  updateUrl,
  tenantName,
  baseUrl,
}: KeyResultUpdateDueEmailProps) {
  const preview = isOverdue
    ? `Overdue: Key result update needed for ${keyResultTitle}`
    : `Reminder: Key result update due for ${keyResultTitle}`;

  const statusColor = isOverdue ? colors.danger : colors.warning;
  const statusBg = isOverdue ? colors.dangerBg : colors.warningBg;

  const progressPercent =
    currentValue !== undefined && targetValue !== undefined && targetValue > 0
      ? Math.round((currentValue / targetValue) * 100)
      : undefined;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Key Result Update {isOverdue ? 'Overdue' : 'Due'}
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={{ ...styles.badge, backgroundColor: statusBg, color: statusColor }}>
          {isOverdue ? 'Overdue' : 'Due Soon'}
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.contextText}>
          {goalTitle} &gt; {objectiveTitle}
        </Text>

        <Text style={styles.krLabel}>Key Result</Text>
        <Text style={styles.krTitle}>{keyResultTitle}</Text>

        {currentValue !== undefined && targetValue !== undefined && (
          <Section style={styles.progressSection}>
            <Text style={styles.progressLabel}>Current Progress</Text>
            <Text style={styles.progressValues}>
              {currentValue}
              {unit ? ` ${unit}` : ''} / {targetValue}
              {unit ? ` ${unit}` : ''}
            </Text>
            {progressPercent !== undefined && (
              <>
                <Section style={styles.progressBar}>
                  <Section
                    style={{
                      ...styles.progressFill,
                      width: `${Math.min(progressPercent, 100)}%`,
                    }}
                  />
                </Section>
                <Text style={styles.progressPercent}>{progressPercent}% complete</Text>
              </>
            )}
          </Section>
        )}

        <Section style={styles.dueSection}>
          <Text style={{ ...styles.dueText, color: statusColor }}>
            {isOverdue ? 'Was due:' : 'Due:'} {dueDate}
          </Text>
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          {isOverdue
            ? 'This key result update is past due. Please submit your progress update as soon as possible to keep the goal tracking accurate.'
            : 'Please update the progress on this key result. Regular updates help track progress toward your objectives.'}
        </Text>
      </Section>

      {updateUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={updateUrl}>Update Progress</EmailButton>
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
    color: colors.keyResult,
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
  contextText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 16px',
    fontStyle: 'italic' as const,
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
    color: colors.keyResult,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 20px',
  },
  progressSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  progressLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  progressValues: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 12px',
  },
  progressBar: {
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    height: '8px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    backgroundColor: colors.keyResult,
    height: '100%',
    borderRadius: '4px',
  },
  progressPercent: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '8px 0 0',
  },
  dueSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
  },
  dueText: {
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
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

export default KeyResultUpdateDueEmail;
