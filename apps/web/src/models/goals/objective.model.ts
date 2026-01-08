/**
 * Objective Model
 *
 * Ministry/department objectives that are linked to parent goals.
 * Objectives can have their own key results and track progress
 * independently while contributing to overall goal progress.
 */

import type { KeyResult } from './keyResult.model';

// ============================================================================
// Types
// ============================================================================

export type ObjectiveStatus =
  | 'pending'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'behind'
  | 'completed'
  | 'cancelled';

export type ObjectivePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Objective {
  id: string;
  tenant_id: string;
  goal_id: string;
  title: string;
  description?: string | null;
  ministry_department?: string | null;
  responsible_id?: string | null;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  due_date?: string | null;
  sort_order: number;
  overall_progress: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;

  // Enriched fields (populated by adapter)
  responsible_name?: string | null;
  responsible_email?: string | null;
  key_results_count?: number;
  goal_title?: string | null;
}

export interface ObjectiveWithKeyResults extends Objective {
  key_results: KeyResult[];
}

export interface ObjectiveCreateInput {
  goal_id: string;
  title: string;
  description?: string;
  ministry_department?: string;
  responsible_id?: string;
  status?: ObjectiveStatus;
  priority?: ObjectivePriority;
  due_date?: string;
  sort_order?: number;
}

export interface ObjectiveUpdateInput {
  title?: string;
  description?: string;
  ministry_department?: string;
  responsible_id?: string | null;
  status?: ObjectiveStatus;
  priority?: ObjectivePriority;
  due_date?: string | null;
  sort_order?: number;
}

export interface ObjectiveFilters {
  goal_id?: string;
  status?: ObjectiveStatus | ObjectiveStatus[];
  priority?: ObjectivePriority | ObjectivePriority[];
  responsible_id?: string;
  ministry_department?: string;
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

// ============================================================================
// Common Ministry Departments
// ============================================================================

export const COMMON_MINISTRY_DEPARTMENTS = [
  'Worship',
  'Youth',
  'Children',
  'Small Groups',
  'Outreach',
  'Missions',
  'Communications',
  'Finance',
  'Facilities',
  'Administration',
  'Pastoral Care',
  'Discipleship',
  'Guest Services',
  'Tech/Media',
  'Seniors',
  'Young Adults',
  'Women\'s Ministry',
  'Men\'s Ministry',
  'Family Ministry',
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display color for objective status
 */
export function getObjectiveStatusColor(status: ObjectiveStatus): string {
  const colors: Record<ObjectiveStatus, string> = {
    pending: '#6b7280',
    in_progress: '#3b82f6',
    on_track: '#10b981',
    at_risk: '#f59e0b',
    behind: '#ef4444',
    completed: '#22c55e',
    cancelled: '#9ca3af',
  };
  return colors[status];
}

/**
 * Get display label for objective status
 */
export function getObjectiveStatusLabel(status: ObjectiveStatus): string {
  const labels: Record<ObjectiveStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    on_track: 'On Track',
    at_risk: 'At Risk',
    behind: 'Behind',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/**
 * Get display color for objective priority
 */
export function getObjectivePriorityColor(priority: ObjectivePriority): string {
  const colors: Record<ObjectivePriority, string> = {
    low: '#6b7280',
    normal: '#3b82f6',
    high: '#f59e0b',
    urgent: '#ef4444',
  };
  return colors[priority];
}

/**
 * Get display label for objective priority
 */
export function getObjectivePriorityLabel(priority: ObjectivePriority): string {
  const labels: Record<ObjectivePriority, string> = {
    low: 'Low',
    normal: 'Normal',
    high: 'High',
    urgent: 'Urgent',
  };
  return labels[priority];
}

/**
 * Check if an objective is overdue
 */
export function isObjectiveOverdue(objective: Objective): boolean {
  if (!objective.due_date) return false;
  if (['completed', 'cancelled'].includes(objective.status)) return false;
  const dueDate = new Date(objective.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Calculate days until due date
 */
export function getDaysUntilDue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Sort objectives by priority then by due date
 */
export function sortObjectivesByPriority(objectives: Objective[]): Objective[] {
  const priorityOrder: Record<ObjectivePriority, number> = {
    urgent: 0,
    high: 1,
    normal: 2,
    low: 3,
  };

  return [...objectives].sort((a, b) => {
    // First sort by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;

    // Then sort by due date (earlier first, null last)
    if (a.due_date && b.due_date) {
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    // Finally sort by sort_order
    return a.sort_order - b.sort_order;
  });
}
