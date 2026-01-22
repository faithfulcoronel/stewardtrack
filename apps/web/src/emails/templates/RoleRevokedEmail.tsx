/**
 * ================================================================================
 * ROLE REVOKED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a role is revoked from a user.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface RoleRevokedEmailProps {
  recipientName: string;
  roleName: string;
  reason?: string;
  revokedBy?: string;
  effectiveDate?: string;
  remainingRoles?: string[];
  contactUrl?: string;
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

export function RoleRevokedEmail({
  recipientName,
  roleName,
  reason,
  revokedBy,
  effectiveDate,
  remainingRoles,
  contactUrl,
  tenantName,
  baseUrl,
}: RoleRevokedEmailProps) {
  const preview = `Your ${roleName} role has been updated`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Role Access Updated
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Role Change</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.roleLabel}>Role Removed</Text>
        <Text style={styles.roleName}>{roleName}</Text>

        <Section style={styles.detailsSection}>
          {effectiveDate && (
            <Text style={styles.detailRow}>
              <strong>Effective:</strong> {effectiveDate}
            </Text>
          )}
          {revokedBy && (
            <Text style={styles.detailRow}>
              <strong>Updated by:</strong> {revokedBy}
            </Text>
          )}
        </Section>

        {reason && (
          <Section style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{reason}</Text>
          </Section>
        )}

        {remainingRoles && remainingRoles.length > 0 && (
          <Section style={styles.remainingSection}>
            <Text style={styles.remainingLabel}>Your Current Roles</Text>
            {remainingRoles.map((role, index) => (
              <Text key={index} style={styles.remainingItem}>
                &#8226; {role}
              </Text>
            ))}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Your access permissions have been updated. If you have questions about this change
          or believe this was done in error, please contact your church administrator.
        </Text>
      </Section>

      {contactUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={contactUrl}>Contact Administrator</EmailButton>
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
  roleLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  roleName: {
    color: colors.warning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
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
  reasonSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  reasonLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  reasonText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
  },
  remainingSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  remainingLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  remainingItem: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
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

export default RoleRevokedEmail;
