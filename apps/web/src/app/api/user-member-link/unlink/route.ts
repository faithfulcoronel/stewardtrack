import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function POST(request: Request) {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const body = await request.json();

    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Get the linked member first to identify which member to unlink
    const linkedMember = await userMemberLinkService.getMemberByUserId(user_id);

    if (!linkedMember) {
      return NextResponse.json({ error: 'No linked member found for this user' }, { status: 404 });
    }

    const result = await userMemberLinkService.unlinkUserFromMember(
      { member_id: linkedMember.id },
      'system' // TODO: Get from authentication layer
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to unlink user from member' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'User unlinked from member successfully',
      member: {
        id: linkedMember.id,
        name: `${linkedMember.first_name} ${linkedMember.last_name}`
      }
    });

  } catch (error) {
    console.error('Error unlinking user from member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}