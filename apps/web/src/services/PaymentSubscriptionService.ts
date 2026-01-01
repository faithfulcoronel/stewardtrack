import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import { PaymentService } from './PaymentService';
import { LicensingService } from './LicensingService';
import { TenantService } from './TenantService';

/**
 * Payment Subscription Service
 *
 * Manages payment-related subscription lifecycle for tenants including:
 * - Activation/deactivation
 * - Plan upgrades/downgrades
 * - Cancellation and renewal
 * - Grace periods and suspensions
 */

export interface SubscriptionStatus {
  tenant_id: string;
  subscription_status: 'active' | 'inactive' | 'suspended' | 'cancelled' | 'trialing';
  subscription_tier: string;
  billing_cycle: 'monthly' | 'annual' | null;
  subscription_offering_id: string | null;
  subscription_end_date: string | null;
  payment_status: string;
  last_payment_date: string | null;
  next_billing_date: string | null;
  payment_failed_count: number;
}

export interface SubscriptionUpdateParams {
  subscription_status?: SubscriptionStatus['subscription_status'];
  subscription_tier?: string;
  billing_cycle?: 'monthly' | 'annual';
  subscription_offering_id?: string;
  subscription_end_date?: string | null;
  payment_status?: string;
  last_payment_date?: string | null;
  next_billing_date?: string | null;
  xendit_customer_id?: string;
  xendit_subscription_id?: string;
}

@injectable()
export class PaymentSubscriptionService {
  constructor(
    @inject(TYPES.PaymentService) private paymentService: PaymentService,
    @inject(TYPES.LicensingService) private licensingService: LicensingService,
    @inject(TYPES.TenantService) private tenantService: TenantService
  ) {}

  /**
   * Get subscription status for a tenant
   *
   * @param tenantId Tenant ID (optional - uses current tenant from context if not provided)
   * @returns Subscription status
   */
  async getSubscriptionStatus(tenantId?: string): Promise<SubscriptionStatus> {
    // Use TenantService to get cached tenant (avoids unnecessary DB query)
    const tenant = await this.tenantService.getCurrentTenant();

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Verify tenantId matches if provided
    if (tenantId && tenant.id !== tenantId) {
      throw new Error('Tenant ID mismatch');
    }

    return {
      tenant_id: tenant.id,
      subscription_status: tenant.subscription_status as SubscriptionStatus['subscription_status'],
      subscription_tier: tenant.subscription_tier,
      billing_cycle: tenant.billing_cycle,
      subscription_offering_id: tenant.subscription_offering_id || null,
      subscription_end_date: tenant.subscription_end_date || null,
      payment_status: tenant.payment_status || 'pending',
      last_payment_date: tenant.last_payment_date || null,
      next_billing_date: tenant.next_billing_date || null,
      payment_failed_count: tenant.payment_failed_count || 0,
    };
  }

  /**
   * Update subscription status
   *
   * @param tenantId Tenant ID
   * @param updates Subscription fields to update
   */
  async updateSubscription(
    tenantId: string,
    updates: SubscriptionUpdateParams
  ): Promise<void> {
    const supabase = await this.getSupabase();

    const { error } = await supabase
      .from('tenants')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (error) {
      throw new Error(`Failed to update subscription: ${error.message}`);
    }
  }

