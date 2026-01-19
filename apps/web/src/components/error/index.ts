export { ErrorReportDialog } from './ErrorReportDialog';
export { GlobalErrorBoundary } from './GlobalErrorBoundary';
export {
  sanitizeError,
  sanitizeErrorMessage,
  sanitizeStackTrace,
  sanitizeComponentStack,
  getUserFriendlyMessage,
  containsSensitiveData,
} from './sanitizeError';
export type { ErrorInfo } from './ErrorReportDialog';
export type { SanitizedError } from './sanitizeError';
