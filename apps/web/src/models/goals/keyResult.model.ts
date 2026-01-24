/**
 * Key Result Model
 *
 * Measurable outcomes linked to goals or objectives. Key results support
 * manual tracking or auto-linking to system metrics like member counts,
 * donation totals, etc.
 */

// ============================================================================
// Types
// ============================================================================

export type KeyResultMetricType = 'number' | 'percentage' | 'currency' | 'boolean';

export type KeyResultUpdateFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export type KeyResultStatus = 'active' | 'completed' | 'cancelled';

export type MetricLinkType =
  | 'none'
  | 'members_total'
  | 'members_active'
  | 'members_new'
  | 'donations_total'
  | 'donations_count'
  | 'care_plans_active'
  | 'discipleship_enrolled'
  | 'attendance_average'
  | 'custom_query';

export interface MetricLinkConfig {
  // For time-bound metrics (members_new, donations_total, etc.)
  date_range_start?: string;
  date_range_end?: string;

  // For custom_query
  custom_table?: string;
  custom_column?: string;
  custom_aggregation?: 'count' | 'sum' | 'avg';
  custom_filter?: Record<string, unknown>;
}

export interface KeyResult {
  id: string;
  tenant_id: string;
  goal_id?: string | null;
  objective_id?: string | null;
  title: string;
  description?: string | null;
  metric_type: KeyResultMetricType;
  target_value: number;
  current_value: number;
  starting_value: number;
  unit_label?: string | null;
  progress_percent: number;
  metric_link_type: MetricLinkType;
  metric_link_config: MetricLinkConfig;
  last_auto_update_at?: string | null;
  update_frequency: KeyResultUpdateFrequency;
  last_updated_at?: string | null;
  next_update_due?: string | null;
  status: KeyResultStatus;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;

  // Enriched fields (populated by adapter)
  parent_title?: string | null;
  parent_type?: 'goal' | 'objective';
}

export interface KeyResultCreateInput {
  goal_id?: string;
  objective_id?: string;
  title: string;
  description?: string;
  metric_type: KeyResultMetricType;
  target_value: number;
  starting_value?: number;
  unit_label?: string;
  metric_link_type?: MetricLinkType;
  metric_link_config?: MetricLinkConfig;
  update_frequency?: KeyResultUpdateFrequency;
  sort_order?: number;
}

export interface KeyResultUpdateInput {
  title?: string;
  description?: string;
  metric_type?: KeyResultMetricType;
  target_value?: number;
  current_value?: number;
  starting_value?: number;
  unit_label?: string;
  metric_link_type?: MetricLinkType;
  metric_link_config?: MetricLinkConfig;
  update_frequency?: KeyResultUpdateFrequency;
  status?: KeyResultStatus;
  sort_order?: number;
}

export interface KeyResultFilters {
  goal_id?: string;
  objective_id?: string;
  status?: KeyResultStatus | KeyResultStatus[];
  metric_type?: KeyResultMetricType;
  metric_link_type?: MetricLinkType;
  update_due_before?: string;
  search?: string;
}

// ============================================================================
// Available Metrics for Auto-Linking
// ============================================================================

export interface AvailableMetric {
  type: MetricLinkType;
  name: string;
  description: string;
  unit: string;
  metric_type: KeyResultMetricType;
  requires_date_range: boolean;
}

