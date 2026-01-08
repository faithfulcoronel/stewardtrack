/**
 * Goal Category Model
 *
 * Tenant-customizable goal categories for organizing strategic goals.
 * Each tenant gets default categories seeded on creation, with the ability
 * to add custom categories.
 */

// ============================================================================
// Types
// ============================================================================

export interface GoalCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string | null;
  color: string;
  icon: string;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  deleted_at?: string | null;
}

export interface GoalCategoryCreateInput {
  name: string;
  code?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface GoalCategoryUpdateInput {
  name?: string;
  code?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  is_active?: boolean;
}

// ============================================================================
// Default Categories
// ============================================================================

export const DEFAULT_GOAL_CATEGORIES: Omit<GoalCategoryCreateInput, 'sort_order'>[] = [
  {
    name: 'Spiritual Growth',
    code: 'spiritual_growth',
    description: 'Goals related to spiritual development, discipleship, and faith formation',
    color: '#8b5cf6',
    icon: 'heart',
  },
  {
    name: 'Community Outreach',
    code: 'community_outreach',
    description: 'Goals for serving the community, missions, and evangelism',
    color: '#f97316',
    icon: 'users',
  },
  {
    name: 'Financial Stewardship',
    code: 'financial_stewardship',
    description: 'Goals for financial health, giving, and resource management',
    color: '#10b981',
    icon: 'dollar-sign',
  },
  {
    name: 'Ministry Development',
    code: 'ministry_development',
    description: 'Goals for growing and improving ministry programs',
    color: '#3b82f6',
    icon: 'trending-up',
  },
  {
    name: 'Facility & Operations',
    code: 'facility_operations',
    description: 'Goals for building, equipment, and operational improvements',
    color: '#6b7280',
    icon: 'building',
  },
  {
    name: 'Communications',
    code: 'communications',
    description: 'Goals for marketing, communications, and engagement',
    color: '#ec4899',
    icon: 'megaphone',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a code from a category name
 */
export function generateCategoryCode(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Get icon component name for a category icon string
 */
export function getCategoryIconName(icon: string): string {
  const iconMap: Record<string, string> = {
    heart: 'Heart',
    users: 'Users',
    'dollar-sign': 'DollarSign',
    'trending-up': 'TrendingUp',
    building: 'Building',
    megaphone: 'Megaphone',
    target: 'Target',
    calendar: 'Calendar',
    'book-open': 'BookOpen',
    star: 'Star',
    flag: 'Flag',
    'check-circle': 'CheckCircle',
  };
  return iconMap[icon] || 'Target';
}
