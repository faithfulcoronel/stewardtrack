import { BaseModel } from '@/models/base.model';

export type AssignmentStatus = 'pending' | 'confirmed' | 'declined' | 'no_show';

export interface ScheduleTeamAssignment extends BaseModel {
  id: string;
  tenant_id: string;
  occurrence_id: string;

  // Assignment
  member_id?: string | null;
  assigned_role: string;

  // Ad-hoc Volunteer
  is_adhoc: boolean;
  volunteer_name?: string | null;
  volunteer_contact?: string | null;

  // Confirmation Status
  status: AssignmentStatus;
  confirmed_at?: string | null;
  declined_reason?: string | null;
}

export interface ScheduleTeamAssignmentWithMember extends ScheduleTeamAssignment {
  member?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  } | null;
}

export interface ScheduleTeamAssignmentCreateInput {
  occurrence_id: string;
  member_id?: string | null;
  assigned_role: string;
  is_adhoc?: boolean;
  volunteer_name?: string | null;
  volunteer_contact?: string | null;
  status?: AssignmentStatus;
}

export interface ScheduleTeamAssignmentUpdateInput {
  member_id?: string | null;
  assigned_role?: string;
  is_adhoc?: boolean;
  volunteer_name?: string | null;
  volunteer_contact?: string | null;
  status?: AssignmentStatus;
  confirmed_at?: string | null;
  declined_reason?: string | null;
}

export interface ScheduleTeamAssignmentView {
  id: string;
  occurrenceId: string;
  memberId?: string | null;
  memberName?: string | null;
  memberEmail?: string | null;
  memberPhone?: string | null;
  memberAvatarUrl?: string | null;
  assignedRole: string;
  isAdhoc: boolean;
  volunteerName?: string | null;
  volunteerContact?: string | null;
  displayName: string; // member name or volunteer name
  status: AssignmentStatus;
  statusLabel: string;
  confirmedAt?: Date | null;
  declinedReason?: string | null;
}
