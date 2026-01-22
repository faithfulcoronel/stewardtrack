/**
 * ================================================================================
 * CARE PLAN ASSIGNED EMAIL TEMPLATE
 * ================================================================================
 *
 * Warm, spiritual email sent when someone is asked to care for a member.
 * Focuses on the ministry of care rather than administrative details.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface CarePlanAssignedEmailProps {
  /** Recipient's name (person providing care) */
  recipientName: string;
  /** Member receiving care */
  memberName: string;
  /** When to follow up */
  followUpDate?: string;
  /** Context or notes about the care need */
  careContext?: string;
  /** URL to view details */
  carePlanUrl: string;
  /** Church/tenant name */
  tenantName?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
};

export function CarePlanAssignedEmail({
  recipientName,
  memberName,
  followUpDate,
  careContext,
  carePlanUrl,
  tenantName,
  baseUrl,
}: CarePlanAssignedEmailProps) {
  const preview = `You're invited to care for ${memberName}`;

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      baseUrl={baseUrl}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Hi {recipientName},</Text>

      {/* Title */}
      <Heading as="h1" style={styles.heading}>
        You&apos;re invited to walk alongside {memberName}
      </Heading>

      {/* Church Name Badge */}
      {tenantName && (
        <Section style={styles.churchBadge}>
          <Text style={styles.churchBadgeText}>
            {tenantName} Care Ministry
          </Text>
        </Section>
      )}

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          We believe God places people in our lives for a reason.
          {tenantName ? ` ${tenantName} has` : ' You have been'} asked
          {tenantName ? ' you' : ''} to reach out to <strong>{memberName}</strong> and
          be a source of encouragement and support during this season.
        </Text>

        <Text style={styles.bodyText}>
          Your care, prayers, and presence can make a meaningful difference in
          someone&apos;s life. Thank you for saying yes to this opportunity to serve.
        </Text>
      </Section>

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Carry each other&apos;s burdens, and in this way you will fulfill
          the law of Christ.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Galatians 6:2</Text>
      </Section>

      {/* Care Context */}
      {careContext && (
        <Section style={styles.contextSection}>
          <Text style={styles.contextLabel}>A note to help you connect:</Text>
          <Text style={styles.contextText}>{careContext}</Text>
        </Section>
      )}

      {/* Follow-up reminder */}
      {followUpDate && (
        <Section style={styles.reminderSection}>
          <Text style={styles.reminderText}>
            &#128197; Consider reaching out by <strong>{followUpDate}</strong>
          </Text>
        </Section>
      )}

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={carePlanUrl}>View Details</EmailButton>
      </Section>

      {/* Encouragement */}
      <Section style={styles.encouragementSection}>
        <Text style={styles.encouragementText}>
          Remember, you don&apos;t have to have all the answers. Sometimes just
          showing up and listening is the greatest gift we can give.
        </Text>
        <Text style={styles.poweredBy}>
          Sent via StewardTrack
        </Text>
      </Section>
    </EmailLayout>
  );
}

const styles = {
  greeting: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '16px',
    lineHeight: '1.5',
    margin: '0 0 20px',
  },
  heading: {
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '26px',
    fontWeight: 700,
    lineHeight: '1.3',
    margin: '0 0 24px',
  },
  churchBadge: {
    margin: '0 0 20px',
    textAlign: 'center' as const,
  },
  churchBadgeText: {
    backgroundColor: colors.primaryBg,
    borderRadius: '16px',
    color: colors.primary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
    padding: '6px 16px',
  },
  bodySection: {
    margin: '0 0 28px',
  },
  bodyText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 14px',
  },
  scriptureSection: {
    backgroundColor: colors.primaryBg,
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  scriptureText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '16px',
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
  contextSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    margin: '0 0 24px',
    padding: '20px',
  },
  contextLabel: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  contextText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
  },
  reminderSection: {
    margin: '0 0 28px',
    textAlign: 'center' as const,
  },
  reminderText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  buttonSection: {
    margin: '0 0 28px',
    textAlign: 'center' as const,
  },
  encouragementSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px',
  },
  encouragementText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.6',
    margin: '0 0 12px',
    textAlign: 'center' as const,
  },
  poweredBy: {
    color: '#9ca3af',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '11px',
    margin: 0,
    textAlign: 'center' as const,
  },
} as const;

export default CarePlanAssignedEmail;
