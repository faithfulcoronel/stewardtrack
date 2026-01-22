/**
 * UserContext Value Object
 * Represents the user's current church/ministry context in StewardTrack
 *
 * Value Object characteristics:
 * - Immutable
 * - Defined by its attributes
 * - No identity
 */

export interface TenantContext {
  id: string;
  name: string;
  slug?: string;
}

export interface MinistryContext {
  id: string;
  name: string;
  tenantId: string;
}

export interface CenterContext {
  id: string;
  name: string;
  tenantId: string;
}

export class UserContext {
  private constructor(
    public readonly tenant?: TenantContext,
    public readonly selectedMinistry?: MinistryContext,
    public readonly selectedCenter?: CenterContext
  ) {}

  /**
   * Create a UserContext with tenant
   */
  static withTenant(tenant: TenantContext): UserContext {
    return new UserContext(tenant, undefined, undefined);
  }

  /**
   * Create a UserContext with ministry
   */
  static withMinistry(tenant: TenantContext, ministry: MinistryContext): UserContext {
    return new UserContext(tenant, ministry, undefined);
  }

  /**
   * Create a UserContext with center
   */
  static withCenter(tenant: TenantContext, center: CenterContext): UserContext {
    return new UserContext(tenant, undefined, center);
  }

  /**
   * Create a UserContext with ministry and center
   */
  static withMinistryAndCenter(
    tenant: TenantContext,
    ministry: MinistryContext,
    center: CenterContext
  ): UserContext {
    return new UserContext(tenant, ministry, center);
  }

  /**
   * Create empty UserContext
   */
  static empty(): UserContext {
    return new UserContext(undefined, undefined, undefined);
  }

  /**
   * Check if context has any data set
   */
  hasContext(): boolean {
    return !!(this.tenant || this.selectedMinistry || this.selectedCenter);
  }

  /**
   * Get tenant ID
   */
  getTenantId(): string | undefined {
    return (
      this.tenant?.id || this.selectedMinistry?.tenantId || this.selectedCenter?.tenantId
    );
  }

  /**
   * Format context as string for display
   */
  toString(): string {
    const parts: string[] = [];

    if (this.tenant) {
      parts.push(this.tenant.name);
    }

    if (this.selectedCenter) {
      parts.push(`Center: ${this.selectedCenter.name}`);
    }

    if (this.selectedMinistry) {
      parts.push(`Ministry: ${this.selectedMinistry.name}`);
    }

    return parts.length > 0 ? parts.join(' / ') : 'No context set';
  }

  /**
   * Convert to plain object (for serialization)
   */
  toJSON() {
    return {
      tenant: this.tenant,
      selectedMinistry: this.selectedMinistry,
      selectedCenter: this.selectedCenter,
    };
  }

  /**
   * Create from plain object (for deserialization)
   */
  static fromJSON(json: any): UserContext {
    return new UserContext(json.tenant, json.selectedMinistry, json.selectedCenter);
  }
}
