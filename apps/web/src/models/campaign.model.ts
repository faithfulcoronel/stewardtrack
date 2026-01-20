import { BaseModel } from '@/models/base.model';
import type { Fund } from '@/models/fund.model';

// Campaign status enum
export type CampaignStatus = 'draft' | 'active' | 'completed' | 'cancelled';

/**
 * Campaign model
 * Represents a giving campaign with goals and tracking
 */
export interface Campaign extends BaseModel {
  id: string;
  tenant_id: string;

  // Campaign Details
  name: string;
  description: string | null;
  goal_amount: number | null;
  fund_id: string | null;
  fund?: Fund;

  // Timeline
  start_date: string;
  end_date: string | null;

  // Status
  status: CampaignStatus;

  // Progress (calculated)
  total_raised: number;
  donor_count: number;
}

/**
 * DTO for creating a new campaign
 */
export interface CreateCampaignDto {
  name: string;
  description?: string;
  goal_amount?: number;
  fund_id?: string;
  start_date: string;
  end_date?: string;
  status?: CampaignStatus;
}

/**
 * DTO for updating a campaign
 */
export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  goal_amount?: number;
  fund_id?: string;
  start_date?: string;
  end_date?: string;
  status?: CampaignStatus;
}

/**
 * Campaign with progress percentage for UI
 */
export interface CampaignWithProgress extends Campaign {
  progress_percentage: number;
  days_remaining: number | null;
  is_active: boolean;
}
