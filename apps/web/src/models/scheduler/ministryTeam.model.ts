import { BaseModel } from '@/models/base.model';

export type MinistryTeamRole = 'leader' | 'volunteer' | 'member';

export type MinistryTeamStatus = 'active' | 'inactive' | 'on_leave';

export interface MinistryTeam extends BaseModel {
  id: string;
  tenant_id: string;
  ministry_id: string;
  member_id: string;

  // Role in Ministry
  role: MinistryTeamRole;
  position?: string | null;

  // Status
  status: MinistryTeamStatus;
  joined_at: string;
}

export interface MinistryTeamWithMember extends MinistryTeam {
  member: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    contact_number?: string | null;
    profile_picture_url?: string | null;
  };
}

export interface MinistryTeamCreateInput {
  ministry_id: string;
  member_id: string;
  role?: MinistryTeamRole;
  position?: string | null;
  status?: MinistryTeamStatus;
}

export interface MinistryTeamUpdateInput {
  role?: MinistryTeamRole;
  position?: string | null;
  status?: MinistryTeamStatus;
}

export interface MinistryTeamView {
  id: string;
  ministryId: string;
  memberId: string;
  memberName: string;
  memberEmail?: string | null;
  memberPhone?: string | null;
  memberAvatarUrl?: string | null;
  role: MinistryTeamRole;
  roleLabel: string;
  position?: string | null;
  status: MinistryTeamStatus;
  statusLabel: string;
  joinedAt: Date;
}
