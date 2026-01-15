/**
 * ================================================================================
 * MEMBER JOINED EMAIL TEMPLATE
 * ================================================================================
 *
 * Welcome email sent when a new member officially joins the congregation.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface MemberJoinedEmailProps {
  recipientName: string;
  memberName: string;
  joinedDate: string;
  membershipType?: string;
  welcomeMessage?: string;
  profileUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function MemberJoinedEmail({
  recipientName,
  memberName,
  joinedDate,
  membershipType,
  welcomeMessage,
  profileUrl,
  tenantName,
  baseUrl,
}: MemberJoinedEmailProps) {
  const preview = `Welcome ${memberName} to our church family!`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Welcome to Our Church Family!
      </Heading>

      <Section style={styles.badge}>
        <Text style={styles.badgeText}>New Member</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.memberLabel}>Member</Text>
        <Text style={styles.memberName}>{memberName}</Text>

        <Section style={styles.details}>
          <Text style={styles.detailRow}>
            <strong>Joined:</strong> {joinedDate}
          </Text>
          {membershipType && (
            <Text style={styles.detailRow}>
              <strong>Membership:</strong> {membershipType}
            </Text>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          {welcomeMessage ||
            `We are thrilled to welcome you to our church family!
            Your decision to join us is a blessing, and we look forward to
            growing together in faith, fellowship, and service.`}
        </Text>
      </Section>

      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;For where two or three gather in my name, there am I with them.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Matthew 18:20</Text>
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
    color: colors.primary,
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
    backgroundColor: colors.primaryBg,
    borderRadius: '16px',
    color: colors.primary,
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
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  details: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
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
  scriptureSection: {
    backgroundColor: colors.primaryBg,
    borderRadius: '10px',
    padding: '24px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  scriptureText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: '0 0 8px',
  },
  scriptureRef: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
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

export default MemberJoinedEmail;
