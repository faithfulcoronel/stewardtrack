/**
 * ================================================================================
 * MEMBER DISCIPLESHIP PLAN MODEL
 * ================================================================================
 *
 * Database table: member_discipleship_plans
 *
 * This model represents a member's discipleship journey, tracking their
 * spiritual growth pathway, mentorship, and milestones.
 *
 * SCHEMA (from migration 20250925000000_membership_stage_center_features.sql):
 *   id uuid PRIMARY KEY
 *   tenant_id uuid REFERENCES tenants(id)
 *   member_id uuid REFERENCES members(id)
 *   pathway text                    -- e.g., 'growth_track', 'leadership'
 *   next_step text                  -- Current action item
 *   mentor_name text                -- Assigned mentor name
 *   small_group text                -- Associated small group
 *   target_date date                -- Target completion date
 *   status text                     -- e.g., 'active', 'completed', 'paused'
 *   notes text                      -- Private notes
 *   created_at timestamptz
 *   updated_at timestamptz
 *   created_by uuid
 *   updated_by uuid
 *   deleted_at timestamptz          -- Soft delete
 *
 * ================================================================================
 */

import { BaseModel } from '@/models/base.model';

export interface MemberDiscipleshipPlan extends BaseModel {
  id: string;
  tenant_id?: string;
  member_id: string;
  pathway?: string | null;
  next_step?: string | null;
  mentor_name?: string | null;
  small_group?: string | null;
  target_date?: string | null;
  status?: string | null;
  notes?: string | null;
}
