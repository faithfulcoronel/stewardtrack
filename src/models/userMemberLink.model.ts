import { BaseModel } from './base.model';
import { Member } from './member.model';

export interface UserMemberLink {
  user_id: string;
  member_id: string;
  linked_at: string;
  linked_by: string;
}

export interface UserMemberLinkAudit extends BaseModel {
  tenant_id: string;
  user_id?: string;
  member_id?: string;
  action: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  performed_by: string;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
}

export interface LinkUserToMemberDto {
  user_id: string;
  member_id: string;
  notes?: string;
}

export interface UnlinkUserFromMemberDto {
  member_id: string;
  notes?: string;
}

export interface LinkingResult {
  success: boolean;
  message?: string;
  error?: string;
  error_code?: string;
  linked_at?: string;
  unlinked_user_id?: string;
  existing_member?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

// Extended member model with user information
export interface MemberWithUser extends Member {
  user?: {
    id: string;
    email: string;
    last_sign_in_at?: string;
    created_at: string;
  };
}

// For member search and selection
export interface MemberSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  contact_number: string;
  membership_status: string;
  is_linked: boolean;
  linked_user_email?: string;
  linked_at?: string;
}

// For user search and selection
export interface UserSearchResult {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  last_sign_in_at?: string;
  created_at: string;
  is_linked: boolean;
  linked_member_name?: string;
  linked_at?: string;
}

// For bulk linking operations
export interface BulkLinkRequest {
  links: {
    user_id: string;
    member_id: string;
  }[];
  notes?: string;
}

export interface BulkLinkResult {
  successful_links: {
    user_id: string;
    member_id: string;
    linked_at: string;
  }[];
  failed_links: {
    user_id: string;
    member_id: string;
    error: string;
    error_code: string;
  }[];
  total_processed: number;
  success_count: number;
  failure_count: number;
}

// For linking statistics and dashboard
export interface LinkingStats {
  total_members: number;
  linked_members: number;
  unlinked_members: number;
  total_users: number;
  linked_users: number;
  unlinked_users: number;
  linking_percentage: number;
  recent_links_count: number;
  pending_invitations: number;
}

// For validation and conflict detection
export interface LinkingConflict {
  type: 'user_already_linked' | 'member_already_linked' | 'email_mismatch';
  user_id?: string;
  member_id?: string;
  existing_link?: {
    user_id: string;
    member_id: string;
    linked_at: string;
  };
  suggested_action: string;
}

// For audit trail display
export interface LinkingAuditEntry {
  id: string;
  action: string;
  user_email?: string;
  member_name?: string;
  performed_by_name: string;
  created_at: string;
  notes?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}