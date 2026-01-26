/**
 * Global Search Domain Models
 * Unified search system with plugin architecture
 */

// =====================================================
// Search Result Types
// =====================================================

export type SearchEntityType =
  | 'member'
  | 'account'
  | 'transaction'
  | 'event'
  | 'ministry'
  | 'care_plan'
  | 'discipleship_plan'
  | 'notebook'
  | 'note'
  | 'donation'
  | 'family';

export interface SearchResultMeta {
  /** Entity type for icon and routing */
  entityType: SearchEntityType;
  /** Human-readable type label */
  typeLabel: string;
  /** Icon name for rendering */
  icon: string;
  /** Primary color for the entity type */
  color: string;
  /** Route to navigate to */
  href: string;
}

export interface SearchResultItem {
  /** Unique identifier */
  id: string;
  /** Primary display text */
  title: string;
  /** Secondary description text */
  subtitle?: string | null;
  /** Additional context info */
  description?: string | null;
  /** Avatar/image URL */
  imageUrl?: string | null;
  /** Search relevance score (0-1) */
  score: number;
  /** Highlighted matched text */
  highlights?: SearchHighlight[];
  /** Metadata for rendering */
  meta: SearchResultMeta;
  /** Raw entity data for preview */
  data?: Record<string, unknown>;
  /** Tags/badges to display */
  tags?: string[];
  /** Timestamp for sorting */
  timestamp?: string;
}

export interface SearchHighlight {
  field: string;
  matchedText: string;
  fullText: string;
}

// =====================================================
// Search Request Types
// =====================================================

export interface SearchQuery {
  /** Search query string */
  query: string;
  /** Entity types to search (empty = all) */
  entityTypes?: SearchEntityType[];
  /** Maximum results per entity type */
  limit?: number;
  /** Skip results for pagination */
  offset?: number;
  /** Sort by relevance or date */
  sortBy?: 'relevance' | 'date';
  /** Filter by date range */
  dateRange?: {
    from?: string;
    to?: string;
  };
  /** Include AI-enhanced results */
  useAI?: boolean;
}

export interface SearchFilters {
  entityTypes: SearchEntityType[];
  dateRange?: {
    from?: string;
    to?: string;
  };
  tags?: string[];
  status?: string[];
}

// =====================================================
// Search Response Types
// =====================================================

