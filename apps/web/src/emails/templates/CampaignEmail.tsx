/**
 * ================================================================================
 * CAMPAIGN EMAIL TEMPLATE
 * ================================================================================
 *
 * Email template for communication campaigns. Wraps custom campaign content
 * in the standard EmailLayout with header and footer.
 *
 * ================================================================================
 */

import * as React from 'react';
import { EmailLayout } from '../components/EmailLayout';

export interface CampaignEmailProps {
  /** Email preview text */
  preview?: string;
  /** Email subject (used as fallback preview) */
  subject?: string;
  /** Custom HTML content for the campaign */
  contentHtml: string;
  /** Tenant/church name */
  tenantName?: string;
  /** Tenant logo URL */
  tenantLogoUrl?: string;
  /** Base URL for assets */
  baseUrl?: string;
}

export function CampaignEmail({
  preview,
  subject,
  contentHtml,
  tenantName,
  tenantLogoUrl,
  baseUrl,
}: CampaignEmailProps) {
  const previewText = preview || subject || 'Message from your church';

  return (
    <EmailLayout
      preview={previewText}
      tenantName={tenantName}
      tenantLogoUrl={tenantLogoUrl}
      baseUrl={baseUrl}
    >
      {/* Render the custom HTML content */}
      <div dangerouslySetInnerHTML={{ __html: contentHtml }} />
    </EmailLayout>
  );
}

export default CampaignEmail;