export const AVAILABLE_METRICS: AvailableMetric[] = [
  {
    type: 'none',
    name: 'Manual Tracking',
    description: 'Manually record progress updates',
    unit: '',
    metric_type: 'number',
    requires_date_range: false,
  },
  {
    type: 'members_total',
    name: 'Total Members',
    description: 'Current total count of all members',
    unit: 'members',
    metric_type: 'number',
    requires_date_range: false,
  },
  {
    type: 'members_active',
    name: 'Active Members',
    description: 'Members with active status',
    unit: 'members',
    metric_type: 'number',
    requires_date_range: false,
  },
  {
    type: 'members_new',
    name: 'New Members',
    description: 'Members added in date range',
    unit: 'members',
    metric_type: 'number',
    requires_date_range: true,
  },
  {
    type: 'donations_total',
    name: 'Total Donations',
    description: 'Sum of donations in date range',
    unit: '$',
    metric_type: 'currency',
    requires_date_range: true,
  },
  {
    type: 'donations_count',
    name: 'Donation Count',
    description: 'Number of unique donors in date range',
    unit: 'donors',
    metric_type: 'number',
    requires_date_range: true,
  },
  {
    type: 'care_plans_active',
    name: 'Active Care Plans',
    description: 'Currently active care plans',
    unit: 'plans',
    metric_type: 'number',
    requires_date_range: false,
  },
  {
    type: 'discipleship_enrolled',
    name: 'Discipleship Enrolled',
    description: 'Members enrolled in discipleship pathways',
    unit: 'members',
    metric_type: 'number',
    requires_date_range: false,
  },
  {
    type: 'attendance_average',
    name: 'Average Attendance',
    description: 'Average weekly service attendance',
    unit: 'attendees',
    metric_type: 'number',
    requires_date_range: true,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get display color for key result status
 */
export function getKeyResultStatusColor(status: KeyResultStatus): string {
  const colors: Record<KeyResultStatus, string> = {
    active: '#3b82f6',
    completed: '#22c55e',
    cancelled: '#9ca3af',
  };
  return colors[status];
}

/**
 * Get display label for key result status
 */
export function getKeyResultStatusLabel(status: KeyResultStatus): string {
  const labels: Record<KeyResultStatus, string> = {
    active: 'Active',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

/**
 * Get display color based on progress percentage
 */
export function getProgressColor(progress: number): string {
  if (progress >= 100) return '#22c55e'; // Green - completed
  if (progress >= 70) return '#10b981'; // Emerald - on track
  if (progress >= 40) return '#f59e0b'; // Amber - at risk
  return '#ef4444'; // Red - behind
}

/**
 * Get progress status label based on percentage
 */
export function getProgressStatus(progress: number): string {
  if (progress >= 100) return 'Completed';
  if (progress >= 70) return 'On Track';
  if (progress >= 40) return 'At Risk';
  return 'Behind';
}

/**
 * Format value based on metric type
 */
export function formatMetricValue(
  value: number,
  metricType: KeyResultMetricType,
  unitLabel?: string | null
): string {
  switch (metricType) {
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'boolean':
      return value >= 1 ? 'Yes' : 'No';
    case 'number':
    default:
      const formatted = new Intl.NumberFormat('en-US').format(value);
      return unitLabel ? `${formatted} ${unitLabel}` : formatted;
  }
}

/**
 * Get update frequency label
 */
export function getUpdateFrequencyLabel(frequency: KeyResultUpdateFrequency): string {
  const labels: Record<KeyResultUpdateFrequency, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 Weeks',
    monthly: 'Monthly',
    quarterly: 'Quarterly',
  };
  return labels[frequency];
}

/**
 * Get update frequency in days
 */
export function getUpdateFrequencyDays(frequency: KeyResultUpdateFrequency): number {
  const days: Record<KeyResultUpdateFrequency, number> = {
    weekly: 7,
    biweekly: 14,
    monthly: 30,
    quarterly: 90,
  };
  return days[frequency];
}

/**
 * Check if a key result update is overdue
 */
export function isUpdateOverdue(keyResult: KeyResult): boolean {
  if (keyResult.status !== 'active') return false;
  if (!keyResult.next_update_due) return false;
  const dueDate = new Date(keyResult.next_update_due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Check if a key result update is due soon (within 3 days)
 */
export function isUpdateDueSoon(keyResult: KeyResult): boolean {
  if (keyResult.status !== 'active') return false;
  if (!keyResult.next_update_due) return false;
  const dueDate = new Date(keyResult.next_update_due);
  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  threeDaysFromNow.setHours(0, 0, 0, 0);
  return dueDate >= today && dueDate <= threeDaysFromNow;
}

/**
 * Calculate progress percentage
 */
export function calculateProgress(
  current: number,
  target: number,
  starting: number = 0
): number {
  const range = target - starting;
  if (range === 0) return current >= target ? 100 : 0;
  const progress = ((current - starting) / range) * 100;
  return Math.min(100, Math.max(0, progress));
}

/**
 * Get available metric by type
 */
export function getAvailableMetric(type: MetricLinkType): AvailableMetric | undefined {
  return AVAILABLE_METRICS.find((m) => m.type === type);
}

/**
 * Check if metric type requires auto-linking configuration
 */
export function isAutoLinkedMetric(type: MetricLinkType): boolean {
  return type !== 'none';
}
