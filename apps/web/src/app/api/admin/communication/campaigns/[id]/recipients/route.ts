/**
 * API Route: /api/admin/communication/campaigns/[id]/recipients
 *
 * Manages recipients for a campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import type { CommunicationService } from '@/services/communication/CommunicationService';
import type { RecipientService } from '@/services/communication/RecipientService';
import type { RecipientCriteria, CommunicationChannel } from '@/models/communication/campaign.model';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/communication/campaigns/[id]/recipients
 *
 * Get all recipients for a campaign
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();

    const recipientService = container.get<RecipientService>(TYPES.RecipientService);

    const recipients = await recipientService.getRecipientsByCampaign(id, tenantId);
    const counts = await recipientService.getRecipientCounts(id);

    return NextResponse.json({
      success: true,
      data: {
        recipients,
        counts,
      },
    });
  } catch (error) {
    console.error('[Communication API] Error fetching recipients:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch recipients',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/communication/campaigns/[id]/recipients
 *
 * Add recipients to a campaign based on criteria
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();
    const body = await request.json();

    console.log('[Communication API] Adding recipients to campaign:', id);
    console.log('[Communication API] Request body:', JSON.stringify(body, null, 2));

    const { criteria, channel } = body as {
      criteria: RecipientCriteria;
      channel: CommunicationChannel;
    };

    if (!criteria) {
      return NextResponse.json(
        { success: false, error: 'Recipient criteria is required' },
        { status: 400 }
      );
    }

    if (!channel) {
      return NextResponse.json(
        { success: false, error: 'Channel is required' },
        { status: 400 }
      );
    }

    // Verify campaign exists
    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);
    const campaign = await communicationService.getCampaignById(id, tenantId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Prepare recipients
    const recipientService = container.get<RecipientService>(TYPES.RecipientService);
    const recipients = await recipientService.prepareRecipientsForCampaign(
      id,
      criteria,
      channel,
      tenantId
    );

    console.log(`[Communication API] Added ${recipients.length} recipients to campaign ${id}`);

    return NextResponse.json({
      success: true,
      data: {
        count: recipients.length,
        recipients,
      },
    });
  } catch (error) {
    console.error('[Communication API] Error adding recipients:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add recipients',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/communication/campaigns/[id]/recipients
 *
 * Remove all recipients from a campaign (useful for re-selecting)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();

    const recipientService = container.get<RecipientService>(TYPES.RecipientService);
    await recipientService.deleteRecipientsByCampaign(id, tenantId);

    return NextResponse.json({
      success: true,
      message: 'All recipients removed from campaign',
    });
  } catch (error) {
    console.error('[Communication API] Error deleting recipients:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete recipients',
      },
      { status: 500 }
    );
  }
}
