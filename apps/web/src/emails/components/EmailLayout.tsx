/**
 * ================================================================================
 * BASE EMAIL LAYOUT COMPONENT
 * ================================================================================
 *
 * Professional email layout matching StewardTrack landing page branding.
 * Uses the same fonts (DM Sans, Urbanist) and footer style.
 *
 * Dependencies: @react-email/components
 * Install: pnpm add @react-email/components -F @stewardtrack/web
 *
 * ================================================================================
 */

import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
  tenantName?: string;
  tenantLogoUrl?: string;
  /** Base URL for assets (defaults to https://stewardtrack.com) */
  baseUrl?: string;
}

// Brand colors matching landing page
const colors = {
  primary: '#16a34a', // green-600
  primaryDark: '#15803d', // green-700
  navy: '#071437', // Footer background
  textPrimary: '#1f2937', // gray-800
  textSecondary: '#4b5563', // gray-600
  textMuted: '#9ca3af', // gray-400
  textLight: '#d1d5db', // gray-300
  border: '#e5e7eb', // gray-200
  background: '#f9fafb', // gray-50
  white: '#ffffff',
};

export function EmailLayout({
  preview,
  children,
  tenantName,
  tenantLogoUrl,
  baseUrl = 'https://stewardtrack.com',
}: EmailLayoutProps) {
  const logoUrl = tenantLogoUrl || `${baseUrl}/landing/logo-light.png`;
  const currentYear = new Date().getFullYear();

  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Urbanist:wght@400;600;700;900&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Img
              src={logoUrl}
              alt={tenantName || 'StewardTrack'}
              width={200}
              style={styles.logo}
            />
          </Section>

          <Hr style={styles.headerDivider} />

          {/* Main Content */}
          <Section style={styles.content}>{children}</Section>

          {/* Footer - Matching Landing Page */}
          <Section style={styles.footer}>
            {/* Footer Logo and Description */}
            <Section style={styles.footerMain}>
              <Img
                src={`${baseUrl}/landing/logo-dark.png`}
                alt="StewardTrack"
                width={160}
                style={styles.footerLogo}
              />
              <Text style={styles.footerDescription}>
                StewardTrack is a church management platform that makes finances,
                records, and ministry operations simple, secure, and
                solution-focused.
              </Text>
            </Section>

            <Hr style={styles.footerDivider} />

            {/* Contact Information */}
            <Section style={styles.footerContact}>
              <Row>
                <Column style={styles.footerColumn}>
                  <Text style={styles.footerLabel}>Email</Text>
                  <Link
                    href="mailto:stewardtrack@gmail.com"
                    style={styles.footerLink}
                  >
                    stewardtrack@gmail.com
                  </Link>
                </Column>
                <Column style={styles.footerColumn}>
                  <Text style={styles.footerLabel}>Phone</Text>
                  <Text style={styles.footerText}>0912-345-6789</Text>
                </Column>
                <Column style={styles.footerColumn}>
                  <Text style={styles.footerLabel}>Location</Text>
                  <Text style={styles.footerText}>San Fernando, Pampanga</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={styles.footerDivider} />

            {/* Links */}
            <Section style={styles.footerLinks}>
              <Link href={`${baseUrl}/privacy`} style={styles.footerLinkSmall}>
                Privacy Policy
              </Link>
              <Text style={styles.footerLinkSeparator}>|</Text>
              <Link href={`${baseUrl}/terms`} style={styles.footerLinkSmall}>
                Terms of Service
              </Link>
              <Text style={styles.footerLinkSeparator}>|</Text>
              <Link href={baseUrl} style={styles.footerLinkSmall}>
                Visit Website
              </Link>
            </Section>

            {/* Copyright */}
            <Text style={styles.copyright}>
              &copy; {currentYear} StewardTrack. All rights reserved.
            </Text>
            <Text style={styles.madeWith}>
              Made with love by Cortanatech Solutions, Inc.
            </Text>
          </Section>
        </Container>

        {/* Unsubscribe Notice */}
        <Section style={styles.unsubscribe}>
          <Text style={styles.unsubscribeText}>
            {tenantName
              ? `This email was sent by ${tenantName} via StewardTrack.`
              : 'This email was sent by StewardTrack.'}
          </Text>
          <Text style={styles.unsubscribeText}>
            If you believe you received this email in error, please contact your
            church administrator.
          </Text>
        </Section>
      </Body>
    </Html>
  );
}

const styles = {
  body: {
    backgroundColor: colors.background,
    fontFamily: "'DM Sans', Arial, sans-serif",
    margin: 0,
    padding: '40px 20px',
  },
  container: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    margin: '0 auto',
    maxWidth: '600px',
    overflow: 'hidden' as const,
  },
  header: {
    backgroundColor: colors.white,
    padding: '32px 40px 24px',
    textAlign: 'center' as const,
  },
  logo: {
    margin: '0 auto',
  },
  headerDivider: {
    borderColor: colors.primary,
    borderTop: `3px solid ${colors.primary}`,
    margin: '0 40px',
  },
  content: {
    padding: '32px 40px 40px',
  },
  // Footer Styles - Matching Landing Page
  footer: {
    backgroundColor: colors.navy,
    padding: '40px',
  },
  footerMain: {
    marginBottom: '24px',
  },
  footerLogo: {
    marginBottom: '16px',
  },
  footerDescription: {
    color: colors.textLight,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '14px',
    lineHeight: '1.6',
    margin: 0,
  },
  footerDivider: {
    borderColor: '#1e293b',
    margin: '24px 0',
  },
  footerContact: {
    marginBottom: '0',
  },
  footerColumn: {
    padding: '0 8px',
    verticalAlign: 'top' as const,
  },
  footerLabel: {
    color: colors.white,
    fontFamily: "'Urbanist', Arial, sans-serif",
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    margin: '0 0 4px',
    textTransform: 'uppercase' as const,
  },
  footerText: {
    color: colors.textLight,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    lineHeight: '1.4',
    margin: 0,
  },
  footerLink: {
    color: colors.primary,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '13px',
    textDecoration: 'none',
  },
  footerLinks: {
    textAlign: 'center' as const,
  },
  footerLinkSmall: {
    color: colors.textLight,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    textDecoration: 'none',
  },
  footerLinkSeparator: {
    color: '#374151',
    display: 'inline' as const,
    fontSize: '12px',
    margin: '0 8px',
  },
  copyright: {
    color: '#6b7280',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '12px',
    margin: '20px 0 4px',
    textAlign: 'center' as const,
  },
  madeWith: {
    color: '#4b5563',
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '11px',
    margin: 0,
    textAlign: 'center' as const,
  },
  // Unsubscribe section
  unsubscribe: {
    margin: '24px auto 0',
    maxWidth: '600px',
    textAlign: 'center' as const,
  },
  unsubscribeText: {
    color: colors.textMuted,
    fontFamily: "'DM Sans', Arial, sans-serif",
    fontSize: '11px',
    lineHeight: '1.5',
    margin: '0 0 4px',
  },
} as const;

export default EmailLayout;
