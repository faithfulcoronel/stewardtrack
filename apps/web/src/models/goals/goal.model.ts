/**
 * Goal Model
 *
 * Church-wide strategic goals that contain objectives and key results.
 * Goals support visibility levels, owner assignment, and automatic
 * calendar integration.
 */

import type { GoalCategory } from './goalCategory.model';
import type { ObjectiveWithKeyResults } from './objective.model';
import type { KeyResult } from './keyResult.model';

// ============================================================================
// Types
// ============================================================================

export type GoalStatus =
  | 'draft'
  | 'active'
  | 'on_track'
  | 'at_risk'
  | 'behind'
  | 'completed'
  | 'cancelled';

export type GoalVisibility = 'private' | 'leadership' | 'staff' | 'public';

export interface Goal {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  category_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  status: GoalStatus;
  owner_id?: string | null;
  visibility: GoalVisibility;
  tags: string[];
  metadata: Record<string, unknown>;
  overall_progress: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;

  // Enriched fields (populated by adapter)
  category?: GoalCategory | null;
  owner_name?: string | null;
  owner_email?: string | null;
  objectives_count?: number;
  key_results_count?: number;
}

export interface GoalWithDetails extends Goal {
  objectives: ObjectiveWithKeyResults[];
  direct_key_results: KeyResult[];
  recent_activity?: GoalActivity[];
}

export interface GoalCreateInput {
  title: string;
  description?: string;
  category_id?: string;
  start_date?: string;
  target_date?: string;
  status?: GoalStatus;
  owner_id?: string;
  visibility?: GoalVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GoalUpdateInput {
  title?: string;
  description?: string;
  category_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  status?: GoalStatus;
  owner_id?: string | null;
  visibility?: GoalVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GoalFilters {
  category_id?: string;
  status?: GoalStatus | GoalStatus[];
  visibility?: GoalVisibility;
  owner_id?: string;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
  target_date_from?: string;
  target_date_to?: string;
  tags?: string[];
}

export interface GoalQueryOptions {
  limit?: number;
  offset?: number;
  sort_by?: 'title' | 'target_date' | 'overall_progress' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  include_category?: boolean;
  include_owner?: boolean;
  include_counts?: boolean;
}

// ============================================================================
// Dashboard Statistics
// ============================================================================

export interface GoalsDashboardStats {
  total_goals: number;
  goals_by_status: {
    draft: number;
    active: number;
    on_track: number;
    at_risk: number;
    behind: number;
    completed: number;
    cancelled: number;
  };
  average_progress: number;
  goals_on_track_percent: number;
  total_key_results: number;
  key_results_completed: number;
  key_results_at_risk: number;
  updates_due_this_week: number;
  overdue_updates: number;
  recent_updates_count: number;
}

export interface GoalActivity {
  id: string;
  type:
    | 'goal_created'
    | 'goal_updated'
    | 'goal_status_changed'
    | 'objective_created'
    | 'objective_completed'
    | 'key_result_created'
    | 'progress_recorded';
  entity_type: 'goal' | 'objective' | 'key_result' | 'progress_update';
  entity_id: string;
  entity_title: string;
  description: string;
  user_id?: string | null;
  user_name?: string | null;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display color for goal status
 */
export function getGoalStatusColor(status: GoalStatus): string {
  const colors: Record<GoalStatus, string> = {
    draft: '#6b7280',
    active: '#3b82f6',
    on_track: '#10b981',
    at_risk: '#f59e0b',
    behind: '#ef4444',
    completed: '#22c55e',
    cancelled: '#9ca3af',
  };
  return colors[status];
}

/**
 * Get display label for goal status
 */
export function getGoalStatusLabel(status: GoalStatus): string {
  const labels: Record<GoalStatus, string> = {
    draft: 'Draft',
    active: 'Active',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/**
 * Get display label for visibility level
 */
export function getVisibilityLabel(visibility: GoalVisibility): string {
  const labels: Record<GoalVisibility, string> = {
    private: 'Private',
    leadership: 'Leadership',
    staff: 'Staff',
    public: 'Public',
  };
  return labels[visibility];
}

/**
 * Check if a goal is considered "healthy" (on track or completed)
 */
export function isGoalHealthy(goal: Goal): boolean {
  return ['on_track', 'completed', 'active'].includes(goal.status);
}

/**
 * Check if a goal needs attention
 */
export function goalNeedsAttention(goal: Goal): boolean {
  return ['at_risk', 'behind'].includes(goal.status);
}

/**
 * Calculate days until target date
 */
export function getDaysUntilTarget(targetDate: string | null | undefined): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determine suggested status based on progress and timeline
 */
export function suggestGoalStatus(
  currentProgress: number,
  targetDate: string | null | undefined,
  currentStatus: GoalStatus
): GoalStatus {
  // Don't change draft, completed, or cancelled goals
  if (['draft', 'completed', 'cancelled'].includes(currentStatus)) {
    return currentStatus;
  }

  const daysUntilTarget = getDaysUntilTarget(targetDate);

  // If no target date, base on progress alone
  if (daysUntilTarget === null) {
    if (currentProgress >= 100) return 'completed';
    if (currentProgress >= 70) return 'on_track';
    if (currentProgress >= 40) return 'active';
    return 'at_risk';
  }

  // Past due
  if (daysUntilTarget < 0) {
    if (currentProgress >= 100) return 'completed';
    return 'behind';
  }

  // Calculate expected progress based on timeline
  // This is a simplified linear calculation
  const totalDays = 365; // Assume annual goal if we can't calculate
  const daysElapsed = totalDays - daysUntilTarget;
  const expectedProgress = Math.min(100, (daysElapsed / totalDays) * 100);

  if (currentProgress >= 100) return 'completed';
  if (currentProgress >= expectedProgress) return 'on_track';
  if (currentProgress >= expectedProgress * 0.7) return 'at_risk';
  return 'behind';
}
