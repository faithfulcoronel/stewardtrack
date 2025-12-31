/**
 * ================================================================================
 * PUSH DEVICE TOKEN BY TOKEN API ROUTES
 * ================================================================================
 *
 * API endpoints for managing a specific FCM device token.
 *
 * DELETE /api/notifications/device-tokens/[token] - Unregister a specific token
 *
 * ================================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IPushDeviceTokenService } from '@/services/PushDeviceTokenService';
import { authUtils } from '@/utils/authUtils';

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

/**
 * DELETE /api/notifications/device-tokens/[token]
 * Unregister a specific device token
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { token } = await params;

    // URL decode the token (FCM tokens can contain special characters)
    const decodedToken = decodeURIComponent(token);

    const tokenService = container.get<IPushDeviceTokenService>(TYPES.IPushDeviceTokenService);
    const success = await tokenService.unregisterToken(user.id, decodedToken);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Token not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Device token unregistered successfully' },
    });
  } catch (error) {
    console.error('[DELETE /api/notifications/device-tokens/[token]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to unregister device token' },
      { status: 500 }
    );
  }
}
