/**
 * ================================================================================
 * MEMBER UPDATED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when a member's profile or information has been updated.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface MemberUpdatedEmailProps {
  recipientName: string;
  memberName: string;
  updatedDate: string;
  updatedBy?: string;
  changedFields?: string[];
  profileUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function MemberUpdatedEmail({
  recipientName,
  memberName,
  updatedDate,
  updatedBy,
  changedFields,
  profileUrl,
  tenantName,
  baseUrl,
}: MemberUpdatedEmailProps) {
  const preview = `Your profile has been updated`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Profile Updated
      </Heading>

      <Section style={styles.badge}>
        <Text style={styles.badgeText}>Profile Update</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.memberLabel}>Member</Text>
        <Text style={styles.memberName}>{memberName}</Text>

        <Section style={styles.details}>
          <Text style={styles.detailRow}>
            <strong>Updated on:</strong> {updatedDate}
          </Text>
          {updatedBy && (
            <Text style={styles.detailRow}>
              <strong>Updated by:</strong> {updatedBy}
            </Text>
          )}
        </Section>

        {changedFields && changedFields.length > 0 && (
          <Section style={styles.changesSection}>
            <Text style={styles.changesLabel}>Fields Updated</Text>
            {changedFields.map((field, index) => (
              <Text key={index} style={styles.changeItem}>
                &#10003; {field}
              </Text>
            ))}
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          This email is to notify you that changes have been made to your member profile.
          If you did not request these changes or have any questions, please contact the
          church office.
        </Text>
      </Section>

      {profileUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={profileUrl}>View Your Profile</EmailButton>
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
    color: colors.info,
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
    backgroundColor: colors.infoBg,
    borderRadius: '16px',
    color: colors.info,
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
  memberLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  memberName: {
    color: colors.info,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 16px',
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
  changesSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    marginTop: '16px',
    textAlign: 'left' as const,
  },
  changesLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  changeItem: {
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

export default MemberUpdatedEmail;
