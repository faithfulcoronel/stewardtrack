/**
 * ================================================================================
 * NEW TEMPLATE PAGE
 * ================================================================================
 *
 * Create a new message template for communication campaigns.
 *
 * ================================================================================
 */

import type { Metadata } from 'next';
import { TemplateEditor } from '@/components/dynamic/admin/communication/TemplateEditor';

export const metadata: Metadata = {
  title: 'Create Template | Communication | StewardTrack',
  description: 'Create a new message template',
};

export default function NewTemplatePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <TemplateEditor mode="create" />
    </div>
  );
}
