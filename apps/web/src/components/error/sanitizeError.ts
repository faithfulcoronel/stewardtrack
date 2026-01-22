/**
 * Error Sanitization Utility
 *
 * Removes sensitive information from error messages and stack traces
 * before displaying them to users or sending in reports.
 */

// Patterns that indicate sensitive data
const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; replacement: string; name: string }> = [
  // API Keys and Tokens
  {
    pattern: /(?:api[_-]?key|apikey|token|bearer|auth|secret|password|passwd|pwd)[=:\s]["']?[\w-]{8,}["']?/gi,
    replacement: '[REDACTED_KEY]',
    name: 'API Key/Token'
  },
  {
    pattern: /(?:sk|pk|rk|ak)[-_](?:live|test|prod)?[-_]?[a-zA-Z0-9]{20,}/g,
    replacement: '[REDACTED_KEY]',
    name: 'Stripe/Service Key'
  },
  {
    pattern: /Bearer\s+[a-zA-Z0-9._-]+/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
    name: 'Bearer Token'
  },
  {
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    replacement: '[REDACTED_JWT]',
    name: 'JWT Token'
  },

  // Database Connection Strings
  {
    pattern: /(?:postgres|postgresql|mysql|mongodb|redis|supabase):\/\/[^\s"'<>]+/gi,
    replacement: '[REDACTED_DB_URL]',
    name: 'Database URL'
  },
  {
    pattern: /(?:host|server)=[\w.-]+(?:;|&|$)/gi,
    replacement: 'host=[REDACTED];',
    name: 'Database Host'
  },

  // Email Addresses (partial redaction to preserve context)
  {
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACTED_EMAIL]',
    name: 'Email Address'
  },

  // IP Addresses
  {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[REDACTED_IP]',
    name: 'IP Address'
  },
  {
    pattern: /\b(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b/g,
    replacement: '[REDACTED_IPV6]',
    name: 'IPv6 Address'
  },

  // UUIDs (can be user IDs, tenant IDs, etc.) - only in certain contexts
  {
    pattern: /(?:user[_-]?id|tenant[_-]?id|customer[_-]?id|account[_-]?id)[=:\s]["']?[a-f0-9-]{36}["']?/gi,
    replacement: '[REDACTED_ID]',
    name: 'User/Tenant ID'
  },

  // Credit Card Numbers (basic pattern)
  {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[REDACTED_CARD]',
    name: 'Credit Card'
  },

  // Phone Numbers
  {
    pattern: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    replacement: '[REDACTED_PHONE]',
    name: 'Phone Number'
  },

  // SSN (US Social Security Numbers)
  {
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
    name: 'SSN'
  },

  // File Paths (Windows and Unix)
  {
    pattern: /(?:C:\\Users\\[^\\]+|\/home\/[^/]+|\/Users\/[^/]+)[^\s"'<>]*/gi,
    replacement: '[REDACTED_PATH]',
    name: 'User File Path'
  },

  // Environment Variables in error messages
  {
    pattern: /(?:process\.env\.[A-Z_]+\s*=\s*)[^\s"'<>]+/g,
    replacement: 'process.env.[REDACTED]',
    name: 'Environment Variable'
  },

  // AWS ARNs and Resource IDs
  {
    pattern: /arn:aws:[a-z0-9-]+:[a-z0-9-]*:\d*:[^\s"'<>]+/gi,
    replacement: '[REDACTED_AWS_ARN]',
    name: 'AWS ARN'
  },

  // Generic Secrets in Key-Value format
  {
    pattern: /(?:secret|private[_-]?key|credentials?)[=:\s]["']?[^\s"'<>,;]{8,}["']?/gi,
    replacement: '[REDACTED_SECRET]',
    name: 'Secret/Credential'
  },

  // Supabase specific
  {
    pattern: /supabase[_-]?(?:url|key|anon|service)[=:\s]["']?[^\s"'<>]+["']?/gi,
    replacement: '[REDACTED_SUPABASE]',
    name: 'Supabase Config'
  },

  // Resend API Key
  {
    pattern: /re_[a-zA-Z0-9]{20,}/g,
    replacement: '[REDACTED_RESEND_KEY]',
    name: 'Resend API Key'
  },
];

// Words that should trigger extra caution
const SENSITIVE_KEYWORDS = [
  'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'apikey',
  'private_key', 'privatekey', 'credential', 'auth', 'bearer',
  'connection_string', 'connectionstring', 'database_url',
];

/**
 * Sanitizes an error message by removing sensitive data patterns
 */
export function sanitizeErrorMessage(message: string | undefined): string {
  if (!message) return 'An unexpected error occurred';

  let sanitized = message;

  // Apply all sensitive patterns
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Sanitizes a stack trace by removing sensitive data patterns
 * Also truncates overly long stack traces
 */
export function sanitizeStackTrace(stack: string | undefined, maxLength = 5000): string {
  if (!stack) return '';

  let sanitized = stack;

  // Apply all sensitive patterns
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '\n... [truncated]';
  }

  return sanitized;
}

/**
 * Sanitizes the component stack from React error info
 */
export function sanitizeComponentStack(componentStack: string | undefined): string {
  if (!componentStack) return '';

  let sanitized = componentStack;

  // Apply all sensitive patterns
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Checks if a string potentially contains sensitive data
 * Useful for deciding whether to show detailed errors
 */
export function containsSensitiveData(text: string | undefined): boolean {
  if (!text) return false;

  const lowerText = text.toLowerCase();

  // Check for sensitive keywords
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return true;
    }
  }

  // Check against patterns
  for (const { pattern } of SENSITIVE_PATTERNS) {
    // Reset regex lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Creates a safe error object for display
 * Returns sanitized versions of all error properties
 */
export interface SanitizedError {
  name: string;
  message: string;
  stack: string;
  componentStack: string;
  hasSensitiveData: boolean;
}

export function sanitizeError(
  error: Error | undefined,
  errorInfo?: { componentStack?: string }
): SanitizedError {
  const rawMessage = error?.message || '';
  const rawStack = error?.stack || '';
  const rawComponentStack = errorInfo?.componentStack || '';

  // Check if any raw data contains sensitive info
  const hasSensitiveData =
    containsSensitiveData(rawMessage) ||
    containsSensitiveData(rawStack) ||
    containsSensitiveData(rawComponentStack);

  return {
    name: error?.name || 'Error',
    message: sanitizeErrorMessage(rawMessage),
    stack: sanitizeStackTrace(rawStack),
    componentStack: sanitizeComponentStack(rawComponentStack),
    hasSensitiveData,
  };
}

/**
 * Creates a user-friendly error message
 * For production, this returns generic messages for certain error types
 */
export function getUserFriendlyMessage(error: Error | undefined): string {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'A network error occurred. Please check your connection and try again.';
  }

  // Authentication errors
  if (message.includes('unauthorized') || message.includes('authentication') || message.includes('401')) {
    return 'Your session may have expired. Please try logging in again.';
  }

  // Permission errors
  if (message.includes('forbidden') || message.includes('permission') || message.includes('403')) {
    return 'You do not have permission to perform this action.';
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return 'The requested resource was not found.';
  }

  // Server errors
  if (message.includes('500') || message.includes('internal server')) {
    return 'A server error occurred. Our team has been notified.';
  }

  // Database errors (should be sanitized)
  if (message.includes('database') || message.includes('query') || message.includes('sql')) {
    return 'A data error occurred. Please try again.';
  }

  // Return sanitized original message if no specific handler
  return sanitizeErrorMessage(error.message) || 'An unexpected error occurred. Please try again.';
}
