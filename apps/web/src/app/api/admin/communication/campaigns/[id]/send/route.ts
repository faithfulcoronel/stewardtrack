/**
 * API Route: POST /api/admin/communication/campaigns/[id]/send
 *
 * Sends a campaign to its recipients.
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { getCurrentTenantId } from '@/lib/server/context';
import type { CommunicationService } from '@/services/communication/CommunicationService';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/admin/communication/campaigns/[id]/send
 *
 * Sends the campaign to all recipients
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const tenantId = await getCurrentTenantId();

    const communicationService = container.get<CommunicationService>(TYPES.CommunicationService);

    // Verify campaign exists and is in a sendable state
    const campaign = await communicationService.getCampaignById(id, tenantId);

    if (!campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        {
          success: false,
          error: `Campaign cannot be sent. Current status: ${campaign.status}`,
        },
        { status: 400 }
      );
    }

    // Send the campaign
    await communicationService.sendCampaign(id, tenantId);

    return NextResponse.json({
      success: true,
      message: 'Campaign is being sent',
    });
  } catch (error) {
    console.error('[Communication API] Error sending campaign:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send campaign',
      },
      { status: 500 }
    );
  }
}
