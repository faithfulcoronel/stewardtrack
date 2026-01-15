/**
 * ================================================================================
 * CARE PLAN MEMBER NOTIFICATION EMAIL TEMPLATE
 * ================================================================================
 *
 * Warm, comforting email sent to the member who is receiving care.
 * Focuses on letting them know they are being cared for and prayed for.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface CarePlanMemberNotificationEmailProps {
  /** Recipient's name (member receiving care) */
  recipientName: string;
  /** Name of the caregiver assigned (if any) */
  caregiverName?: string;
  /** When to expect a follow-up */
  followUpDate?: string;
  /** URL to view their care plan */
  carePlanUrl?: string;
  /** Church/tenant name */
  tenantName?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  warmBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
};

export function CarePlanMemberNotificationEmail({
  recipientName,
  caregiverName,
  followUpDate,
  carePlanUrl,
  tenantName,
  baseUrl,
}: CarePlanMemberNotificationEmailProps) {
  const preview = 'You are in our thoughts and prayers';

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      baseUrl={baseUrl}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      {/* Title */}
      <Heading as="h1" style={styles.heading}>
        You Are in Our Care
      </Heading>

      {/* Church Name Badge */}
      {tenantName && (
        <Section style={styles.churchBadge}>
          <Text style={styles.churchBadgeText}>
            From {tenantName}
          </Text>
        </Section>
      )}

      {/* Main Content */}
      <Section style={styles.bodySection}>
        <Text style={styles.bodyText}>
          We want you to know that you are loved and being thought of.
          {tenantName ? ` ${tenantName}` : ' Our church family'} is here for you,
          and we&apos;re committed to walking alongside you during this season.
        </Text>

        {caregiverName ? (
          <Text style={styles.bodyText}>
            <strong>{caregiverName}</strong> has been asked to reach out to you
            and be a source of encouragement and support. They will be praying
            for you and checking in to see how you&apos;re doing.
          </Text>
        ) : (
          <Text style={styles.bodyText}>
            Someone from {tenantName || 'our church family'} will be reaching out
            to you soon. Know that you are being prayed for and cared about.
          </Text>
        )}
      </Section>

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Cast all your anxiety on him because he cares for you.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— 1 Peter 5:7</Text>
      </Section>

      {/* Follow-up reminder */}
      {followUpDate && (
        <Section style={styles.reminderSection}>
          <Text style={styles.reminderText}>
            &#128151; Expect to hear from us around <strong>{followUpDate}</strong>
          </Text>
        </Section>
      )}

      {/* Encouragement */}
      <Section style={styles.warmSection}>
        <Text style={styles.warmText}>
          Remember, you don&apos;t have to walk through this alone. We&apos;re here
          for you — whether you need someone to talk to, pray with, or simply
          sit with you in silence. Please don&apos;t hesitate to reach out.
        </Text>
      </Section>

      {/* CTA Button */}
      {carePlanUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={carePlanUrl}>View Details</EmailButton>
        </Section>
      )}

      {/* Closing */}
      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>
          With love and prayers,
          <br />
          {tenantName || 'Your Church Family'}
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
  warmSection: {
    backgroundColor: colors.warmBg,
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '20px',
  },
  warmText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
    textAlign: 'center' as const,
  },
  buttonSection: {
    margin: '0 0 28px',
    textAlign: 'center' as const,
  },
  closingSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '24px',
  },
  closingText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
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

export default CarePlanMemberNotificationEmail;
