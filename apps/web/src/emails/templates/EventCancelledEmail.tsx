/**
 * ================================================================================
 * EVENT CANCELLED EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification when an event has been cancelled.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface EventCancelledEmailProps {
  recipientName: string;
  eventTitle: string;
  originalDate: string;
  originalTime?: string;
  cancellationReason?: string;
  refundInfo?: string;
  alternativeEventUrl?: string;
  calendarUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  danger: '#dc2626',
  dangerBg: '#fef2f2',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
  primary: '#16a34a',
};

export function EventCancelledEmail({
  recipientName,
  eventTitle,
  originalDate,
  originalTime,
  cancellationReason,
  refundInfo,
  alternativeEventUrl,
  calendarUrl,
  tenantName,
  baseUrl,
}: EventCancelledEmailProps) {
  const preview = `Event Cancelled: ${eventTitle}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Event Cancelled
      </Heading>

      <Section style={styles.badgeSection}>
        <Text style={styles.badge}>Cancellation Notice</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.eventTitle}>{eventTitle}</Text>

        <Section style={styles.originalDetails}>
          <Text style={styles.originalLabel}>Originally Scheduled</Text>
          <Text style={styles.originalDate}>
            {originalDate}
            {originalTime && ` at ${originalTime}`}
          </Text>
        </Section>

        {cancellationReason && (
          <Section style={styles.reasonSection}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{cancellationReason}</Text>
          </Section>
        )}
      </Section>

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          We regret to inform you that this event has been cancelled. We apologize for any inconvenience
          this may cause and appreciate your understanding.
        </Text>
      </Section>

      {refundInfo && (
        <Section style={styles.refundSection}>
          <Text style={styles.refundTitle}>Refund Information</Text>
          <Text style={styles.refundText}>{refundInfo}</Text>
        </Section>
      )}

      {(alternativeEventUrl || calendarUrl) && (
        <Section style={styles.buttonSection}>
          {alternativeEventUrl && (
            <EmailButton href={alternativeEventUrl}>View Alternative Events</EmailButton>
          )}
          {calendarUrl && !alternativeEventUrl && (
            <EmailButton href={calendarUrl}>Browse Calendar</EmailButton>
          )}
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>We apologize for the inconvenience,</Text>
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
    color: colors.danger,
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
    backgroundColor: colors.dangerBg,
    borderRadius: '16px',
    color: colors.danger,
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
    textAlign: 'center' as const,
  },
  eventTitle: {
    color: colors.textPrimary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '22px',
    fontWeight: 600,
    margin: '0 0 20px',
    textDecoration: 'line-through' as const,
  },
  originalDetails: {
    margin: '0 0 16px',
  },
  originalLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  originalDate: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '16px',
    margin: 0,
  },
  reasonSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
  },
  reasonLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  reasonText: {
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
  refundSection: {
    backgroundColor: '#fef3c7',
    borderRadius: '10px',
    padding: '16px',
    margin: '0 0 24px',
    textAlign: 'center' as const,
  },
  refundTitle: {
    color: '#92400e',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  refundText: {
    color: '#92400e',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.5',
    margin: 0,
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

export default EventCancelledEmail;
