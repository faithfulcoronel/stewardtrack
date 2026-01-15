/**
 * ================================================================================
 * DISCIPLESHIP MILESTONE EMAIL TEMPLATE
 * ================================================================================
 *
 * Celebratory, encouraging email when someone reaches a milestone in their
 * spiritual journey. Focuses on celebration and God's faithfulness.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface DiscipleshipMilestoneEmailProps {
  /** Recipient's name */
  recipientName: string;
  /** Whether recipient is the person who reached the milestone */
  isRecipientMember?: boolean;
  /** Member who reached the milestone */
  memberName: string;
  /** Milestone name */
  milestoneName: string;
  /** Discipleship pathway name */
  pathwayName: string;
  /** Personal message or celebration note */
  message?: string;
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
  celebration: '#fbbf24',
  celebrationBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
};

export function DiscipleshipMilestoneEmail({
  recipientName,
  isRecipientMember = false,
  memberName,
  milestoneName,
  pathwayName,
  message,
  planUrl,
  tenantName,
  baseUrl,
}: DiscipleshipMilestoneEmailProps) {
  const preview = isRecipientMember
    ? `Celebrating your growth - ${milestoneName}!`
    : `${memberName} reached a milestone worth celebrating!`;

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
          ? "Look how far you've come!"
          : `Let's celebrate ${memberName}!`}
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
          <Text style={styles.bodyText}>
            We&apos;re so proud of you! You&apos;ve reached an important milestone
            in your <strong>{pathwayName}</strong> journey. This is a moment to
            pause, reflect on God&apos;s faithfulness, and celebrate how He&apos;s
            been working in your life.
          </Text>
        ) : (
          <Text style={styles.bodyText}>
            Great news! <strong>{memberName}</strong> has reached a beautiful
            milestone in their <strong>{pathwayName}</strong> journey. Let&apos;s
            take a moment to celebrate what God is doing in their life!
          </Text>
        )}
      </Section>

      {/* Celebration Card */}
      <Section style={styles.celebrationCard}>
        <Text style={styles.celebrationEmoji}>&#127881;</Text>
        <Text style={styles.milestoneName}>{milestoneName}</Text>
        <Text style={styles.pathwayText}>{pathwayName}</Text>
      </Section>

      {/* Personal Message */}
      {message && (
        <Section style={styles.messageSection}>
          <Text style={styles.messageText}>&ldquo;{message}&rdquo;</Text>
        </Section>
      )}

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          {isRecipientMember
            ? '"I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus."'
            : '"Therefore encourage one another and build each other up."'}
        </Text>
        <Text style={styles.scriptureRef}>
          — {isRecipientMember ? 'Philippians 3:14' : '1 Thessalonians 5:11'}
        </Text>
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
            ? "Every step of faith matters. Keep going - there's more ahead!"
            : 'Your prayers and encouragement are helping them grow. Thank you!'}
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
  celebrationCard: {
    backgroundColor: colors.celebrationBg,
    borderRadius: '12px',
    margin: '0 0 28px',
    padding: '32px',
    textAlign: 'center' as const,
  },
  celebrationEmoji: {
    fontSize: '40px',
    margin: '0 0 12px',
  },
  milestoneName: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  pathwayText: {
    backgroundColor: colors.primaryBg,
    borderRadius: '16px',
    color: colors.primary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    margin: 0,
    padding: '4px 12px',
  },
  messageSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '10px',
    margin: '0 0 28px',
    padding: '20px',
    textAlign: 'center' as const,
  },
  messageText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: 0,
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

export default DiscipleshipMilestoneEmail;
