/**
 * ================================================================================
 * DELEGATION EXPIRED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a role delegation has expired.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DelegationExpiredEmailProps {
  recipientName: string;
  delegatorName: string;
  roleName: string;
  scope?: string;
  expiredDate: string;
  contactUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  expired: '#6b7280',
  expiredBg: '#f3f4f6',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DelegationExpiredEmail({
  recipientName,
  delegatorName,
  roleName,
  scope,
  expiredDate,
  contactUrl,
  tenantName,
  baseUrl,
}: DelegationExpiredEmailProps) {
  const preview = `Your ${roleName} delegation has expired`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Delegation Expired
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Access Ended</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.expiredText}>Your delegated access to</Text>
        <Text style={styles.roleName}>{roleName}</Text>
        <Text style={styles.expiredText}>has expired</Text>

        {scope && (
          <Text style={styles.scopeText}>Scope: {scope}</Text>
        )}

        <Section style={styles.detailsSection}>
          <Text style={styles.detailRow}>
            <strong>Delegated by:</strong> {delegatorName}
          </Text>
          <Text style={styles.detailRow}>
            <strong>Expired:</strong> {expiredDate}
          </Text>
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          The temporary delegation has ended and you no longer have access to the
          delegated permissions. If you need continued access, please contact
          {delegatorName} or your church administrator to request a new delegation.
        </Text>
      </Section>

      {contactUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={contactUrl}>Contact Administrator</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Thank you for your service,</Text>
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
    color: colors.expired,
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
    backgroundColor: colors.expiredBg,
    borderRadius: '16px',
    color: colors.expired,
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
  expiredText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  roleName: {
    color: colors.expired,
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

export default DelegationExpiredEmail;
