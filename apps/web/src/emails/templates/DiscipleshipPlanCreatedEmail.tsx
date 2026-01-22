/**
 * ================================================================================
 * DISCIPLESHIP PLAN CREATED EMAIL TEMPLATE
 * ================================================================================
 *
 * Warm, encouraging email when someone begins their discipleship journey.
 * Focuses on spiritual growth and community support.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DiscipleshipPlanCreatedEmailProps {
  /** Recipient's name */
  recipientName: string;
  /** Whether recipient is the person on the journey */
  isRecipientMember?: boolean;
  /** Member on the discipleship journey */
  memberName: string;
  /** Discipleship pathway name */
  pathwayName: string;
  /** Assigned mentor name */
  mentorName?: string;
  /** Current next step */
  nextStep?: string;
  /** URL to view the journey */
  planUrl: string;
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

export function DiscipleshipPlanCreatedEmail({
  recipientName,
  isRecipientMember = false,
  memberName,
  pathwayName,
  mentorName,
  nextStep,
  planUrl,
  tenantName,
  baseUrl,
}: DiscipleshipPlanCreatedEmailProps) {
  const preview = isRecipientMember
    ? `Your journey of faith begins - ${pathwayName}`
    : `Walking alongside ${memberName} in faith`;

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
        {isRecipientMember
          ? 'Your journey of growth begins!'
          : `${memberName} is starting a new journey`}
      </Heading>

      {/* Church Name Badge */}
      {tenantName && (
        <Section style={styles.churchBadge}>
          <Text style={styles.churchBadgeText}>
            {tenantName} Discipleship
          </Text>
        </Section>
      )}

      {/* Main Content */}
      <Section style={styles.bodySection}>
        {isRecipientMember ? (
          <>
            <Text style={styles.bodyText}>
              We&apos;re so excited to walk with you on this journey of faith!
              You&apos;re taking an important step by beginning the{' '}
              <strong>{pathwayName}</strong> pathway.
            </Text>
            {mentorName && (
              <Text style={styles.bodyText}>
                <strong>{mentorName}</strong> will be walking alongside you as
                your mentor. They&apos;re here to encourage you, pray with you,
                and help you grow.
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.bodyText}>
              <strong>{memberName}</strong> is beginning their{' '}
              <strong>{pathwayName}</strong> journey, and you&apos;ve been invited
              to be part of their growth.
            </Text>
            <Text style={styles.bodyText}>
              What a privilege it is to walk alongside someone as they grow in
              their faith. Your encouragement and prayers will make a real difference.
            </Text>
          </>
        )}
      </Section>

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Being confident of this, that he who began a good work in you
          will carry it on to completion until the day of Christ Jesus.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Philippians 1:6</Text>
      </Section>

      {/* Next Step */}
      {nextStep && isRecipientMember && (
        <Section style={styles.nextStepSection}>
          <Text style={styles.nextStepLabel}>Your first step:</Text>
          <Text style={styles.nextStepText}>{nextStep}</Text>
        </Section>
      )}

      {/* Pathway Card */}
      <Section style={styles.pathwayCard}>
        <Text style={styles.pathwayName}>{pathwayName}</Text>
        {mentorName && (
          <Text style={styles.mentorText}>
            {isRecipientMember ? 'Your mentor: ' : 'Mentor: '}
            <strong>{mentorName}</strong>
          </Text>
        )}
      </Section>

      {/* CTA Button */}
      <Section style={styles.buttonSection}>
        <EmailButton href={planUrl}>
          {isRecipientMember ? 'View My Journey' : 'View Details'}
        </EmailButton>
      </Section>

      {/* Encouragement */}
      <Section style={styles.encouragementSection}>
        <Text style={styles.encouragementText}>
          {isRecipientMember
            ? "Growth happens one step at a time. We're cheering you on!"
            : "Thank you for investing in someone's spiritual growth. It matters more than you know."}
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
  nextStepSection: {
    backgroundColor: '#f9fafb',
    borderLeft: `4px solid ${colors.primary}`,
    borderRadius: '8px',
    margin: '0 0 28px',
    padding: '20px',
  },
  nextStepLabel: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  nextStepText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    fontWeight: 500,
    lineHeight: '1.5',
    margin: 0,
  },
  pathwayCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '24px',
    textAlign: 'center' as const,
  },
  pathwayName: {
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  mentorText: {
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

export default DiscipleshipPlanCreatedEmail;
