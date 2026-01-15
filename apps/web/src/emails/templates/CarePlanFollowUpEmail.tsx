/**
 * ================================================================================
 * CARE PLAN FOLLOW-UP REMINDER EMAIL TEMPLATE
 * ================================================================================
 *
 * Gentle, encouraging reminder to follow up with someone in your care.
 * Focuses on relationship and ministry rather than task completion.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface CarePlanFollowUpEmailProps {
  /** Recipient's name */
  recipientName: string;
  /** Member receiving care */
  memberName: string;
  /** Follow-up date */
  followUpDate: string;
  /** Days until follow-up (negative = overdue) */
  daysUntilFollowUp: number;
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

export function CarePlanFollowUpEmail({
  recipientName,
  memberName,
  followUpDate,
  daysUntilFollowUp,
  carePlanUrl,
  tenantName,
  baseUrl,
}: CarePlanFollowUpEmailProps) {
  const isOverdue = daysUntilFollowUp < 0;
  const isDueToday = daysUntilFollowUp === 0;

  const preview = isDueToday
    ? `A gentle reminder to connect with ${memberName} today`
    : isOverdue
    ? `Thinking of you and ${memberName}`
    : `Time to check in with ${memberName}`;

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
        {isDueToday
          ? `A moment to connect with ${memberName}`
          : isOverdue
          ? `Checking in about ${memberName}`
          : `Time to reach out to ${memberName}`}
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
        {isDueToday ? (
          <Text style={styles.bodyText}>
            Just a gentle reminder that today might be a good day to reach out to{' '}
            <strong>{memberName}</strong>. A simple call, text, or visit can mean
            more than you know.
          </Text>
        ) : isOverdue ? (
          <Text style={styles.bodyText}>
            We wanted to gently check in. Life gets busy, and we understand!
            When you have a moment, <strong>{memberName}</strong> would love to
            hear from you.
          </Text>
        ) : (
          <Text style={styles.bodyText}>
            This is a friendly reminder that your scheduled time to connect with{' '}
            <strong>{memberName}</strong> is coming up on <strong>{followUpDate}</strong>.
          </Text>
        )}

        <Text style={styles.bodyText}>
          Your willingness to care for others is a beautiful reflection of
          God&apos;s love. Thank you for being part of this ministry.
        </Text>
      </Section>

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Therefore encourage one another and build each other up, just as
          in fact you are doing.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— 1 Thessalonians 5:11</Text>
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={carePlanUrl}>View Details</EmailButton>
      </Section>

      {/* Encouragement */}
      <Section style={styles.encouragementSection}>
        <Text style={styles.encouragementText}>
          Every conversation, every prayer, every moment of care matters.
          You&apos;re making a difference.
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

export default CarePlanFollowUpEmail;
