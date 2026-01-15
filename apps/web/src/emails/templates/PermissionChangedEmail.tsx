/**
 * ================================================================================
 * PERMISSION CHANGED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when user permissions have been modified.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface PermissionChangedEmailProps {
  recipientName: string;
  roleName: string;
  addedPermissions?: string[];
  removedPermissions?: string[];
  changedBy?: string;
  effectiveDate?: string;
  dashboardUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  rbac: '#6366f1',
  rbacBg: '#eef2ff',
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function PermissionChangedEmail({
  recipientName,
  roleName,
  addedPermissions,
  removedPermissions,
  changedBy,
  effectiveDate,
  dashboardUrl,
  tenantName,
  baseUrl,
}: PermissionChangedEmailProps) {
  const preview = `Your permissions for ${roleName} have been updated`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Permissions Updated
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Access Change</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.roleLabel}>Role</Text>
        <Text style={styles.roleName}>{roleName}</Text>

        <Section style={styles.detailsSection}>
          {effectiveDate && (
            <Text style={styles.detailRow}>
              <strong>Effective:</strong> {effectiveDate}
            </Text>
          )}
          {changedBy && (
            <Text style={styles.detailRow}>
              <strong>Changed by:</strong> {changedBy}
            </Text>
          )}
        </Section>

        {addedPermissions && addedPermissions.length > 0 && (
          <Section style={styles.addedSection}>
            <Text style={styles.sectionLabel}>Added Permissions</Text>
            {addedPermissions.map((permission, index) => (
              <Text key={index} style={styles.addedItem}>
                + {permission}
              </Text>
            ))}
          </Section>
        )}

        {removedPermissions && removedPermissions.length > 0 && (
          <Section style={styles.removedSection}>
            <Text style={styles.sectionLabel}>Removed Permissions</Text>
            {removedPermissions.map((permission, index) => (
              <Text key={index} style={styles.removedItem}>
                - {permission}
              </Text>
            ))}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Your access permissions have been updated. These changes affect what features
          and actions you can perform within the system. If you have any questions,
          please reach out to your administrator.
        </Text>
      </Section>

      {dashboardUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={dashboardUrl}>View Your Access</EmailButton>
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
    fontSize: '22px',
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
  sectionLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  addedSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  addedItem: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
    fontWeight: 500,
  },
  removedSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  removedItem: {
    color: colors.danger,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
    fontWeight: 500,
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

export default PermissionChangedEmail;
