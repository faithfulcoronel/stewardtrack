import { Tenant } from '@/models/tenant.model';

export class TenantValidator {
  static validate(data: Partial<Tenant>): void {
    if (data.name !== undefined && !data.name.trim()) {
      throw new Error('Tenant name is required');
    }
    if (data.subdomain !== undefined && !data.subdomain.trim()) {
      throw new Error('Tenant subdomain is required');
    }
    if (data.status !== undefined && !data.status.trim()) {
      throw new Error('Tenant status is required');
    }
    if (data.subscription_tier !== undefined && !data.subscription_tier.trim()) {
      throw new Error('Subscription tier is required');
    }
    if (data.subscription_status !== undefined && !data.subscription_status.trim()) {
      throw new Error('Subscription status is required');
    }
    if (
      data.billing_cycle !== undefined &&
      data.billing_cycle !== 'monthly' &&
      data.billing_cycle !== 'annual'
    ) {
      throw new Error('Billing cycle must be monthly or annual');
    }
    if (
      data.email !== undefined &&
      data.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    ) {
      throw new Error('Invalid email format');
    }
  }
}
