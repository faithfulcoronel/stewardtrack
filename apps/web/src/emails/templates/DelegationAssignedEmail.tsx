/**
 * ================================================================================
 * DELEGATION ASSIGNED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a role delegation is assigned to a user.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DelegationAssignedEmailProps {
  recipientName: string;
  delegatorName: string;
  roleName: string;
  scope?: string;
  startDate: string;
  endDate: string;
  permissions?: string[];
  dashboardUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  delegation: '#0ea5e9',
  delegationBg: '#e0f2fe',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function DelegationAssignedEmail({
  recipientName,
  delegatorName,
  roleName,
  scope,
  startDate,
  endDate,
  permissions,
  dashboardUrl,
  tenantName,
  baseUrl,
}: DelegationAssignedEmailProps) {
  const preview = `${delegatorName} has delegated ${roleName} to you`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Role Delegation Received
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Temporary Access</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.delegatorText}>
          <strong>{delegatorName}</strong> has delegated their
        </Text>
        <Text style={styles.roleName}>{roleName}</Text>
        <Text style={styles.delegatorText}>role to you</Text>

        {scope && (
          <Text style={styles.scopeText}>Scope: {scope}</Text>
        )}

        <Section style={styles.datesSection}>
          <Text style={styles.dateRow}>
            <strong>Start:</strong> {startDate}
          </Text>
          <Text style={styles.dateRow}>
            <strong>End:</strong> {endDate}
          </Text>
        </Section>

        {permissions && permissions.length > 0 && (
          <Section style={styles.permissionsSection}>
            <Text style={styles.permissionsLabel}>Delegated Permissions</Text>
            {permissions.slice(0, 5).map((permission, index) => (
              <Text key={index} style={styles.permissionItem}>
                &#10003; {permission}
              </Text>
            ))}
            {permissions.length > 5 && (
              <Text style={styles.morePermissions}>
                + {permissions.length - 5} more permissions
              </Text>
            )}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          This is a temporary delegation that will automatically expire on the end date.
          Please use these delegated privileges responsibly during this period.
        </Text>
      </Section>

      {dashboardUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={dashboardUrl}>Access Dashboard</EmailButton>
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
    color: colors.delegation,
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
    backgroundColor: colors.delegationBg,
    borderRadius: '16px',
    color: colors.delegation,
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
  delegatorText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  roleName: {
    color: colors.delegation,
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
  datesSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '20px',
    textAlign: 'left' as const,
  },
  dateRow: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 8px',
  },
  permissionsSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  permissionsLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  permissionItem: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
  },
  morePermissions: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontStyle: 'italic' as const,
    margin: '8px 0 0',
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

export default DelegationAssignedEmail;
