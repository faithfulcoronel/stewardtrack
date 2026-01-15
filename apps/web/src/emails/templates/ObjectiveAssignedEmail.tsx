/**
 * ================================================================================
 * OBJECTIVE ASSIGNED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when an objective is assigned to a user.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface ObjectiveAssignedEmailProps {
  recipientName: string;
  objectiveTitle: string;
  objectiveDescription?: string;
  goalTitle: string;
  assignedBy?: string;
  dueDate?: string;
  keyResultsCount?: number;
  objectiveUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  objectives: '#7c3aed',
  objectivesBg: '#f3e8ff',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function ObjectiveAssignedEmail({
  recipientName,
  objectiveTitle,
  objectiveDescription,
  goalTitle,
  assignedBy,
  dueDate,
  keyResultsCount,
  objectiveUrl,
  tenantName,
  baseUrl,
}: ObjectiveAssignedEmailProps) {
  const preview = `New objective assigned: ${objectiveTitle}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        New Objective Assigned
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Objective Assignment</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.goalContext}>Part of: {goalTitle}</Text>

        <Text style={styles.objectiveLabel}>Your Objective</Text>
        <Text style={styles.objectiveTitle}>{objectiveTitle}</Text>

        {objectiveDescription && (
          <Text style={styles.objectiveDescription}>{objectiveDescription}</Text>
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
          {keyResultsCount !== undefined && keyResultsCount > 0 && (
            <Text style={styles.detailRow}>
              <strong>Key Results:</strong> {keyResultsCount}
            </Text>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          This objective contributes to achieving the larger goal. Focus on completing
          the key results to make measurable progress. Your efforts make a difference!
        </Text>
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
    color: colors.objectives,
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
    backgroundColor: colors.objectivesBg,
    borderRadius: '16px',
    color: colors.objectives,
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
  goalContext: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 16px',
    fontStyle: 'italic' as const,
  },
  objectiveLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  objectiveTitle: {
    color: colors.objectives,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 12px',
  },
  objectiveDescription: {
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

export default ObjectiveAssignedEmail;
