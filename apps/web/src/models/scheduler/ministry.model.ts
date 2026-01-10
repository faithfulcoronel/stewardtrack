import { BaseModel } from '@/models/base.model';

export type MinistryCategory =
  | 'worship'
  | 'education'
  | 'outreach'
  | 'fellowship'
  | 'support'
  | 'general';

export interface Ministry extends BaseModel {
  id: string;
  tenant_id: string;

  // Basic Information
  name: string;
  code: string;
  description?: string | null;
  category: MinistryCategory;

  // Leadership
  leader_id?: string | null;

  // Appearance
  color: string;
  icon: string;

  // Status
  is_active: boolean;
  sort_order: number;
}

export interface MinistryWithLeader extends Ministry {
  leader?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string | null;
  } | null;
}

export interface MinistryWithTeam extends MinistryWithLeader {
  team_count: number;
  schedule_count: number;
}

export interface MinistryCreateInput {
  name: string;
  code: string;
  description?: string | null;
  category?: MinistryCategory;
  leader_id?: string | null;
  color?: string;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface MinistryUpdateInput {
  name?: string;
  code?: string;
  description?: string | null;
  category?: MinistryCategory;
  leader_id?: string | null;
  color?: string;
  icon?: string;
  is_active?: boolean;
  sort_order?: number;
}

export interface MinistryFilters {
  category?: MinistryCategory;
  isActive?: boolean;
  leaderId?: string;
  search?: string;
}

export interface MinistryView {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  category: MinistryCategory;
  categoryLabel: string;
  leaderName?: string | null;
  color: string;
  icon: string;
  isActive: boolean;
  teamCount: number;
  scheduleCount: number;
}
