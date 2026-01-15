/**
 * ================================================================================
 * BIRTHDAY GREETING EMAIL TEMPLATE
 * ================================================================================
 *
 * Warm, celebratory email to wish members a happy birthday.
 * Includes optional member photo for a personal touch.
 *
 * ================================================================================
 */

import { Heading, Img, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface BirthdayGreetingEmailProps {
  /** Recipient's name */
  recipientName: string;
  /** Member's profile picture URL (optional) */
  memberPhotoUrl?: string;
  /** Custom birthday message from the church */
  customMessage?: string;
  /** Age they're turning (optional - only include if appropriate) */
  age?: number;
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
  celebration: '#ec4899', // Pink for birthday
  celebrationBg: '#fce7f3',
  gold: '#f59e0b',
  goldBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  textMuted: '#6b7280',
};

export function BirthdayGreetingEmail({
  recipientName,
  memberPhotoUrl,
  customMessage,
  age,
  profileUrl,
  tenantName,
  baseUrl,
}: BirthdayGreetingEmailProps) {
  const preview = `Happy Birthday, ${recipientName}! Wishing you a blessed day!`;

  // Default birthday message if none provided
  const birthdayMessage = customMessage ||
    "May this special day be filled with joy, laughter, and the warmth of God's love. You are a blessing to our church family, and we thank God for the gift of your life!";

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      baseUrl={baseUrl}
    >
      {/* Greeting */}
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      {/* Title with celebration */}
      <Heading as="h1" style={styles.heading}>
        Happy Birthday!
      </Heading>

      {/* Celebration emojis */}
      <Section style={styles.celebrationRow}>
        <Text style={styles.celebrationEmoji}>&#127874; &#127880; &#127881;</Text>
      </Section>

      {/* Church Name Badge */}
      {tenantName && (
        <Section style={styles.churchBadge}>
          <Text style={styles.churchBadgeText}>
            From {tenantName}
          </Text>
        </Section>
      )}

      {/* Member Photo (if available) */}
      {memberPhotoUrl && (
        <Section style={styles.photoSection}>
          <Img
            src={memberPhotoUrl}
            alt={recipientName}
            width={120}
            height={120}
            style={styles.memberPhoto}
          />
        </Section>
      )}

      {/* Birthday Card */}
      <Section style={styles.birthdayCard}>
        {age && (
          <Text style={styles.ageText}>
            Celebrating {age} wonderful years!
          </Text>
        )}
        <Text style={styles.messageText}>{birthdayMessage}</Text>
      </Section>

      {/* Scripture */}
      <Section style={styles.scriptureSection}>
        <Text style={styles.scriptureText}>
          &ldquo;This is the day the Lord has made; let us rejoice and be glad in it.&rdquo;
        </Text>
        <Text style={styles.scriptureRef}>— Psalm 118:24</Text>
      </Section>

      {/* Blessing */}
      <Section style={styles.blessingSection}>
        <Text style={styles.blessingText}>
          May the Lord bless you abundantly in the year ahead. May His face shine upon you
          and give you peace. We are grateful to have you as part of our church family!
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
          With love and birthday blessings,
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
    color: colors.celebration,
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
    backgroundColor: colors.celebrationBg,
    borderRadius: '16px',
    color: colors.celebration,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
    padding: '6px 16px',
  },
  photoSection: {
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  memberPhoto: {
    border: `4px solid ${colors.celebrationBg}`,
    borderRadius: '50%',
    objectFit: 'cover' as const,
  },
  birthdayCard: {
    backgroundColor: colors.goldBg,
    borderRadius: '12px',
    margin: '0 0 28px',
    padding: '28px',
    textAlign: 'center' as const,
  },
  ageText: {
    color: colors.gold,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 12px',
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

export default BirthdayGreetingEmail;
