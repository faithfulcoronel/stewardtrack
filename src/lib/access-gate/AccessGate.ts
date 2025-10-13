/**
 * Access Gate System
 *
 * A comprehensive access control system using design patterns to provide
 * simple, reusable access gates for pages, features, and sections.
 *
 * Design Patterns Used:
 * - Strategy Pattern: Different access check strategies (RBAC, Licensing, Combined)
 * - Chain of Responsibility: Chaining multiple access checks
 * - Factory Pattern: Creating access gates with different configurations
 * - Decorator Pattern: Adding additional checks to existing gates
 */

import 'server-only';

/**
 * Result of an access check with detailed information
 */
export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiresUpgrade?: boolean;
  missingPermissions?: string[];
  lockedFeatures?: string[];
  redirectTo?: string;
}

/**
 * Configuration for access gates
 */
export interface AccessGateConfig {
  requireAll?: boolean;  // Default: true (AND logic), false for OR logic
  fallbackPath?: string; // Where to redirect if access denied
  gracefulFail?: boolean; // Return false instead of throwing error
}

/**
 * Strategy interface for different access check types
 */
export interface AccessStrategy {
  check(userId: string, tenantId?: string): Promise<AccessCheckResult>;
  name: string;
}

/**
 * Base Access Gate - Strategy Pattern Implementation
 */
export abstract class AccessGate {
  protected config: AccessGateConfig;

  constructor(config: AccessGateConfig = {}) {
    this.config = {
      requireAll: true,
      gracefulFail: false,
      ...config,
    };
  }

  /**
   * Check access for a user
   */
  abstract check(userId: string, tenantId?: string): Promise<AccessCheckResult>;

  /**
   * Verify access or throw error
   */
  async verify(userId: string, tenantId?: string): Promise<void> {
    const result = await this.check(userId, tenantId);
    if (!result.allowed) {
      if (this.config.gracefulFail) {
        return;
      }
      throw new AccessDeniedError(
        result.reason || 'Access denied',
        result.redirectTo || this.config.fallbackPath
      );
    }
  }

  /**
   * Check if user has access (returns boolean)
   */
  async allows(userId: string, tenantId?: string): Promise<boolean> {
    const result = await this.check(userId, tenantId);
    return result.allowed;
  }
}

/**
 * Custom error for access denial
 */
export class AccessDeniedError extends Error {
  public redirectTo?: string;

  constructor(message: string, redirectTo?: string) {
    super(message);
    this.name = 'AccessDeniedError';
    this.redirectTo = redirectTo;
  }
}

/**
 * Chain of Responsibility - Combine multiple access gates
 */
export class CompositeAccessGate extends AccessGate {
  private gates: AccessGate[];

  constructor(gates: AccessGate[], config: AccessGateConfig = {}) {
    super(config);
    this.gates = gates;
  }

  async check(userId: string, tenantId?: string): Promise<AccessCheckResult> {
    const results: AccessCheckResult[] = [];

    for (const gate of this.gates) {
      const result = await gate.check(userId, tenantId);
      results.push(result);

      // Short-circuit if requireAll is true and we hit a denial
      if (this.config.requireAll && !result.allowed) {
        return this.combineResults(results, true);
      }

      // Short-circuit if requireAll is false and we find access
      if (!this.config.requireAll && result.allowed) {
        return { allowed: true };
      }
    }

    return this.combineResults(results, this.config.requireAll || false);
  }

  private combineResults(results: AccessCheckResult[], requireAll: boolean): AccessCheckResult {
    if (requireAll) {
      // AND logic - all must pass
      const denied = results.find(r => !r.allowed);
      if (denied) {
        return {
          allowed: false,
          reason: denied.reason,
          requiresUpgrade: results.some(r => r.requiresUpgrade),
          missingPermissions: results.flatMap(r => r.missingPermissions || []),
          lockedFeatures: results.flatMap(r => r.lockedFeatures || []),
          redirectTo: denied.redirectTo || this.config.fallbackPath,
        };
      }
      return { allowed: true };
    } else {
      // OR logic - at least one must pass
      const allowed = results.find(r => r.allowed);
      if (allowed) {
        return { allowed: true };
      }
      // All denied
      return {
        allowed: false,
        reason: 'No sufficient access found',
        missingPermissions: results.flatMap(r => r.missingPermissions || []),
        redirectTo: this.config.fallbackPath,
      };
    }
  }
}

/**
 * Utility to create composite gates with AND logic
 */
export function all(...gates: AccessGate[]): CompositeAccessGate {
  return new CompositeAccessGate(gates, { requireAll: true });
}

/**
 * Utility to create composite gates with OR logic
 */
export function any(...gates: AccessGate[]): CompositeAccessGate {
  return new CompositeAccessGate(gates, { requireAll: false });
}
