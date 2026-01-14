/**
 * ================================================================================
 * EMAIL TEMPLATES BARREL EXPORT
 * ================================================================================
 *
 * Central export for all email templates and components.
 *
 * Usage:
 *   import { NotificationEmail, WelcomeEmail, InviteEmail } from '@/emails';
 *   import { renderEmail } from '@/emails';
 *
 * ================================================================================
 */

// Components
export { EmailLayout } from './components/EmailLayout';
export { EmailButton } from './components/EmailButton';

// Templates
export { NotificationEmail } from './templates/NotificationEmail';
export type { NotificationEmailProps } from './templates/NotificationEmail';

export { WelcomeEmail } from './templates/WelcomeEmail';
export type { WelcomeEmailProps } from './templates/WelcomeEmail';

export { InviteEmail } from './templates/InviteEmail';
export type { InviteEmailProps } from './templates/InviteEmail';

// Service exports
export {
  renderNotificationEmail,
  renderWelcomeEmail,
  renderInviteEmail,
  renderEmailByType,
} from './service/EmailTemplateService';
export type {
  EmailRenderOptions,
  NotificationEmailData,
  WelcomeEmailData,
  InviteEmailData,
  EmailTemplateType,
} from './service/EmailTemplateService';

// Render utility
export { renderEmail, renderEmailText } from './render';
