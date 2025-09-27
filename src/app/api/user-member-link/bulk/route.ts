import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// POST /api/user-member-link/bulk - Bulk link users to members
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
    const { links, notes } = body;

    if (!Array.isArray(links) || links.length === 0) {
      return NextResponse.json(
        { error: 'links array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate each link object
    for (const link of links) {
      if (!link.user_id || !link.member_id) {
        return NextResponse.json(
          { error: 'Each link must have user_id and member_id' },
          { status: 400 }
        );
      }
    }

    // Limit bulk operations to prevent abuse
    if (links.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 links allowed per bulk operation' },
        { status: 400 }
      );
    }

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const result = await userMemberLinkService.bulkLinkUsers(
      { links, notes },
      user.id
      tenantId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error bulk linking users to members:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}