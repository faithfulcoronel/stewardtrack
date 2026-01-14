/**
 * ================================================================================
 * NOTIFICATION EMAIL TEMPLATE
 * ================================================================================
 *
 * General-purpose notification email template for StewardTrack.
 * Supports various notification types with customizable content.
 * Uses brand colors and fonts matching the landing page.
 *
 * Usage:
 *   import { NotificationEmail } from '@/emails/templates/NotificationEmail';
 *   import { render } from '@react-email/components';
 *
 *   const html = await render(
 *     <NotificationEmail
 *       recipientName="John"
 *       title="New Event Created"
 *       body="A new event has been scheduled..."
 *       actionUrl="https://app.stewardtrack.com/events/123"
 *       actionLabel="View Event"
 *     />
 *   );
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface NotificationEmailProps {
  /** Recipient's first name for personalization */
  recipientName?: string;
  /** Email title/heading */
  title: string;
  /** Main notification body text (supports line breaks) */
  body: string;
  /** Optional CTA button URL */
  actionUrl?: string;
  /** Optional CTA button label */
  actionLabel?: string;
  /** Tenant/church name for branding */
  tenantName?: string;
  /** Tenant logo URL */
  tenantLogoUrl?: string;
  /** Notification category for preview text */
  category?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

// Brand colors
const colors = {
  primary: '#16a34a', // green-600
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#4b5563', // gray-600
};

export function NotificationEmail({
  recipientName,
  title,
  body,
  actionUrl,
  actionLabel = 'View Details',
  tenantName,
  tenantLogoUrl,
  category,
  baseUrl,
}: NotificationEmailProps) {
  const preview = category ? `${category}: ${title}` : title;

  return (
    <EmailLayout
      preview={preview}
      tenantName={tenantName}
      tenantLogoUrl={tenantLogoUrl}
      baseUrl={baseUrl}
    >
      {/* Greeting */}
      {recipientName && (
        <Text style={styles.greeting}>Hi {recipientName},</Text>
      )}

      {/* Title */}
      <Heading as="h1" style={styles.heading}>
        {title}
      </Heading>

      {/* Body */}
      <Section style={styles.bodySection}>
        {body.split('\n').map((paragraph, index) => (
          <Text key={index} style={styles.bodyText}>
            {paragraph || '\u00A0'}
          </Text>
        ))}
      </Section>

      {/* CTA Button */}
      {actionUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={actionUrl}>{actionLabel}</EmailButton>
        </Section>
      )}
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
  bodySection: {
    margin: '0 0 28px',
  },
  bodyText: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    lineHeight: '1.7',
    margin: '0 0 14px',
  },
  buttonSection: {
    margin: '8px 0 0',
    textAlign: 'left' as const,
  },
} as const;

export default NotificationEmail;
