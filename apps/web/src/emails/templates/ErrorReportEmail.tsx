/**
 * ================================================================================
 * ERROR REPORT EMAIL TEMPLATE
 * ================================================================================
 *
 * Email template for error reports submitted by users when encountering
 * unexpected errors. Includes error details and optional user feedback.
 *
 * ================================================================================
 */

import { Heading, Section, Text, Hr, CodeInline } from '@react-email/components';
import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';

export interface ErrorReportEmailProps {
  /** Error message */
  errorMessage: string;
  /** Error stack trace */
  stackTrace?: string;
  /** Component stack (React) */
  componentStack?: string;
  /** User's additional details */
  userFeedback?: string;
  /** User's email (if logged in) */
  userEmail?: string;
  /** User's name (if logged in) */
  userName?: string;
  /** Tenant name (if applicable) */
  tenantName?: string;
  /** URL where error occurred */
  errorUrl?: string;
  /** Browser user agent */
  userAgent?: string;
  /** Timestamp of error */
  timestamp: string;
  /** Error ID for tracking */
  errorId?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

// Brand colors
const colors = {
  primary: '#16a34a', // green-600
  error: '#dc2626', // red-600
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#4b5563', // gray-600
  textMuted: '#9ca3af', // gray-400
  codeBg: '#f3f4f6', // gray-100
  border: '#e5e7eb', // gray-200
};

export function ErrorReportEmail({
  errorMessage,
  stackTrace,
  componentStack,
  userFeedback,
  userEmail,
  userName,
  tenantName,
  errorUrl,
  userAgent,
  timestamp,
  errorId,
  baseUrl,
}: ErrorReportEmailProps) {
  const preview = `Error Report: ${errorMessage.substring(0, 50)}${errorMessage.length > 50 ? '...' : ''}`;

  return (
    <EmailLayout
      preview={preview}
      tenantName="StewardTrack Support"
      baseUrl={baseUrl}
    >
      {/* Header */}
      <Heading as="h1" style={styles.heading}>
        Error Report
      </Heading>

      {/* Error ID Badge */}
      {errorId && (
        <Text style={styles.errorId}>
          Error ID: <CodeInline style={styles.codeInline}>{errorId}</CodeInline>
        </Text>
      )}

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        Reported: {timestamp}
      </Text>

      <Hr style={styles.divider} />

      {/* User Feedback Section */}
      {userFeedback && (
        <>
          <Section style={styles.section}>
            <Text style={styles.sectionTitle}>User Feedback</Text>
            <Text style={styles.feedbackText}>{userFeedback}</Text>
          </Section>
          <Hr style={styles.divider} />
        </>
      )}

      {/* User Information */}
      <Section style={styles.section}>
        <Text style={styles.sectionTitle}>User Information</Text>
        <table style={styles.infoTable}>
          <tbody>
            {userName && (
              <tr>
                <td style={styles.labelCell}>Name:</td>
                <td style={styles.valueCell}>{userName}</td>
              </tr>
            )}
            {userEmail && (
              <tr>
                <td style={styles.labelCell}>Email:</td>
                <td style={styles.valueCell}>{userEmail}</td>
              </tr>
            )}
            {tenantName && (
              <tr>
                <td style={styles.labelCell}>Tenant:</td>
                <td style={styles.valueCell}>{tenantName}</td>
              </tr>
            )}
            {!userName && !userEmail && (
              <tr>
                <td style={styles.valueCell} colSpan={2}>Not logged in</td>
              </tr>
            )}
          </tbody>
        </table>
      </Section>

      <Hr style={styles.divider} />

      {/* Error Details */}
      <Section style={styles.section}>
        <Text style={styles.sectionTitle}>Error Details</Text>
        <Text style={styles.errorMessage}>{errorMessage}</Text>
        {errorUrl && (
          <Text style={styles.errorUrl}>
            URL: <CodeInline style={styles.codeInline}>{errorUrl}</CodeInline>
          </Text>
        )}
      </Section>

      {/* Stack Trace */}
      {stackTrace && (
        <>
          <Hr style={styles.divider} />
          <Section style={styles.section}>
            <Text style={styles.sectionTitle}>Stack Trace</Text>
            <pre style={styles.codeBlock}>{stackTrace}</pre>
          </Section>
        </>
      )}

      {/* Component Stack */}
      {componentStack && (
        <>
          <Hr style={styles.divider} />
          <Section style={styles.section}>
            <Text style={styles.sectionTitle}>Component Stack</Text>
            <pre style={styles.codeBlock}>{componentStack}</pre>
          </Section>
        </>
      )}

      {/* Browser Information */}
      {userAgent && (
        <>
          <Hr style={styles.divider} />
          <Section style={styles.section}>
            <Text style={styles.sectionTitle}>Browser Information</Text>
            <Text style={styles.userAgent}>{userAgent}</Text>
          </Section>
        </>
      )}
    </EmailLayout>
  );
}

const styles = {
  heading: {
    color: colors.error,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '1.3',
    margin: '0 0 8px',
  },
  errorId: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    margin: '0 0 4px',
  },
  timestamp: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0 0 16px',
  },
  divider: {
    borderColor: colors.border,
    margin: '20px 0',
  },
  section: {
    margin: '0',
  },
  sectionTitle: {
    color: colors.primary,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    margin: '0 0 12px',
    textTransform: 'uppercase' as const,
  },
  feedbackText: {
    backgroundColor: '#fef3c7', // amber-100
    borderLeft: '4px solid #f59e0b', // amber-500
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '15px',
    fontStyle: 'italic' as const,
    lineHeight: '1.6',
    margin: '0',
    padding: '12px 16px',
  },
  infoTable: {
    borderCollapse: 'collapse' as const,
    width: '100%',
  },
  labelCell: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 500,
    padding: '4px 12px 4px 0',
    verticalAlign: 'top' as const,
    width: '80px',
  },
  valueCell: {
    color: colors.textPrimary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    padding: '4px 0',
    verticalAlign: 'top' as const,
  },
  errorMessage: {
    backgroundColor: '#fef2f2', // red-50
    borderLeft: '4px solid #dc2626', // red-600
    color: colors.error,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '1.5',
    margin: '0 0 12px',
    padding: '12px 16px',
  },
  errorUrl: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    margin: '0',
  },
  codeInline: {
    backgroundColor: colors.codeBg,
    borderRadius: '4px',
    fontFamily: "'Consolas', 'Monaco', monospace",
    fontSize: '12px',
    padding: '2px 6px',
  },
  codeBlock: {
    backgroundColor: colors.codeBg,
    borderRadius: '6px',
    color: colors.textPrimary,
    fontFamily: "'Consolas', 'Monaco', monospace",
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '0',
    maxHeight: '300px',
    overflow: 'auto' as const,
    padding: '12px 16px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  userAgent: {
    color: colors.textSecondary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    lineHeight: '1.5',
    margin: '0',
    wordBreak: 'break-word' as const,
  },
} as const;

export default ErrorReportEmail;
