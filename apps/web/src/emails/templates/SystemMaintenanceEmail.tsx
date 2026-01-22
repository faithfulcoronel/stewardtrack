/**
 * ================================================================================
 * SYSTEM MAINTENANCE EMAIL TEMPLATE
 * ================================================================================
 *
 * Notification about scheduled system maintenance or downtime.
 *
 * ================================================================================
 */

import { Heading, Section, Text } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';
import { EmailButton } from '../components/EmailButton';

export interface SystemMaintenanceEmailProps {
  recipientName: string;
  maintenanceType: string;
  scheduledStart: string;
  scheduledEnd?: string;
  expectedDuration?: string;
  affectedServices?: string[];
  reason?: string;
  statusPageUrl?: string;
  tenantName?: string;
  baseUrl?: string;
}

const colors = {
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  textPrimary: '#1f2937',
  textSecondary: '#4b5563',
};

export function SystemMaintenanceEmail({
  recipientName,
  maintenanceType,
  scheduledStart,
  scheduledEnd,
  expectedDuration,
  affectedServices,
  reason,
  statusPageUrl,
  tenantName,
  baseUrl,
}: SystemMaintenanceEmailProps) {
  const preview = `Scheduled Maintenance: ${maintenanceType}`;

  return (
    <EmailLayout preview={preview} tenantName={tenantName} baseUrl={baseUrl}>
      <Text style={styles.greeting}>Dear {recipientName},</Text>

      <Heading as="h1" style={styles.heading}>
        Scheduled System Maintenance
      </Heading>

      <Section style={styles.badge}>
        <Text style={styles.badgeText}>⚠️ Maintenance Notice</Text>
      </Section>

      <Section style={styles.card}>
        <Text style={styles.typeLabel}>Maintenance Type</Text>
        <Text style={styles.maintenanceType}>{maintenanceType}</Text>

        <Section style={styles.timeSection}>
          <Text style={styles.timeRow}>
            <strong>Starts:</strong> {scheduledStart}
          </Text>
          {scheduledEnd && (
            <Text style={styles.timeRow}>
              <strong>Ends:</strong> {scheduledEnd}
            </Text>
          )}
          {expectedDuration && (
            <Text style={styles.timeRow}>
              <strong>Duration:</strong> {expectedDuration}
            </Text>
          )}
        </Section>

        {affectedServices && affectedServices.length > 0 && (
          <Section style={styles.servicesSection}>
            <Text style={styles.servicesLabel}>Affected Services</Text>
            {affectedServices.map((service, index) => (
              <Text key={index} style={styles.serviceItem}>
                • {service}
              </Text>
            ))}
          </Section>
        )}
      </Section>

      {reason && (
        <Section style={styles.reasonSection}>
          <Text style={styles.reasonLabel}>Reason for Maintenance</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </Section>
      )}

      <Section style={styles.messageSection}>
        <Text style={styles.messageText}>
          During the maintenance window, some features may be temporarily unavailable.
          We apologize for any inconvenience and appreciate your patience as we work
          to improve our systems.
        </Text>
      </Section>

      {statusPageUrl && (
        <Section style={styles.buttonSection}>
          <EmailButton href={statusPageUrl}>View Status Page</EmailButton>
        </Section>
      )}

      <Section style={styles.closingSection}>
        <Text style={styles.closingText}>Thank you for your understanding,</Text>
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
    color: colors.warning,
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
    backgroundColor: colors.warningBg,
    borderRadius: '16px',
    color: '#92400e',
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
  typeLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  maintenanceType: {
    color: colors.warning,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '20px',
    fontWeight: 600,
    margin: '0 0 16px',
  },
  timeSection: {
    backgroundColor: colors.warningBg,
    borderRadius: '8px',
    padding: '16px',
    margin: '0 0 16px',
    textAlign: 'left' as const,
  },
  timeRow: {
    color: '#92400e',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 8px',
  },
  servicesSection: {
    borderTop: '1px solid #e5e7eb',
    paddingTop: '16px',
    textAlign: 'left' as const,
  },
  servicesLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  serviceItem: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 6px',
  },
  reasonSection: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    margin: '0 0 24px',
  },
  reasonLabel: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '0 0 8px',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  reasonText: {
    color: colors.textPrimary,
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

export default SystemMaintenanceEmail;
