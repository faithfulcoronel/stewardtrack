/**
 * ================================================================================
 * DELEGATION EXPIRING EMAIL TEMPLATE
 * ================================================================================
 *
 * Warning notification when a role delegation is about to expire.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DelegationExpiringEmailProps {
  recipientName: string;
  delegatorName: string;
  roleName: string;
  scope?: string;
  expirationDate: string;
  daysRemaining: number;
  dashboardUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DelegationExpiringEmail({
  recipientName,
  delegatorName,
  roleName,
  scope,
  expirationDate,
  daysRemaining,
  dashboardUrl,
  tenantName,
  baseUrl,
}: DelegationExpiringEmailProps) {
  const preview = `Your ${roleName} delegation expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Delegation Expiring Soon
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>
          {daysRemaining} Day{daysRemaining !== 1 ? 's' : ''} Remaining
        </Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.expiringText}>Your delegated access to</Text>
        <Text style={styles.roleName}>{roleName}</Text>
        <Text style={styles.expiringText}>will expire soon</Text>

        {scope && (
          <Text style={styles.scopeText}>Scope: {scope}</Text>
        )}

        <Section style={styles.detailsSection}>
          <Text style={styles.detailRow}>
            <strong>Delegated by:</strong> {delegatorName}
          </Text>
          <Text style={styles.detailRow}>
            <strong>Expires:</strong> {expirationDate}
          </Text>
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Please complete any pending tasks that require this delegated access before
          the expiration date. If you need an extension, please contact {delegatorName}
          or your church administrator.
        </Text>
      </Section>

      {dashboardUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={dashboardUrl}>View Delegation</EmailButton>
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
    color: colors.warning,
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
    backgroundColor: colors.warningBg,
    borderRadius: '16px',
    color: colors.warning,
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
  expiringText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  roleName: {
    color: colors.warning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '8px 0',
  },
  scopeText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '12px 0 0',
    fontStyle: 'italic' as const,
  },
  detailsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '20px',
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

export default DelegationExpiringEmail;
