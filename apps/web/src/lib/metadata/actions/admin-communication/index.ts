/**
 * Admin Communication Module - Action Handlers
 *
 * This file exports all action handlers for the admin-communication module.
 * Action handlers execute mutations and return results to the client.
 */

import type { MetadataActionExecution, MetadataActionResult } from '../types';
import { adminCommunicationHandlers } from '@/lib/metadata/services/admin-communication';

// ==================== HELPER FUNCTIONS ====================

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function buildRedirectUrl(
  template: string | null,
  context: Record<string, unknown>
): string | null {
  if (!template) {
    return null;
  }

  let missing = false;
  const rendered = template.replace(/{{\s*([^}]+?)\s*}}/g, (_, expression: string) => {
    const value = resolvePath(context, expression.trim());
    if (value === undefined || value === null) {
      missing = true;
      return '';
    }
    const asString = String(value);
    if (!asString) {
      missing = true;
    }
    return asString;
  });

  if (missing) {
    return null;
  }

  return rendered;
}

function resolvePath(source: Record<string, unknown>, path: string): unknown {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  let current: unknown = source;
  for (const segment of segments) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

// ==================== CAMPAIGN ACTIONS ====================

/**
 * Handle save campaign (draft)
 */
async function handleSaveCampaign(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminCommunicationHandlers['admin-communication.campaigns.save'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-communication.campaigns.save');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; campaignId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to save campaign.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      campaignId: result.campaignId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      result.redirectUrl ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Campaign saved successfully.',
      redirectUrl,
      data: { campaignId: result.campaignId },
    };
  } catch (error) {
    console.error('[handleSaveCampaign] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save campaign. Please try again.',
      errors: {},
    };
  }
}

/**
 * Handle send campaign
 */
async function handleSendCampaign(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  const serviceHandler = adminCommunicationHandlers['admin-communication.campaigns.send'];
  if (!serviceHandler) {
    throw new Error('Service handler not found: admin-communication.campaigns.send');
  }

  try {
    const result = (await serviceHandler({
      params: payload,
      context: execution.context,
    })) as { success: boolean; message: string; campaignId?: string; redirectUrl?: string };

    if (!result.success) {
      return {
        success: false,
        status: 400,
        message: result.message || 'Failed to send campaign.',
        errors: {},
      };
    }

    const context: Record<string, unknown> = {
      campaignId: result.campaignId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      result.redirectUrl ??
      null;
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: result.message || 'Campaign sent successfully.',
      redirectUrl,
      data: { campaignId: result.campaignId },
    };
  } catch (error) {
    console.error('[handleSendCampaign] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to send campaign. Please try again.',
      errors: {},
    };
  }
}

/**
 * Handle delete campaign
 */
async function handleDeleteCampaign(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;
  const campaignId = payload.campaignId as string;

  if (!campaignId) {
    return {
      success: false,
      status: 400,
      message: 'Campaign ID is required.',
      errors: {},
    };
  }

  try {
    // Import the campaign service directly for delete operation
    const { container } = await import('@/lib/container');
    const { TYPES } = await import('@/lib/types');
    const { getCurrentTenantId } = await import('@/lib/server/context');
    const { CampaignService } = await import('@/services/communication/CampaignService');

    const tenantId = await getCurrentTenantId();
    if (!tenantId) {
      return {
        success: false,
        status: 401,
        message: 'No tenant context available.',
        errors: {},
      };
    }

    const campaignService = container.get<CampaignService>(TYPES.CommCampaignService);
    await campaignService.deleteCampaign(campaignId, tenantId);

    return {
      success: true,
      status: 200,
      message: 'Campaign deleted successfully.',
      redirectUrl: '/admin/communication/campaigns',
    };
  } catch (error) {
    console.error('[handleDeleteCampaign] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete campaign. Please try again.',
      errors: {},
    };
  }
}

// ==================== TEMPLATE ACTIONS ====================

/**
 * Handle save template
 */
