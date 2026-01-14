/**
 * ================================================================================
 * EMAIL TEMPLATE SERVICE
 * ================================================================================
 *
 * Service for rendering email templates with React Email.
 * Integrates with the notification system's EmailChannel.
 *
 * ================================================================================
 */

import 'server-only';
import * as React from 'react';
import { renderEmail } from '../render';
import { NotificationEmail } from '../templates/NotificationEmail';
import { WelcomeEmail } from '../templates/WelcomeEmail';
import { InviteEmail } from '../templates/InviteEmail';

/** Default base URL for email assets */
const DEFAULT_BASE_URL = 'https://stewardtrack.com';

export interface EmailRenderOptions {
  recipientName?: string;
  tenantName?: string;
  tenantLogoUrl?: string;
  /** Base URL for assets (logos, links). Defaults to https://stewardtrack.com */
  baseUrl?: string;
}

export interface NotificationEmailData {
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
  category?: string;
}

export interface WelcomeEmailData {
  recipientName: string;
  tenantName: string;
  loginUrl: string;
  tenantLogoUrl?: string;
  customMessage?: string;
  baseUrl?: string;
}

export interface InviteEmailData {
  recipientName?: string;
  inviterName: string;
  tenantName: string;
  roleName?: string;
  invitationUrl: string;
  tenantLogoUrl?: string;
  expiresIn?: string;
  personalMessage?: string;
  baseUrl?: string;
}

/**
 * Renders a notification email template to HTML.
 */
export async function renderNotificationEmail(
  data: NotificationEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(NotificationEmail, {
    recipientName: options.recipientName,
    title: data.title,
    body: data.body,
    actionUrl: data.actionUrl,
    actionLabel: data.actionLabel,
    tenantName: options.tenantName,
    tenantLogoUrl: options.tenantLogoUrl,
    category: data.category,
    baseUrl: options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders a welcome email template to HTML.
 */
export async function renderWelcomeEmail(
  data: WelcomeEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(WelcomeEmail, {
    recipientName: data.recipientName,
    tenantName: data.tenantName,
    tenantLogoUrl: data.tenantLogoUrl || options.tenantLogoUrl,
    loginUrl: data.loginUrl,
    customMessage: data.customMessage,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Renders an invite email template to HTML.
 */
export async function renderInviteEmail(
  data: InviteEmailData,
  options: EmailRenderOptions = {}
): Promise<string> {
  const element = React.createElement(InviteEmail, {
    recipientName: data.recipientName,
    inviterName: data.inviterName,
    tenantName: data.tenantName,
    tenantLogoUrl: data.tenantLogoUrl || options.tenantLogoUrl,
    roleName: data.roleName,
    invitationUrl: data.invitationUrl,
    expiresIn: data.expiresIn,
    personalMessage: data.personalMessage,
    baseUrl: data.baseUrl || options.baseUrl || DEFAULT_BASE_URL,
  });

  return await renderEmail(element);
}

/**
 * Template type for type-safe template selection.
 */
export type EmailTemplateType = 'notification' | 'welcome' | 'invite';

/**
 * Renders an email template by type.
 * Useful for dynamic template selection in the notification system.
 */
export async function renderEmailByType(
  templateType: EmailTemplateType,
  data: Record<string, unknown>,
  options: EmailRenderOptions = {}
): Promise<string> {
  switch (templateType) {
    case 'notification':
      return await renderNotificationEmail(
        data as unknown as NotificationEmailData,
        options
      );
    case 'welcome':
      return await renderWelcomeEmail(
        data as unknown as WelcomeEmailData,
        options
      );
    case 'invite':
      return await renderInviteEmail(
        data as unknown as InviteEmailData,
        options
      );
    default:
      throw new Error(`Unknown email template type: ${templateType}`);
  }
}
