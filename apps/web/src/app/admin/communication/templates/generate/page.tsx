/**
 * ================================================================================
 * AI TEMPLATE GENERATOR PAGE
 * ================================================================================
 *
 * Create message templates using AI-powered generation.
 *
 * ================================================================================
 */

import type { Metadata } from 'next';
import { TemplateEditor } from '@/components/dynamic/admin/communication/TemplateEditor';

export const metadata: Metadata = {
  title: 'AI Template Generator | Communication | StewardTrack',
  description: 'Generate message templates with AI',
};

export default function AIGenerateTemplatePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <TemplateEditor mode="ai-generate" />
    </div>
  );
}
