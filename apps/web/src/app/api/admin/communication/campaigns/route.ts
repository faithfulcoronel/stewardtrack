import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId, getCurrentUserId } from '@/lib/server/context';
import { PermissionGate } from '@/lib/access-gate';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { RecipientService } from '@/services/communication/RecipientService';
import type { CreateCampaignDto, CommunicationChannel } from '@/models/communication/campaign.model';

interface RecipientInput {
  id: string;
  /**
   * Source type from RecipientSelector:
   * - 'member': Individual member selection
   * - 'family', 'event', 'ministry', 'list': Members from groups (still member IDs)
   * - 'external': Manually entered contact (non-member)
   */
  source: 'member' | 'family' | 'event' | 'ministry' | 'list' | 'external';
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * GET /api/admin/communication/campaigns
 *
 * Fetches all campaigns for the current tenant
 * @requires communication:view permission
 */
export async function GET(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:view', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status') || undefined;
    const campaign_type = searchParams.get('campaign_type') || undefined;
    const channel = searchParams.get('channel') || undefined;

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);

    const campaigns = await communicationService.getCampaigns(tenantId, {
      status: status as any,
      campaign_type: campaign_type as any,
      channel: channel as any,
    });

    return NextResponse.json({
      success: true,
      data: campaigns,
    });
  } catch (error) {
    console.error('[Communication API] Error fetching campaigns:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch campaigns',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/communication/campaigns
 *
 * Creates a new campaign with recipients
 * @requires communication:manage permission
 */
export async function POST(request: NextRequest) {
  try {
    const tenantId = await getCurrentTenantId();
    const userId = await getCurrentUserId();

    // Check permission using PermissionGate (single source of truth)
    const permissionGate = new PermissionGate('communication:manage', 'all');
    const accessResult = await permissionGate.check(userId, tenantId);

    if (!accessResult.allowed) {
      return NextResponse.json(
        { success: false, error: accessResult.reason || 'Permission denied' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Extract recipients from body (they're sent separately from the DTO)
    const recipients: RecipientInput[] = body.recipients || [];
    delete body.recipients; // Remove from DTO

    const campaignData: CreateCampaignDto = body;

    // Basic validation
    if (!campaignData.name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    if (!campaignData.channels || campaignData.channels.length === 0) {
      campaignData.channels = ['email']; // Default to email
    }

    if (!campaignData.campaign_type) {
      campaignData.campaign_type = 'bulk'; // Default to bulk
    }

    console.log('[Communication API] Creating campaign with recipients:', {
      name: campaignData.name,
      channels: campaignData.channels,
      recipientCount: recipients.length,
      recipients: recipients.map(r => ({ id: r.id, source: r.source, email: r.email, name: r.name })),
    });

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);
    const campaign = await communicationService.createCampaign(campaignData, tenantId);

    // If recipients were provided, add them to the campaign
    if (recipients.length > 0) {
      console.log('[Communication API] Adding recipients to campaign:', campaign.id);
      const recipientService = container.get<RecipientService>(TYPES.RecipientService);

      // Separate member IDs and manual contacts
      const memberIds: string[] = [];
      const manualContacts: Array<{ email?: string; phone?: string; name?: string }> = [];

      for (const r of recipients) {
        if (r.source === 'external') {
          // External/manual contact - non-member
          manualContacts.push({
            email: r.email,
            phone: r.phone,
            name: r.name,
          });
        } else {
          // All other sources (member, family, event, ministry, list) are member IDs
          memberIds.push(r.id);
        }
      }

      console.log('[Communication API] Separated recipients:', {
        memberIds,
        manualContacts,
      });

      // Determine channel
      const channel: CommunicationChannel = campaignData.channels[0] || 'email';

      // Add member recipients
      if (memberIds.length > 0) {
        await recipientService.prepareRecipientsForCampaign(
          campaign.id,
          { source: 'members', memberIds },
          channel,
          tenantId
        );
        console.log(`[Communication API] Added ${memberIds.length} member recipients`);
      }

      // Add manual/external recipients
      if (manualContacts.length > 0) {
        await recipientService.prepareRecipientsForCampaign(
          campaign.id,
          { source: 'manual', manualContacts },
          channel,
          tenantId
        );
        console.log(`[Communication API] Added ${manualContacts.length} manual recipients`);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: campaign,
        id: campaign.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Communication API] Error creating campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create campaign',
      },
      { status: 500 }
    );
  }
}
