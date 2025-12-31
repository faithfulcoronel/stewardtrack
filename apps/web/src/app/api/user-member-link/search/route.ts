import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// GET /api/user-member-link/search - Search members and users for linking
export async function GET(request: NextRequest) {
  try {
    const user = await authUtils.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = await tenantUtils.getTenantId();
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const type = searchParams.get('type') || 'members'; // 'members' or 'users'
    const linkedStatus = searchParams.get('linked') as 'linked' | 'unlinked' | 'all' | null;

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    let results;
    if (type === 'users') {
      results = await userMemberLinkService.searchUsers(
        query,
        linkedStatus || 'all',
        tenantId
      );
    } else {
      results = await userMemberLinkService.searchMembers(
        query,
        linkedStatus || 'all',
        tenantId
      );
    }

    return NextResponse.json({
      results,
      query,
      type,
      linked_status: linkedStatus || 'all'
    });
  } catch (error) {
    console.error('Error searching for linking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}