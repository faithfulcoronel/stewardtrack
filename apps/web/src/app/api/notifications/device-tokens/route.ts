/**
 * ================================================================================
 * PUSH DEVICE TOKEN API ROUTES
 * ================================================================================
 *
 * API endpoints for managing FCM device tokens for push notifications.
 *
 * POST /api/notifications/device-tokens - Register a new device token
 * GET /api/notifications/device-tokens - Get user's device tokens
 * DELETE /api/notifications/device-tokens - Delete all user's device tokens
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IPushDeviceTokenService } from '@/services/PushDeviceTokenService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';
import type { CreatePushDeviceTokenDto, DeviceType } from '@/models/notification/pushDeviceToken.model';

/**
 * POST /api/notifications/device-tokens
 * Register a new device token for push notifications
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'No tenant context' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.token) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: token' },
        { status: 400 }
      );
    }

    // Validate device type
    const validDeviceTypes: DeviceType[] = ['web', 'ios', 'android'];
    const deviceType = body.device_type || 'web';
    if (!validDeviceTypes.includes(deviceType)) {
      return NextResponse.json(
        { success: false, error: `Invalid device_type. Must be one of: ${validDeviceTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const dto: CreatePushDeviceTokenDto = {
      token: body.token,
      device_type: deviceType,
      device_name: body.device_name,
      browser_info: body.browser_info,
    };

    const tokenService = container.get<IPushDeviceTokenService>(TYPES.IPushDeviceTokenService);
    const deviceToken = await tokenService.registerToken(user.id, tenantId, dto);

    return NextResponse.json({
      success: true,
      data: deviceToken,
    });
  } catch (error) {
    console.error('[POST /api/notifications/device-tokens] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register device token' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/device-tokens
 * Get all device tokens for the current user
 */
export async function GET() {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tokenService = container.get<IPushDeviceTokenService>(TYPES.IPushDeviceTokenService);
    const tokens = await tokenService.getAllTokens(user.id);

    return NextResponse.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('[GET /api/notifications/device-tokens] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch device tokens' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/device-tokens
 * Delete all device tokens for the current user (logout from all devices)
 */
export async function DELETE() {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tokenService = container.get<IPushDeviceTokenService>(TYPES.IPushDeviceTokenService);
    const deletedCount = await tokenService.clearAllTokens(user.id);

    return NextResponse.json({
      success: true,
      data: { deleted_count: deletedCount },
    });
  } catch (error) {
    console.error('[DELETE /api/notifications/device-tokens] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete device tokens' },
      { status: 500 }
    );
  }
}
