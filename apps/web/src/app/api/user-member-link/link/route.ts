import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function POST(request: Request) {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);
    const body = await request.json();

    const { user_id, member_id } = body;

    if (!user_id || !member_id) {
      return NextResponse.json({ error: 'user_id and member_id are required' }, { status: 400 });
    }

    const result = await userMemberLinkService.linkUserToMember(
      {
        user_id,
        member_id
      },
      'system' // TODO: Get from authentication layer
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to link user to member' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'User linked to member successfully'
    });

  } catch (error) {
    console.error('Error linking user to member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}