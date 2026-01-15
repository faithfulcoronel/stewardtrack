/**
 * ================================================================================
 * EVENT UPDATED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when event details have been changed.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface EventUpdatedEmailProps {
  recipientName: string;
  eventTitle: string;
  changes: Array<{
    field: string;
    oldValue?: string;
    newValue: string;
  }>;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  eventUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  info: '#3b82f6',
  infoBg: '#dbeafe',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function EventUpdatedEmail({
  recipientName,
  eventTitle,
  changes,
  eventDate,
  eventTime,
  eventLocation,
  eventUrl,
  tenantName,
  baseUrl,
}: EventUpdatedEmailProps) {
  const preview = `Event Updated: ${eventTitle}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Event Updated
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Details Changed</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>

        {changes && changes.length > 0 && (
          <Section style={styles.changesSection}>
            <Text style={styles.changesTitle}>What Changed</Text>
            {changes.map((change, index) => (
              <Section key={index} style={styles.changeItem}>
                <Text style={styles.changeField}>{change.field}</Text>
                {change.oldValue && (
                  <Text style={styles.oldValue}>Was: {change.oldValue}</Text>
                )}
                <Text style={styles.newValue}>Now: {change.newValue}</Text>
              </Section>
            ))}
          </Section>
        )}

        <Section style={styles.currentDetails}>
          <Text style={styles.currentTitle}>Current Details</Text>
          <Section style={styles.detailRow}>
            <Text style={styles.detailIcon}>&#128197;</Text>
            <Text style={styles.detailText}>{eventDate}</Text>
          </Section>
          {eventTime && (
            <Section style={styles.detailRow}>
              <Text style={styles.detailIcon}>&#128336;</Text>
              <Text style={styles.detailText}>{eventTime}</Text>
            </Section>
          )}
          {eventLocation && (
            <Section style={styles.detailRow}>
              <Text style={styles.detailIcon}>&#128205;</Text>
              <Text style={styles.detailText}>{eventLocation}</Text>
            </Section>
          )}
        </Section>
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          Please take note of these changes to ensure you have the correct information for this event.
        </Text>
      </Section>

      {eventUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={eventUrl}>View Updated Event</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>See you there!</Text>
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
    color: colors.info,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '28px',
    fontWeight: 700,
    margin: '0 0 16px',
    textAlign: 'center' as const,
  },
  badgeSection: {
    textAlign: 'center' as const,
    margin: '0 0 24px',
  },
  badge: {
    backgroundColor: colors.infoBg,
    borderRadius: '16px',
    color: colors.info,
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
  },
  eventTitle: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 20px',
    textAlign: 'center' as const,
  },
  changesSection: {
    backgroundColor: colors.infoBg,
    borderRadius: '8px',
    padding: '16px',
    margin: '0 0 20px',
  },
  changesTitle: {
    color: colors.info,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 12px',
  },
  changeItem: {
    margin: '0 0 12px',
    paddingBottom: '12px',
    borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
  },
  changeField: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  oldValue: {
    color: '#dc2626',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 2px',
    textDecoration: 'line-through' as const,
  },
  newValue: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    margin: 0,
  },
  currentDetails: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  currentTitle: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  detailRow: {
    margin: '0 0 8px',
  },
  detailIcon: {
    display: 'inline-block' as const,
    fontSize: '14px',
    margin: '0 8px 0 0',
    verticalAlign: 'middle' as const,
  },
  detailText: {
    color: colors.textSecondary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: 0,
    verticalAlign: 'middle' as const,
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

export default EventUpdatedEmail;
