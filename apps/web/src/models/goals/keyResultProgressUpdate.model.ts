/**
 * Key Result Progress Update Model
 *
 * Historical progress tracking for key results. Each update captures
 * the previous value, new value, and optional notes. Supports both
 * manual updates and automatic updates from linked metrics.
 */

// ============================================================================
// Types
// ============================================================================

export interface KeyResultProgressUpdate {
  id: string;
  tenant_id: string;
  key_result_id: string;
  previous_value?: number | null;
  new_value: number;
  change_value: number;
  notes?: string | null;
  is_auto_update: boolean;
  recorded_at: string;
  created_at: string;
  created_by?: string | null;

  // Enriched fields (populated by adapter)
  created_by_name?: string | null;
  created_by_email?: string | null;
  key_result_title?: string | null;
}

export interface ProgressUpdateCreateInput {
  key_result_id: string;
  new_value: number;
  notes?: string;
  is_auto_update?: boolean;
  recorded_at?: string;
}

export interface ProgressUpdateFilters {
  key_result_id?: string;
  is_auto_update?: boolean;
  recorded_from?: string;
  recorded_to?: string;
  created_by?: string;
}

export interface ProgressUpdateQueryOptions {
  limit?: number;
  offset?: number;
  sort_order?: 'asc' | 'desc';
}

// ============================================================================
// Progress History Summary
// ============================================================================

export interface ProgressHistorySummary {
  key_result_id: string;
  total_updates: number;
  first_update_at?: string;
  last_update_at?: string;
  starting_value: number;
  current_value: number;
  total_change: number;
  average_change_per_update: number;
  updates_this_week: number;
  updates_this_month: number;
}

// ============================================================================
// Chart Data Types
// ============================================================================

export interface ProgressChartDataPoint {
  date: string;
  value: number;
  change: number;
  notes?: string;
  is_auto: boolean;
}

export interface ProgressTrendData {
  data_points: ProgressChartDataPoint[];
  target_value: number;
  starting_value: number;
  current_value: number;
  progress_percent: number;
  trend_direction: 'up' | 'down' | 'flat';
  projected_completion_date?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format change value with sign
 */
export function formatChangeValue(change: number, metricType: string = 'number'): string {
  const sign = change >= 0 ? '+' : '';

  switch (metricType) {
    case 'percentage':
      return `${sign}${change.toFixed(1)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        signDisplay: 'always',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(change);
    case 'boolean':
      return change >= 1 ? 'Completed' : 'Reverted';
    default:
      return `${sign}${new Intl.NumberFormat('en-US').format(change)}`;
  }
}

/**
 * Get color for change value (positive = green, negative = red)
 */
export function getChangeColor(change: number): string {
  if (change > 0) return '#22c55e'; // Green
  if (change < 0) return '#ef4444'; // Red
  return '#6b7280'; // Gray
}

/**
 * Convert progress updates to chart data points
 */
export function toChartDataPoints(
  updates: KeyResultProgressUpdate[],
  startingValue: number = 0
): ProgressChartDataPoint[] {
  // Sort by recorded_at ascending
  const sorted = [...updates].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // Add starting point if there are updates
  const dataPoints: ProgressChartDataPoint[] = [];

  if (sorted.length > 0) {
    // Add initial value point
    const firstUpdate = sorted[0];
    const startDate = new Date(firstUpdate.recorded_at);
    startDate.setDate(startDate.getDate() - 1);

    dataPoints.push({
      date: startDate.toISOString(),
      value: startingValue,
      change: 0,
      is_auto: false,
    });
  }

  // Add all updates
  for (const update of sorted) {
    dataPoints.push({
      date: update.recorded_at,
      value: update.new_value,
      change: update.change_value,
      notes: update.notes || undefined,
      is_auto: update.is_auto_update,
    });
  }

  return dataPoints;
}

/**
 * Calculate trend data from progress updates
 */
export function calculateTrendData(
  updates: KeyResultProgressUpdate[],
  targetValue: number,
  startingValue: number,
  currentValue: number
): ProgressTrendData {
  const dataPoints = toChartDataPoints(updates, startingValue);

  // Calculate progress percent
  const range = targetValue - startingValue;
  const progress =
    range === 0 ? (currentValue >= targetValue ? 100 : 0) : ((currentValue - startingValue) / range) * 100;

  // Determine trend direction based on recent updates
  let trendDirection: 'up' | 'down' | 'flat' = 'flat';
  if (updates.length >= 2) {
    const recentUpdates = updates.slice(-3);
    const totalRecentChange = recentUpdates.reduce((sum, u) => sum + u.change_value, 0);
    if (totalRecentChange > 0) trendDirection = 'up';
    else if (totalRecentChange < 0) trendDirection = 'down';
  }

  // Project completion date based on average progress rate
  let projectedCompletionDate: string | undefined;
  if (updates.length >= 2 && currentValue < targetValue && trendDirection === 'up') {
    const firstUpdate = updates[0];
    const lastUpdate = updates[updates.length - 1];
    const daysBetween =
      (new Date(lastUpdate.recorded_at).getTime() - new Date(firstUpdate.recorded_at).getTime()) /
      (1000 * 60 * 60 * 24);
    const valueChange = lastUpdate.new_value - (firstUpdate.previous_value || startingValue);

    if (daysBetween > 0 && valueChange > 0) {
      const ratePerDay = valueChange / daysBetween;
      const remainingValue = targetValue - currentValue;
      const daysToComplete = remainingValue / ratePerDay;

      const projectedDate = new Date();
      projectedDate.setDate(projectedDate.getDate() + Math.ceil(daysToComplete));
      projectedCompletionDate = projectedDate.toISOString().split('T')[0];
    }
  }

  return {
    data_points: dataPoints,
    target_value: targetValue,
    starting_value: startingValue,
    current_value: currentValue,
    progress_percent: Math.min(100, Math.max(0, progress)),
    trend_direction: trendDirection,
    projected_completion_date: projectedCompletionDate,
  };
}

/**
 * Group updates by time period
 */
export function groupUpdatesByPeriod(
  updates: KeyResultProgressUpdate[],
  period: 'day' | 'week' | 'month'
): Map<string, KeyResultProgressUpdate[]> {
  const groups = new Map<string, KeyResultProgressUpdate[]>();

  for (const update of updates) {
    const date = new Date(update.recorded_at);
    let key: string;

    switch (period) {
      case 'day':
        key = date.toISOString().split('T')[0];
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(update);
  }

  return groups;
}

/**
 * Get a summary of recent activity
 */
export function getRecentActivitySummary(
  updates: KeyResultProgressUpdate[]
): {
  today: number;
  thisWeek: number;
  thisMonth: number;
  lastChange: number | null;
  lastChangeDate: string | null;
} {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  let todayCount = 0;
  let weekCount = 0;
  let monthCount = 0;

  for (const update of updates) {
    const updateDate = new Date(update.recorded_at);
    if (updateDate >= today) todayCount++;
    if (updateDate >= weekAgo) weekCount++;
    if (updateDate >= monthAgo) monthCount++;
  }

  // Get most recent update
  const sorted = [...updates].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  const lastUpdate = sorted[0];

  return {
    today: todayCount,
    thisWeek: weekCount,
    thisMonth: monthCount,
    lastChange: lastUpdate?.change_value || null,
    lastChangeDate: lastUpdate?.recorded_at || null,
  };
}