export interface SearchResultGroup {
  entityType: SearchEntityType;
  label: string;
  icon: string;
  color: string;
  results: SearchResultItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface SearchResponse {
  /** Search query that produced these results */
  query: string;
  /** Grouped results by entity type */
  groups: SearchResultGroup[];
  /** Total results across all groups */
  totalCount: number;
  /** Time taken to execute search (ms) */
  duration: number;
  /** AI-generated search suggestions */
  suggestions?: AISearchSuggestion[];
  /** Corrections for misspellings */
  corrections?: SearchCorrection[];
}

// =====================================================
// AI Search Types
// =====================================================

export interface AISearchSuggestion {
  /** Suggested query refinement */
  suggestion: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Explanation for the suggestion */
  reason?: string;
  /** Entity types this suggestion targets */
  targetTypes?: SearchEntityType[];
}

export interface AISearchIntent {
  /** Detected intent type */
  intent: 'find' | 'filter' | 'action' | 'question';
  /** Extracted entities from query */
  entities: ExtractedEntity[];
  /** Suggested filters based on query */
  suggestedFilters?: SearchFilters;
  /** Natural language interpretation */
  interpretation?: string;
}

export interface ExtractedEntity {
  type: 'person' | 'date' | 'amount' | 'status' | 'location' | 'tag';
  value: string;
  originalText: string;
  confidence: number;
}

export interface SearchCorrection {
  original: string;
  corrected: string;
  confidence: number;
}

// =====================================================
// Recent Search Types
// =====================================================

export interface RecentSearch {
  id: string;
  query: string;
  entityTypes?: SearchEntityType[];
  timestamp: string;
  resultCount: number;
}

export interface TrendingSearch {
  query: string;
  searchCount: number;
  trend: 'up' | 'down' | 'stable';
  entityType?: SearchEntityType;
}

// =====================================================
// Plugin System Types
// =====================================================

export interface SearchPluginConfig {
  entityType: SearchEntityType;
  label: string;
  icon: string;
  color: string;
  baseRoute: string;
  searchFields: string[];
  displayFields: {
    title: string;
    subtitle?: string;
    description?: string;
    image?: string;
    tags?: string;
  };
  /** RPC function name for search */
  rpcFunction?: string;
  /** Permission required to see results */
  requiredPermission?: string;
}

export interface SearchPluginResult {
  entityType: SearchEntityType;
  results: SearchResultItem[];
  totalCount: number;
  duration: number;
}

// =====================================================
// Search Analytics Types
// =====================================================

export interface SearchAnalytics {
  query: string;
  userId: string;
  tenantId: string;
  resultCount: number;
  clickedResult?: string;
  timestamp: string;
  duration: number;
  entityTypesSearched: SearchEntityType[];
}

// =====================================================
// UI State Types
// =====================================================

export interface GlobalSearchState {
  isOpen: boolean;
  query: string;
  filters: SearchFilters;
  results: SearchResponse | null;
  isLoading: boolean;
  error: string | null;
  recentSearches: RecentSearch[];
  selectedIndex: number;
}

// =====================================================
// Entity Type Configuration
// =====================================================

export const SEARCH_ENTITY_CONFIG: Record<SearchEntityType, {
  label: string;
  pluralLabel: string;
  icon: string;
  color: string;
  baseRoute: string;
  permission?: string;
}> = {
  member: {
    label: 'Member',
    pluralLabel: 'Members',
    icon: 'Users',
    color: 'blue',
    baseRoute: '/admin/members',
    permission: 'members:view',
  },
  account: {
    label: 'Account',
    pluralLabel: 'Accounts',
    icon: 'Building2',
    color: 'purple',
    baseRoute: '/admin/community/accounts',
    permission: 'finance:view',
  },
  transaction: {
    label: 'Transaction',
    pluralLabel: 'Transactions',
    icon: 'Receipt',
    color: 'green',
    baseRoute: '/admin/finance/transactions',
    permission: 'finance:view',
  },
  event: {
    label: 'Event',
    pluralLabel: 'Events',
    icon: 'Calendar',
    color: 'orange',
    baseRoute: '/admin/community/planning/calendar',
    permission: 'events:view',
  },
  ministry: {
    label: 'Ministry',
    pluralLabel: 'Ministries',
    icon: 'Users2',
    color: 'indigo',
    baseRoute: '/admin/community/planning/scheduler/ministries',
    permission: 'events:view',
  },
  care_plan: {
    label: 'Care Plan',
    pluralLabel: 'Care Plans',
    icon: 'Heart',
    color: 'pink',
    baseRoute: '/admin/community/care-plans',
    permission: 'care:view',
  },
  discipleship_plan: {
    label: 'Discipleship Plan',
    pluralLabel: 'Discipleship Plans',
    icon: 'GraduationCap',
    color: 'cyan',
    baseRoute: '/admin/community/discipleship-plans',
    permission: 'discipleship:view',
  },
  notebook: {
    label: 'Notebook',
    pluralLabel: 'Notebooks',
    icon: 'BookOpen',
    color: 'amber',
    baseRoute: '/admin/community/planning/notebooks',
  },
  note: {
    label: 'Note',
    pluralLabel: 'Notes',
    icon: 'FileText',
    color: 'gray',
    baseRoute: '/admin/community/planning/notebooks',
  },
  donation: {
    label: 'Donation',
    pluralLabel: 'Donations',
    icon: 'HandCoins',
    color: 'emerald',
    baseRoute: '/admin/finance/donations',
    permission: 'finance:view',
  },
  family: {
    label: 'Family',
    pluralLabel: 'Families',
    icon: 'Home',
    color: 'teal',
    baseRoute: '/admin/community/families',
    permission: 'households:view',
  },
};
