/**
 * ================================================================================
 * ROLE ASSIGNED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a user is assigned a new role.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface RoleAssignedEmailProps {
  recipientName: string;
  roleName: string;
  roleDescription?: string;
  assignedBy?: string;
  effectiveDate?: string;
  permissions?: string[];
  dashboardUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  rbac: '#6366f1',
  rbacBg: '#eef2ff',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function RoleAssignedEmail({
  recipientName,
  roleName,
  roleDescription,
  assignedBy,
  effectiveDate,
  permissions,
  dashboardUrl,
  tenantName,
  baseUrl,
}: RoleAssignedEmailProps) {
  const preview = `You've been assigned the ${roleName} role`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        New Role Assigned
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Role Update</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.roleLabel}>Your New Role</Text>
        <Text style={styles.roleName}>{roleName}</Text>

        {roleDescription && (
          <Text style={styles.roleDescription}>{roleDescription}</Text>
        )}

        <Section style={styles.detailsSection}>
          {effectiveDate && (
            <Text style={styles.detailRow}>
              <strong>Effective:</strong> {effectiveDate}
            </Text>
          )}
          {assignedBy && (
            <Text style={styles.detailRow}>
              <strong>Assigned by:</strong> {assignedBy}
            </Text>
          )}
        </Section>

        {permissions && permissions.length > 0 && (
          <Section style={styles.permissionsSection}>
            <Text style={styles.permissionsLabel}>Key Permissions</Text>
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
          With this role, you now have access to additional features and responsibilities.
          Please use these privileges responsibly and in accordance with church policies.
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
    color: colors.rbac,
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
    backgroundColor: colors.rbacBg,
    borderRadius: '16px',
    color: colors.rbac,
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
    color: colors.rbac,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  roleDescription: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 20px',
    lineHeight: '1.5',
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

export default RoleAssignedEmail;
