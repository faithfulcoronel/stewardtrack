/**
 * ================================================================================
 * EVENT REMINDER EMAIL TEMPLATE
 * ================================================================================
 *
 * Reminder email for upcoming calendar events.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface EventReminderEmailProps {
  recipientName: string;
  eventTitle: string;
  eventDate: string;
  eventTime?: string;
  eventLocation?: string;
  eventDescription?: string;
  reminderType?: 'day_before' | 'hour_before' | 'week_before';
  eventUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  primary: '#16a34a',
  primaryBg: '#dcfce7',
  event: '#8b5cf6',
  eventBg: '#f3e8ff',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function EventReminderEmail({
  recipientName,
  eventTitle,
  eventDate,
  eventTime,
  eventLocation,
  eventDescription,
  reminderType,
  eventUrl,
  tenantName,
  baseUrl,
}: EventReminderEmailProps) {
  const reminderText = {
    day_before: 'Tomorrow',
    hour_before: 'Starting Soon',
    week_before: 'Coming Up',
  };

  const badge = reminderType ? reminderText[reminderType] : 'Reminder';
  const preview = `Reminder: ${eventTitle} - ${eventDate}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Event Reminder
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>{badge}</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>

        <Section style={styles.detailsSection}>
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

        {eventDescription && (
          <Section style={styles.descriptionSection}>
            <Text style={styles.descriptionText}>{eventDescription}</Text>
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          This is a friendly reminder about your upcoming event. We look forward to seeing you there!
        </Text>
      </Section>

      {eventUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={eventUrl}>View Event Details</EmailButton>
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
    color: colors.event,
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
    backgroundColor: colors.eventBg,
    borderRadius: '16px',
    color: colors.event,
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
  detailsSection: {
    margin: '0 0 16px',
  },
  detailRow: {
    margin: '0 0 12px',
  },
  detailIcon: {
    display: 'inline-block' as const,
    fontSize: '16px',
    margin: '0 8px 0 0',
    verticalAlign: 'middle' as const,
  },
  detailText: {
    color: colors.textSecondary,
    display: 'inline-block' as const,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    margin: 0,
    verticalAlign: 'middle' as const,
  },
  descriptionSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  descriptionText: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
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

export default EventReminderEmail;
