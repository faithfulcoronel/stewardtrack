import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { LicensingService } from '@/services/LicensingService';
import { getServerSession } from '@/lib/authUtils';

/**
 * POST /api/licensing/assign-license
 *
 * Manually assigns a product offering to a tenant
 *
 * Request Body:
 * - tenantId: string - The tenant to assign the license to
 * - offeringId: string - The product offering to assign
 * - notes?: string - Optional notes about the assignment
 *
 * Response:
 * - success: boolean
 * - message: string
 * - data?: AssignmentResult
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { tenantId, offeringId, notes } = body;

    // Validate required fields
    if (!tenantId || !offeringId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: tenantId and offeringId are required',
        },
        { status: 400 }
      );
    }

    // Get the licensing service
    const licensingService = container.get<LicensingService>(TYPES.LicensingService);

    // Assign the license
    const result = await licensingService.assignLicenseToTenant(
      tenantId,
      offeringId,
      session.user.id,
      notes
    );

    return NextResponse.json({
      success: true,
      message: 'License assigned successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error assigning license:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign license',
      },
      { status: 500 }
    );
  }
}
