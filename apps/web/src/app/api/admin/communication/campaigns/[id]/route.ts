import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { RecipientService } from '@/services/communication/RecipientService';
import type { UpdateCampaignDto, CommunicationChannel } from '@/models/communication/campaign.model';

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
 * GET /api/admin/communication/campaigns/[id]
 *
 * Fetches a single campaign by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);
    const campaign = await communicationService.getCampaignById(id, tenantId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('[Communication API] Error fetching campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch campaign',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/communication/campaigns/[id]
 *
 * Updates a campaign with recipients
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();
    const body = await request.json();

    // Extract recipients from body (they're sent separately from the DTO)
    const recipients: RecipientInput[] = body.recipients || [];
    delete body.recipients; // Remove from DTO

    const campaignData: UpdateCampaignDto = body;

    console.log('[Communication API] Updating campaign with recipients:', {
      campaignId: id,
      recipientCount: recipients.length,
      recipients: recipients.map(r => ({ id: r.id, source: r.source, email: r.email, name: r.name })),
    });

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);
    const campaign = await communicationService.updateCampaign(id, campaignData, tenantId);

    // If recipients were provided, update them
    if (recipients.length > 0) {
      console.log('[Communication API] Updating recipients for campaign:', id);
      const recipientService = container.get<RecipientService>(TYPES.RecipientService);

      // Delete existing recipients first (replace strategy)
      await recipientService.deleteRecipientsByCampaign(id, tenantId);

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
      const channel: CommunicationChannel = campaignData.channels?.[0] || campaign.channels?.[0] || 'email';

      // Add member recipients
      if (memberIds.length > 0) {
        await recipientService.prepareRecipientsForCampaign(
          id,
          { source: 'members', memberIds },
          channel,
          tenantId
        );
        console.log(`[Communication API] Added ${memberIds.length} member recipients`);
      }

      // Add manual/external recipients
      if (manualContacts.length > 0) {
        await recipientService.prepareRecipientsForCampaign(
          id,
          { source: 'manual', manualContacts },
          channel,
          tenantId
        );
        console.log(`[Communication API] Added ${manualContacts.length} manual recipients`);
      }
    }

    return NextResponse.json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    console.error('[Communication API] Error updating campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update campaign',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/communication/campaigns/[id]
 *
 * Deletes a campaign
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);
    await communicationService.deleteCampaign(id, tenantId);

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('[Communication API] Error deleting campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete campaign',
      },
      { status: 500 }
    );
  }
}
