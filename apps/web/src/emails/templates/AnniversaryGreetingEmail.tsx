/**
 * ================================================================================
 * WEDDING ANNIVERSARY GREETING EMAIL TEMPLATE
 * ================================================================================
 *
 * Warm, celebratory email to wish members a happy wedding anniversary.
 * Celebrates the milestone of their marriage.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface AnniversaryGreetingEmailProps {
  /** Recipient's name */
  recipientName: string;
  /** Spouse's name (optional) */
  spouseName?: string;
  /** Number of years married */
  years?: number;
  /** Custom anniversary message from the church */
  customMessage?: string;
  /** URL to member's profile or church page */
  profileUrl?: string;
  /** Church/tenant name */
  tenantName?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  anniversary: '#dc2626', // Red/romantic for anniversary
  anniversaryBg: '#fef2f2',
  gold: '#b45309', // Amber/gold for celebration
  goldBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
};

/**
 * Get the traditional/modern anniversary gift name for milestone years
 */
function getAnniversaryMilestone(years: number): string | null {
  const milestones: Record<number, string> = {
    1: 'Paper',
    5: 'Wood',
    10: 'Tin/Aluminum',
    15: 'Crystal',
    20: 'China',
    25: 'Silver',
    30: 'Pearl',
    35: 'Coral',
    40: 'Ruby',
    45: 'Sapphire',
    50: 'Gold',
    55: 'Emerald',
    60: 'Diamond',
  };
  return milestones[years] || null;
}

export function AnniversaryGreetingEmail({
  recipientName,
  spouseName,
  years,
  customMessage,
  profileUrl,
  tenantName,
  baseUrl,
}: AnniversaryGreetingEmailProps) {
  const coupleText = spouseName ? `${recipientName} & ${spouseName}` : recipientName;
  const preview = `Happy Anniversary, ${coupleText}! Celebrating your love!`;
  const milestone = years ? getAnniversaryMilestone(years) : null;

  // Default anniversary message if none provided
  const anniversaryMessage = customMessage ||
    "May this special day remind you of the beautiful journey you've shared together. Your love is an inspiration to our church family, and we thank God for the blessing of your marriage!";

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      baseUrl={baseUrl}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Dear {coupleText},</Text>

      {/* Title with celebration */}
      <Heading as="h1" style={styles.heading}>
        Happy Anniversary!
      </Heading>

      {/* Celebration emojis - hearts and rings */}
      <Section style={styles.celebrationRow}>
        <Text style={styles.celebrationEmoji}>&#128141; &#128152; &#128141;</Text>
      </Section>

      {/* Church Name Badge */}
      {tenantName && (
        <Section style={styles.churchBadge}>
          <Text style={styles.churchBadgeText}>
            From {tenantName}
          </Text>
        </Section>
      )}

      {/* Anniversary Card */}
      <Section style={styles.anniversaryCard}>
        {years && (
          <>
            <Text style={styles.yearsText}>
              Celebrating {years} {years === 1 ? 'Year' : 'Years'} of Marriage!
            </Text>
            {milestone && (
              <Text style={styles.milestoneText}>
                Your {milestone} Anniversary
              </Text>
            )}
          </>
        )}
        <Text style={styles.messageText}>{anniversaryMessage}</Text>
      </Section>

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;Two are better than one, because they have a good return for their labor:
          If either of them falls down, one can help the other up.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Ecclesiastes 4:9-10</Text>
      </Section>

      {/* Blessing */}
      <Section style={styles.blessingSection}>
        <Text style={styles.blessingText}>
          May God continue to bless your union with love, patience, and understanding.
          May your bond grow stronger with each passing year, and may your home always
          be filled with His peace and grace.
        </Text>
      </Section>

      {/* CTA Button (if profile URL provided) */}
      {profileUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={profileUrl}>
            Visit Our Church
          </EmailButton>
        </Section>
      )}

      {/* Warm closing */}
      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>
          With love and anniversary blessings,
        </Text>
        <Text style={styles.churchSignature}>
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
    color: colors.anniversary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '32px',
    fontWeight: 700,
    lineHeight: '1.2',
    margin: '0 0 8px',
    textAlign: 'center' as const,
  },
  celebrationRow: {
    margin: '0 0 20px',
    textAlign: 'center' as const,
  },
  celebrationEmoji: {
    fontSize: '32px',
    margin: 0,
  },
  churchBadge: {
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  churchBadgeText: {
    backgroundColor: colors.anniversaryBg,
    borderRadius: '16px',
    color: colors.anniversary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
    padding: '6px 16px',
  },
  anniversaryCard: {
    backgroundColor: colors.goldBg,
    borderRadius: '12px',
    margin: '0 0 28px',
    padding: '28px',
    textAlign: 'center' as const,
  },
  yearsText: {
    color: colors.gold,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  milestoneText: {
    color: colors.anniversary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 16px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  messageText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
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
  blessingSection: {
    margin: '0 0 28px',
  },
  blessingText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
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
    textAlign: 'center' as const,
  },
  closingText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 8px',
  },
  churchSignature: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  poweredBy: {
    color: '#9ca3af',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '11px',
    margin: 0,
  },
} as const;

export default AnniversaryGreetingEmail;