async function handleSaveTemplate(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const config = execution.config ?? {};
  const payload = execution.input as Record<string, unknown>;

  try {
    // Import the template service directly
    const { container } = await import('@/lib/container');
    const { TYPES } = await import('@/lib/types');

    const tenantService = container.get(TYPES.TenantService) as { getCurrentTenant(): Promise<{ id: string } | null> };
    const templateService = container.get(TYPES.CommTemplateService) as {
      create(data: Record<string, unknown>, tenantId: string): Promise<{ id: string }>;
      update(id: string, data: Record<string, unknown>, tenantId: string): Promise<void>;
    };

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        status: 401,
        message: 'No tenant context available.',
        errors: {},
      };
    }

    const values = (payload.values ?? payload) as Record<string, unknown>;
    const templateId = values.id as string | undefined;

    const templateData = {
      name: values.name as string,
      description: values.description as string | undefined,
      category: values.category as string,
      channels: (values.channels as string[]) || ['email'],
      subject: values.subject as string | undefined,
      content_html: values.content_html as string | undefined,
      content_text: values.content_text as string | undefined,
      variables: values.variables as Record<string, unknown>[] | undefined,
    };

    let savedTemplateId = templateId;

    if (templateId) {
      await templateService.update(templateId, templateData, tenant.id);
    } else {
      const newTemplate = await templateService.create(templateData, tenant.id);
      savedTemplateId = newTemplate.id;
    }

    const context: Record<string, unknown> = {
      templateId: savedTemplateId,
      params: execution.context.params,
      data: payload,
    };

    const redirectTemplate =
      toOptionalString(config.redirectUrl) ??
      toOptionalString(config.redirectTemplate) ??
      '/admin/communication/templates';
    const redirectUrl = buildRedirectUrl(redirectTemplate, context);

    return {
      success: true,
      status: 200,
      message: templateId ? 'Template updated successfully.' : 'Template created successfully.',
      redirectUrl,
      data: { templateId: savedTemplateId },
    };
  } catch (error) {
    console.error('[handleSaveTemplate] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to save template. Please try again.',
      errors: {},
    };
  }
}

/**
 * Handle delete template
 */
async function handleDeleteTemplate(
  execution: MetadataActionExecution
): Promise<MetadataActionResult> {
  const payload = execution.input as Record<string, unknown>;
  const templateId = payload.templateId as string;

  if (!templateId) {
    return {
      success: false,
      status: 400,
      message: 'Template ID is required.',
      errors: {},
    };
  }

  try {
    const { container } = await import('@/lib/container');
    const { TYPES } = await import('@/lib/types');

    const tenantService = container.get(TYPES.TenantService) as { getCurrentTenant(): Promise<{ id: string } | null> };
    const templateService = container.get(TYPES.CommTemplateService) as {
      delete(id: string, tenantId: string): Promise<void>;
    };

    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      return {
        success: false,
        status: 401,
        message: 'No tenant context available.',
        errors: {},
      };
    }

    await templateService.delete(templateId, tenant.id);

    return {
      success: true,
      status: 200,
      message: 'Template deleted successfully.',
      redirectUrl: '/admin/communication/templates',
    };
  } catch (error) {
    console.error('[handleDeleteTemplate] Failed:', error);
    return {
      success: false,
      status: 500,
      message: 'Failed to delete template. Please try again.',
      errors: {},
    };
  }
}

// ==================== EXPORT ACTION HANDLERS ====================

export const adminCommunicationActionHandlers: Record<
  string,
  (execution: MetadataActionExecution) => Promise<MetadataActionResult>
> = {
  // Campaign actions
  'admin-communication.campaigns.save': handleSaveCampaign,
  'admin-communication.campaigns.send': handleSendCampaign,
  'admin-communication.campaigns.delete': handleDeleteCampaign,

  // Template actions
  'admin-communication.templates.save': handleSaveTemplate,
  'admin-communication.templates.delete': handleDeleteTemplate,
};
