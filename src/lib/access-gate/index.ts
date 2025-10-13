/**
 * Access Gate System - Main Export
 *
 * Simple, elegant access control system using design patterns
 */

// Core classes
export {
  AccessGate,
  AccessCheckResult,
  AccessGateConfig,
  AccessStrategy,
  CompositeAccessGate,
  AccessDeniedError,
  all,
  any,
} from './AccessGate';

// Strategy implementations
export {
  SurfaceAccessGate,
  PermissionGate,
  LicenseGate,
  RoleGate,
  SuperAdminGate,
  AuthenticatedGate,
  CustomGate,
} from './strategies';

// Factory
export { AccessGateFactory, Gate, gate } from './factory';
