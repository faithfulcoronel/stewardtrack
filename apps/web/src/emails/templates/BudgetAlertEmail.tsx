/**
 * ================================================================================
 * BUDGET ALERT EMAIL TEMPLATE
 * ================================================================================
 *
 * Alert email for budget thresholds, overspending, or budget updates.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface BudgetAlertEmailProps {
  recipientName: string;
  budgetName: string;
  alertType: 'warning' | 'exceeded' | 'info';
  currentSpend: string;
  budgetLimit: string;
  percentUsed: number;
  remainingBudget?: string;
  periodName?: string;
  budgetUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function BudgetAlertEmail({
  recipientName,
  budgetName,
  alertType,
  currentSpend,
  budgetLimit,
  percentUsed,
  remainingBudget,
  periodName,
  budgetUrl,
  tenantName,
  baseUrl,
}: BudgetAlertEmailProps) {
  const alertConfig = {
    warning: {
      color: colors.warning,
      bg: colors.warningBg,
      title: 'Budget Warning',
      badge: 'Approaching Limit',
    },
    exceeded: {
      color: colors.danger,
      bg: colors.dangerBg,
      title: 'Budget Exceeded',
      badge: 'Over Budget',
    },
    info: {
      color: colors.info,
      bg: colors.infoBg,
      title: 'Budget Update',
      badge: 'Status Update',
    },
  };

  const config = alertConfig[alertType];
  const preview = `${config.title}: ${budgetName} is at ${percentUsed}% of budget`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={{ ...styles.heading, color: config.color }}>
        {config.title}
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={{ ...styles.badge, backgroundColor: config.bg, color: config.color }}>
          {config.badge}
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.budgetName}>{budgetName}</Text>
        {periodName && <Text style={styles.periodName}>{periodName}</Text>}

        <Section style={styles.progressContainer}>
          <Text style={styles.percentText}>{percentUsed}%</Text>
          <Text style={styles.percentLabel}>of budget used</Text>
        </Section>

        <Section style={styles.statsGrid}>
          <Section style={styles.statItem}>
            <Text style={styles.statLabel}>Spent</Text>
            <Text style={{ ...styles.statValue, color: config.color }}>{currentSpend}</Text>
          </Section>
          <Section style={styles.statItem}>
            <Text style={styles.statLabel}>Budget</Text>
            <Text style={styles.statValue}>{budgetLimit}</Text>
          </Section>
          {remainingBudget && (
            <Section style={styles.statItem}>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statValue}>{remainingBudget}</Text>
            </Section>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          {alertType === 'exceeded'
            ? 'This budget has exceeded its allocated limit. Please review spending and make necessary adjustments.'
            : alertType === 'warning'
            ? 'This budget is approaching its limit. Consider reviewing upcoming expenses to stay within budget.'
            : 'This is a status update for your budget tracking.'}
        </Text>
      </Section>

      {budgetUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={budgetUrl}>View Budget Details</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Best regards,</Text>
        <Text style={styles.signature}>{tenantName || 'Your Finance Team'}</Text>
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
  budgetName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  periodName: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 20px',
  },
  progressContainer: {
    margin: '0 0 20px',
  },
  percentText: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '48px',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1,
  },
  percentLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '4px 0 0',
  },
  statsGrid: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  statItem: {
    display: 'inline-block' as const,
    margin: '0 16px',
  },
  statLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  statValue: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '18px',
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

export default BudgetAlertEmail;