  /**
   * Activate subscription after successful payment
   *
   * @param tenantId Tenant ID
   * @param offeringId Product offering ID
   * @param paidAt Payment date
   */
  async activateSubscription(
    tenantId: string,
    offeringId: string,
    paidAt: Date = new Date()
  ): Promise<void> {
    const supabase = await this.getSupabase();

    // Get offering details
    const { data: offering, error: offeringError } = await supabase
      .from('product_offerings')
      .select('tier, billing_cycle')
      .eq('id', offeringId)
      .single();

    if (offeringError) {
      throw new Error(`Failed to fetch offering: ${offeringError.message}`);
    }

    // Calculate next billing date
    const nextBillingDate = new Date(paidAt);
    if (offering.billing_cycle === 'monthly') {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (offering.billing_cycle === 'annual') {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // Update tenant subscription
    await this.updateSubscription(tenantId, {
      subscription_status: 'active',
      subscription_tier: offering.tier,
      billing_cycle: offering.billing_cycle,
      subscription_offering_id: offeringId,
      payment_status: 'paid',
      last_payment_date: paidAt.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
    });

    // Provision license features
    await this.licensingService.provisionTenantLicense(tenantId, offeringId);
  }

  /**
   * Suspend subscription due to payment failure
   *
   * @param tenantId Tenant ID
   * @param reason Suspension reason
   */
  async suspendSubscription(tenantId: string, reason: string): Promise<void> {
    await this.updateSubscription(tenantId, {
      subscription_status: 'suspended',
      payment_status: 'failed',
    });

    // TODO: Send notification email to tenant admin
    console.log(`Subscription suspended for tenant ${tenantId}: ${reason}`);
  }

  /**
   * Cancel subscription
   *
   * @param tenantId Tenant ID
   * @param immediate If true, cancel immediately; otherwise at end of billing period
   */
  async cancelSubscription(
    tenantId: string,
    immediate: boolean = false
  ): Promise<void> {
    const status = await this.getSubscriptionStatus(tenantId);

    if (immediate) {
      await this.updateSubscription(tenantId, {
        subscription_status: 'cancelled',
        subscription_end_date: new Date().toISOString(),
      });

      // Revoke all features immediately
      const supabase = await this.getSupabase();
      await supabase
        .from('tenant_feature_grants')
        .update({ revoked: true, revoked_at: new Date().toISOString() })
        .eq('tenant_id', tenantId);
    } else {
      // Set to cancel at end of billing period
      await this.updateSubscription(tenantId, {
        subscription_status: 'cancelled',
        subscription_end_date: status.next_billing_date || new Date().toISOString(),
      });
    }
  }

  /**
   * Reactivate a cancelled or suspended subscription
   *
   * @param tenantId Tenant ID
   * @param offeringId New offering ID (optional, uses current if not provided)
   */
  async reactivateSubscription(
    tenantId: string,
    offeringId?: string
  ): Promise<void> {
    const status = await this.getSubscriptionStatus(tenantId);

    const targetOfferingId = offeringId || status.subscription_offering_id;

    if (!targetOfferingId) {
      throw new Error('No offering specified for reactivation');
    }

    // Create a new payment invoice
    const supabase = await this.getSupabase();
    const { data: offering } = await supabase
      .from('product_offerings')
      .select('name, base_price')
      .eq('id', targetOfferingId)
      .single();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenantId)
      .single();

    const { data: adminUser } = await supabase
      .from('tenant_users')
      .select('profiles(email, first_name, last_name)')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (!offering || !tenant || !adminUser) {
      throw new Error('Failed to fetch tenant or offering details');
    }

    const profile = (adminUser as any).profiles;
    const payerName = `${profile.first_name} ${profile.last_name}`.trim();
    const payerEmail = profile.email;

    // Create payment invoice
    await this.paymentService.createSubscriptionPayment({
      tenantId,
      offeringId: targetOfferingId,
      offeringName: offering.name,
      amount: offering.base_price,
      payerEmail,
      payerName,
      billingCycle: status.billing_cycle || 'monthly',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/success`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/failed`,
    });
  }

  /**
   * Upgrade or downgrade subscription plan
   *
   * @param tenantId Tenant ID
   * @param newOfferingId New product offering ID
   * @param prorated Apply prorated pricing
   */
  async changeSubscriptionPlan(
    tenantId: string,
    newOfferingId: string,
    prorated: boolean = true
  ): Promise<void> {
    const supabase = await this.getSupabase();

    // Get current and new offerings
    const currentStatus = await this.getSubscriptionStatus(tenantId);
    const { data: newOffering, error: offeringError } = await supabase
      .from('product_offerings')
      .select('*')
      .eq('id', newOfferingId)
      .single();

    if (offeringError || !newOffering) {
      throw new Error('Invalid offering ID');
    }

    // Calculate prorated amount if applicable
    let paymentAmount = newOffering.base_price;

    if (prorated && currentStatus.next_billing_date) {
      const now = new Date();
      const nextBilling = new Date(currentStatus.next_billing_date);
      const daysRemaining = Math.ceil(
        (nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalDays =
        newOffering.billing_cycle === 'monthly' ? 30 : 365;

      // Prorate based on remaining days
      paymentAmount = (newOffering.base_price * daysRemaining) / totalDays;
    }

    // Get tenant admin for payment
    const { data: adminUser } = await supabase
      .from('tenant_users')
      .select('profiles(email, first_name, last_name)')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (!adminUser) {
      throw new Error('No admin user found for tenant');
    }

    const profile = (adminUser as any).profiles;
    const payerName = `${profile.first_name} ${profile.last_name}`.trim();
    const payerEmail = profile.email;

    // Create payment for new plan
    const { invoice } = await this.paymentService.createSubscriptionPayment({
      tenantId,
      offeringId: newOfferingId,
      offeringName: newOffering.name,
      amount: paymentAmount,
      payerEmail,
      payerName,
      billingCycle: newOffering.billing_cycle,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/success`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/failed`,
    });

    // Payment will be processed via webhook, which will activate the new plan
  }

  /**
   * Check if subscription needs renewal
   *
   * @param tenantId Tenant ID
   * @returns True if subscription is due for renewal
   */
  async needsRenewal(tenantId: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(tenantId);

    if (!status.next_billing_date) {
      return false;
    }

    const nextBilling = new Date(status.next_billing_date);
    const now = new Date();

    // Check if within 7 days of renewal
    const daysUntilRenewal = Math.ceil(
      (nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilRenewal <= 7;
  }

  /**
   * Process subscription renewal
   *
   * @param tenantId Tenant ID
   */
  async processRenewal(tenantId: string): Promise<void> {
    const status = await this.getSubscriptionStatus(tenantId);

    if (!status.subscription_offering_id) {
      throw new Error('No active offering for renewal');
    }

    const supabase = await this.getSupabase();
    const { data: offering } = await supabase
      .from('product_offerings')
      .select('name, base_price')
      .eq('id', status.subscription_offering_id)
      .single();

    const { data: adminUser } = await supabase
      .from('tenant_users')
      .select('profiles(email, first_name, last_name)')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single();

    if (!offering || !adminUser) {
      throw new Error('Failed to fetch renewal details');
    }

    const profile = (adminUser as any).profiles;
    const payerName = `${profile.first_name} ${profile.last_name}`.trim();
    const payerEmail = profile.email;

    // Create renewal payment
    await this.paymentService.createSubscriptionPayment({
      tenantId,
      offeringId: status.subscription_offering_id,
      offeringName: offering.name,
      amount: offering.base_price,
      payerEmail,
      payerName,
      billingCycle: status.billing_cycle || 'monthly',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/success`,
      failureUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/billing/failed`,
    });
  }

  /**
   * Handle payment failure
   *
   * @param tenantId Tenant ID
   * @param failureReason Reason for failure
   */
  async handlePaymentFailure(
    tenantId: string,
    failureReason: string
  ): Promise<void> {
    const supabase = await this.getSupabase();

    // Increment failure count
    const { data: tenant } = await supabase
      .from('tenants')
      .select('payment_failed_count')
      .eq('id', tenantId)
      .single();

    const failureCount = (tenant?.payment_failed_count || 0) + 1;

    await supabase
      .from('tenants')
      .update({
        payment_failed_count: failureCount,
        payment_failure_reason: failureReason,
        payment_status: 'failed',
      })
      .eq('id', tenantId);

    // Suspend after 3 failed attempts
    if (failureCount >= 3) {
      await this.suspendSubscription(tenantId, 'Multiple payment failures');
    }

    // TODO: Send payment failure notification email
  }

  /**
   * Get subscription health status
   *
   * @param tenantId Tenant ID
   * @returns Health status with recommendations
   */
  async getSubscriptionHealth(tenantId: string): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const status = await this.getSubscriptionStatus(tenantId);
    const issues: string[] = [];
    const recommendations: string[] = [];
    let healthStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check subscription status
    if (status.subscription_status === 'suspended') {
      healthStatus = 'critical';
      issues.push('Subscription is suspended');
      recommendations.push('Contact support or update payment method');
    } else if (status.subscription_status === 'cancelled') {
      healthStatus = 'critical';
      issues.push('Subscription is cancelled');
      recommendations.push('Reactivate subscription to continue service');
    }

    // Check payment failures
    if (status.payment_failed_count > 0) {
      healthStatus = status.payment_failed_count >= 2 ? 'critical' : 'warning';
      issues.push(`${status.payment_failed_count} payment failure(s)`);
      recommendations.push('Update payment method to avoid suspension');
    }

    // Check renewal date
    if (status.next_billing_date) {
      const daysUntilRenewal = Math.ceil(
        (new Date(status.next_billing_date).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      );

      if (daysUntilRenewal <= 7) {
        healthStatus = healthStatus === 'healthy' ? 'warning' : healthStatus;
        issues.push(`Renewal due in ${daysUntilRenewal} days`);
        recommendations.push('Ensure payment method is up to date');
      }
    }

    return {
      status: healthStatus,
      issues,
      recommendations,
    };
  }
}
