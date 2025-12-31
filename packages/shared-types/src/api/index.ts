/**
 * API-related types for request/response handling
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (only present on success) */
  data?: T;
  /** Error message (only present on failure) */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: string;
  /** Additional metadata */
  meta?: ApiResponseMeta;
}

/**
 * API response metadata
 */
export interface ApiResponseMeta {
  /** Request timestamp */
  timestamp: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Pagination info if applicable */
  pagination?: PaginationMeta;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  /** Current page (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrevious: boolean;
}

/**
 * Paginated request parameters
 */
export interface PaginationParams {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Common filter operators
 */
export type FilterOperator =
  | 'eq'      // equals
  | 'neq'     // not equals
  | 'gt'      // greater than
  | 'gte'     // greater than or equal
  | 'lt'      // less than
  | 'lte'     // less than or equal
  | 'like'    // contains (case insensitive)
  | 'in'      // in array
  | 'nin'     // not in array
  | 'is'      // is null / is not null
  | 'between'; // between two values

/**
 * Filter definition
 */
export interface FilterDef {
  /** Field to filter on */
  field: string;
  /** Operator to use */
  operator: FilterOperator;
  /** Value to filter by */
  value: unknown;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** When the access token expires */
  expiresAt: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
}

/**
 * Authenticated user info
 */
export interface AuthUser {
  /** User's unique ID */
  id: string;
  /** User's email address */
  email: string;
  /** User's display name */
  displayName?: string;
  /** User's avatar URL */
  avatarUrl?: string;
  /** Current tenant ID */
  tenantId?: string;
  /** User's roles in the current tenant */
  roles?: string[];
}

/**
 * API error codes
 */
export enum ApiErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',

  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',

  // Tenant/License errors
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  FEATURE_NOT_AVAILABLE = 'FEATURE_NOT_AVAILABLE',
}
