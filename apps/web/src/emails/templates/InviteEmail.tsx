/**
 * ================================================================================
 * INVITE EMAIL TEMPLATE
 * ================================================================================
 *
 * Email sent when inviting a new user to join a church/tenant.
 * Uses StewardTrack brand colors and fonts.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface InviteEmailProps {
  /** Invitee's first name (if known) */
  recipientName?: string;
  /** Inviter's name */
  inviterName: string;
  /** Church/tenant name */
  tenantName: string;
  /** Tenant logo URL */
  tenantLogoUrl?: string;
  /** Role being assigned */
  roleName?: string;
  /** Invitation acceptance URL */
  invitationUrl: string;
  /** Invitation expiry (e.g., "7 days") */
  expiresIn?: string;
  /** Optional personal message from inviter */
  personalMessage?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a', // green-600
  primaryBg: '#dcfce7', // green-100
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#4b5563', // gray-600
  textMuted: '#6b7280', // gray-500
  warning: '#d97706', // amber-600
  warningBg: '#fef3c7', // amber-100
};

export function InviteEmail({
  recipientName,
  inviterName,
  tenantName,
  tenantLogoUrl,
  roleName,
  invitationUrl,
  expiresIn = '7 days',
  personalMessage,
  baseUrl,
}: InviteEmailProps) {
  const preview = `You've been invited to join ${tenantName}`;

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      tenantLogoUrl={tenantLogoUrl}
      baseUrl={baseUrl}
    >
      {/* Invitation Badge */}
      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>You&apos;re Invited</Text>
      </Section>

      {/* Greeting */}
      <Heading as="h1" style={styles.heading}>
        {recipientName ? `Hi ${recipientName},` : 'Hello,'}
      </Heading>

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          <strong>{inviterName}</strong> has invited you to join{' '}
          <strong>{tenantName}</strong> on StewardTrack
          {roleName && (
            <>
              {' '}
              as a <strong>{roleName}</strong>
            </>
          )}
          .
        </Text>

        {personalMessage && (
          <Section style={styles.messageSection}>
            <Text style={styles.messageLabel}>Message from {inviterName}:</Text>
            <Text style={styles.messageText}>&ldquo;{personalMessage}&rdquo;</Text>
          </Section>
        )}

        <Text style={styles.bodyText}>
          Click the button below to accept this invitation and create your
          account.
        </Text>
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={invitationUrl}>Accept Invitation</EmailButton>
      </Section>

      {/* Expiry Notice */}
      <Section style={styles.expirySection}>
        <Text style={styles.expiryText}>
          &#9200; This invitation will expire in {expiresIn}
        </Text>
      </Section>

      {/* Help Text */}
      <Section style={styles.helpSection}>
        <Text style={styles.helpText}>
          If you didn&apos;t expect this invitation or believe it was sent in
          error, you can safely ignore this email.
        </Text>
        <Text style={styles.linkText}>
          Button not working? Copy and paste this link into your browser:
        </Text>
        <Text style={styles.urlText}>{invitationUrl}</Text>
      </Section>
    </EmailLayout>
  );
}

const styles = {
  badgeSection: {
    marginBottom: '16px',
  },
  badge: {
    backgroundColor: colors.primaryBg,
    borderRadius: '16px',
    color: colors.primary,
    display: 'inline-block' as const,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    padding: '6px 14px',
    textTransform: 'uppercase' as const,
  },
  heading: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: '1.3',
    margin: '0 0 24px',
  },
  bodySection: {
    margin: '0 0 24px',
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 14px',
  },
  messageSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    margin: '20px 0',
    padding: '20px',
  },
  messageLabel: {
    color: colors.textMuted,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    margin: '0 0 10px',
    textTransform: 'uppercase' as const,
  },
  messageText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: 0,
  },
  buttonSection: {
    margin: '0 0 28px',
    textAlign: 'center' as const,
  },
  expirySection: {
    backgroundColor: colors.warningBg,
    borderRadius: '8px',
    margin: '0 0 28px',
    padding: '14px 18px',
    textAlign: 'center' as const,
  },
  expiryText: {
    color: colors.warning,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    margin: 0,
  },
  helpSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px',
  },
  helpText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.5',
    margin: '0 0 14px',
    textAlign: 'center' as const,
  },
  linkText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  urlText: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '11px',
    margin: 0,
    textAlign: 'center' as const,
    wordBreak: 'break-all' as const,
  },
} as const;

export default InviteEmail;
