/**
 * ================================================================================
 * SYSTEM ANNOUNCEMENT EMAIL TEMPLATE
 * ================================================================================
 *
 * General system announcement or important notice.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface SystemAnnouncementEmailProps {
  recipientName: string;
  announcementTitle: string;
  announcementBody: string;
  announcementType?: 'info' | 'update' | 'feature' | 'important';
  effectiveDate?: string;
  actionUrl?: string;
  actionLabel?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  feature: '#8b5cf6',
  featureBg: '#f5f3ff',
  important: '#ef4444',
  importantBg: '#fee2e2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

const typeConfig = {
  info: {
    color: colors.info,
    bg: colors.infoBg,
    label: 'Announcement',
    icon: 'ℹ️',
  },
  update: {
    color: colors.primary,
    bg: colors.primaryBg,
    label: 'System Update',
    icon: '🔄',
  },
  feature: {
    color: colors.feature,
    bg: colors.featureBg,
    label: 'New Feature',
    icon: '✨',
  },
  important: {
    color: colors.important,
    bg: colors.importantBg,
    label: 'Important Notice',
    icon: '⚠️',
  },
};

export function SystemAnnouncementEmail({
  recipientName,
  announcementTitle,
  announcementBody,
  announcementType = 'info',
  effectiveDate,
  actionUrl,
  actionLabel,
  tenantName,
  baseUrl,
}: SystemAnnouncementEmailProps) {
  const config = typeConfig[announcementType];
  const preview = `${config.icon} ${announcementTitle}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={{ ...styles.heading, color: config.color }}>
        {announcementTitle}
      </Heading>

      <Section style={styles.badge}>
        <Text style={{ ...styles.badgeText, backgroundColor: config.bg, color: config.color }}>
          {config.icon} {config.label}
        </Text>
      </Section>

      {effectiveDate && (
        <Section style={styles.dateSection}>
          <Text style={styles.dateText}>
            <strong>Effective:</strong> {effectiveDate}
          </Text>
        </Section>
      )}

      <Section style={styles.contentSection}>
        <Text style={styles.contentText}>{announcementBody}</Text>
      </Section>

      {actionUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={actionUrl}>{actionLabel || 'Learn More'}</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Best regards,</Text>
        <Text style={styles.signature}>{tenantName || 'StewardTrack Team'}</Text>
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
    borderRadius: '16px',
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    padding: '6px 16px',
    margin: 0,
  },
  dateSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  dateText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
  },
  contentSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '24px',
    margin: '0 0 24px',
  },
  contentText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
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

export default SystemAnnouncementEmail;
