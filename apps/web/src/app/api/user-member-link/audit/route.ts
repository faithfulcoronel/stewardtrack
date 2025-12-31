import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';
import { authUtils } from '@/utils/authUtils';
import { tenantUtils } from '@/utils/tenantUtils';

// GET /api/user-member-link/audit - Get audit trail for user-member linking activities
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const userId = searchParams.get('user_id') || undefined;
    const memberId = searchParams.get('member_id') || undefined;
    const action = searchParams.get('action') || undefined;
    const dateFrom = searchParams.get('date_from') || undefined;
    const dateTo = searchParams.get('date_to') || undefined;

    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const auditEntries = await userMemberLinkService.getAuditTrail(
      tenantId,
      Math.min(limit, 100), // Cap at 100 for performance
      offset,
      {
        user_id: userId,
        member_id: memberId,
        action,
        date_from: dateFrom,
        date_to: dateTo
      }
    );

    return NextResponse.json({
      audit_entries: auditEntries,
      limit,
      offset,
      filters: {
        user_id: userId,
        member_id: memberId,
        action,
        date_from: dateFrom,
        date_to: dateTo
      }
    });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}