import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// POST /api/user-member-link/validate - Validate linking operation and detect conflicts
export async function POST(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const { user_id, member_id } = body;

    if (!user_id || !member_id) {
      return NextResponse.json(
        { error: 'user_id and member_id are required' },
        { status: 400 }
      );
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const validation = await userMemberLinkService.validateLinkingOperation(
      user_id,
      member_id,
      tenantId
    );

    return NextResponse.json(validation);
  } catch (error) {
    console.error('Error validating linking operation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}