import { NextResponse } from 'next/server';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import { UserMemberLinkService } from '@/services/UserMemberLinkService';

export async function GET() {
  try {
    const userMemberLinkService = container.get<UserMemberLinkService>(TYPES.UserMemberLinkService);

    const dashboardStats = await userMemberLinkService.getDashboardStats();

    const stats = {
      total_users: dashboardStats.linking.total_users,
      linked_users: dashboardStats.linking.linked_users,
      total_members: dashboardStats.linking.total_members,
      linked_members: dashboardStats.linking.linked_members,
      pending_invitations: dashboardStats.invitations.pending_invitations,
      accepted_invitations: dashboardStats.invitations.accepted_invitations,
      linking_progress: dashboardStats.linking.linking_percentage
    };

    return NextResponse.json({ success: true, data: stats });

  } catch (error) {
    console.error('Error fetching user-member stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}