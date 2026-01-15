/**
 * ================================================================================
 * EMAIL RENDER UTILITIES
 * ================================================================================
 *
 * Helper functions to render React Email templates to HTML strings.
 *
 * Usage:
 *   import { renderEmail } from '@/emails/render';
 *   import { NotificationEmail } from '@/emails';
 *
 *   const html = await renderEmail(
 *     <NotificationEmail title="Hello" body="World" />
 *   );
 *
 * ================================================================================
 */

import { render } from '@react-email/components';
import type { ReactElement } from 'react';

/**
 * Renders a React Email template to an HTML string.
 *
 * @param template - React Email component to render
 * @returns Promise<string> - Rendered HTML
 */
export async function renderEmail(template: ReactElement): Promise<string> {
  return await render(template);
}

/**
 * Renders a React Email template to plain text.
 *
 * @param template - React Email component to render
 * @returns Promise<string> - Rendered plain text
 */
export async function renderEmailText(template: ReactElement): Promise<string> {
  return await render(template, { plainText: true });
}
