import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function GET() {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const users = await userMemberLinkService.searchUsers('', 'all');

    const transformedUsers = users.map(user => ({
      id: user.id,
      username: user.email || user.id, // Use email as username, fallback to ID if no email
      email: user.email || '',
      name: user.first_name && user.last_name
        ? `${user.first_name} ${user.last_name}`.trim()
        : user.email || user.id, // Fallback to email or ID if no name
      first_name: user.first_name,
      last_name: user.last_name,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      is_linked: user.is_linked,
      member_id: user.is_linked ? undefined : null,
      member_name: user.linked_member_name || null
    }));

    return NextResponse.json({ success: true, data: transformedUsers });

  } catch (error) {
    console.error('Error fetching unlinked users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}