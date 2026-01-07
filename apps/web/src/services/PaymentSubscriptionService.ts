import { injectable, inject } from 'inversify';
import 'reflect-metadata';
import { TYPES } from '@/lib/types';
import { PaymentService } from './PaymentService';
import { LicensingService } from './LicensingService';
import { TenantService } from './TenantService';
import type { ITenantRepository, SubscriptionUpdateParams } from '@/repositories/tenant.repository';

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

@injectable()
export class PaymentSubscriptionService {
  constructor(
    @inject(TYPES.PaymentService) private paymentService: PaymentService,
    @inject(TYPES.LicensingService) private licensingService: LicensingService,
    @inject(TYPES.TenantService) private tenantService: TenantService,
    @inject(TYPES.ITenantRepository)
        private tenantRepository: ITenantRepository,
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
    await this.tenantRepository.updateSubscriptionFields(tenantId, updates);
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
    // Get offering details via LicensingService
    const offering = await this.licensingService.getProductOffering(offeringId);

    if (!offering) {
      throw new Error(`Failed to fetch offering: ${offeringId}`);
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
      billing_cycle: offering.billing_cycle as 'monthly' | 'annual',
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
      await this.tenantRepository.revokeAllFeatureGrants(tenantId);
    } else {
      // Set to cancel at end of billing period
      await this.updateSubscription(tenantId, {
        subscription_status: 'cancelled',
        subscription_end_date: status.next_billing_date || new Date().toISOString(),
      });
    }
  }

  /**
   * Get the price for an offering in the tenant's preferred currency
   * Falls back to primary currency (PHP) if no price found
   */
  private async getOfferingPrice(
    offeringId: string,
    preferredCurrency: string = 'PHP'
  ): Promise<{ price: number; currency: string }> {
    const prices = await this.licensingService.getOfferingPrices(offeringId);

    if (!prices || prices.length === 0) {
      return { price: 0, currency: preferredCurrency };
    }

    // Try to find price in preferred currency
    const priceInCurrency = prices.find(p => p.currency === preferredCurrency && p.is_active);
    if (priceInCurrency) {
      return { price: priceInCurrency.price, currency: priceInCurrency.currency };
    }

    // Fall back to first active price
    const firstActivePrice = prices.find(p => p.is_active);
    if (firstActivePrice) {
      return { price: firstActivePrice.price, currency: firstActivePrice.currency };
    }

    return { price: 0, currency: preferredCurrency };
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

    // Get offering details via LicensingService
    const offering = await this.licensingService.getProductOffering(targetOfferingId);
    if (!offering) {
      throw new Error('Failed to fetch offering details');
    }

    // Get tenant details
    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('Failed to fetch tenant details');
    }

    // Get price for this offering in tenant's preferred currency
    const tenantCurrency = (tenant as any).preferred_currency || 'PHP';
    const priceInfo = await this.getOfferingPrice(targetOfferingId, tenantCurrency);

    // Get tenant admin info
    const adminUser = await this.tenantRepository.getTenantAdmin(tenantId);

    if (!adminUser) {
      throw new Error('Failed to fetch admin user details');
    }

    const payerName = `${adminUser.first_name} ${adminUser.last_name}`.trim();
    const payerEmail = adminUser.email;
    const externalId = `SUB-${tenantId}-${Date.now()}`;
    // Create payment invoice
    await this.paymentService.createSubscriptionPayment({
      tenantId,
      externalId: externalId,
      offeringId: targetOfferingId,
      offeringName: offering.name,
      amount: priceInfo.price,
      currency: priceInfo.currency,
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
    // Get current status
    const currentStatus = await this.getSubscriptionStatus(tenantId);

    // Get new offering via LicensingService
    const newOffering = await this.licensingService.getProductOffering(newOfferingId);
    if (!newOffering) {
      throw new Error('Invalid offering ID');
    }

    // Get tenant for preferred currency
    const tenant = await this.tenantService.getCurrentTenant();
    const tenantCurrency = (tenant as any)?.preferred_currency || 'PHP';

    // Get price for new offering
    const priceInfo = await this.getOfferingPrice(newOfferingId, tenantCurrency);

    // Calculate prorated amount if applicable
    let paymentAmount = priceInfo.price;

    if (prorated && currentStatus.next_billing_date) {
      const now = new Date();
      const nextBilling = new Date(currentStatus.next_billing_date);
      const daysRemaining = Math.ceil(
        (nextBilling.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      const totalDays = newOffering.billing_cycle === 'monthly' ? 30 : 365;

      // Prorate based on remaining days
      paymentAmount = (priceInfo.price * daysRemaining) / totalDays;
    }

    // Get tenant admin for payment
    const adminUser = await this.tenantRepository.getTenantAdmin(tenantId);

    if (!adminUser) {
      throw new Error('No admin user found for tenant');
    }

    const payerName = `${adminUser.first_name} ${adminUser.last_name}`.trim();
    const payerEmail = adminUser.email;
    const externalId = `SUB-${tenantId}-${Date.now()}`;

    // Create payment for new plan
    await this.paymentService.createSubscriptionPayment({
      tenantId,
      externalId: externalId,
      offeringId: newOfferingId,
      offeringName: newOffering.name,
      amount: paymentAmount,
      currency: priceInfo.currency,
      payerEmail,
      payerName,
      billingCycle: newOffering.billing_cycle || 'monthly',
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

    // Get offering via LicensingService
    const offering = await this.licensingService.getProductOffering(status.subscription_offering_id);
    if (!offering) {
      throw new Error('Failed to fetch offering details');
    }

    // Get tenant for preferred currency
    const tenant = await this.tenantService.getCurrentTenant();
    const tenantCurrency = (tenant as any)?.preferred_currency || 'PHP';

    // Get price for this offering
    const priceInfo = await this.getOfferingPrice(status.subscription_offering_id, tenantCurrency);

    // Get tenant admin info
    const adminUser = await this.tenantRepository.getTenantAdmin(tenantId);

    if (!adminUser) {
      throw new Error('Failed to fetch admin user details');
    }

    const payerName = `${adminUser.first_name} ${adminUser.last_name}`.trim();
    const payerEmail = adminUser.email;
    const externalId = `SUB-${tenantId}-${Date.now()}`;

    // Create renewal payment
    await this.paymentService.createSubscriptionPayment({
      tenantId,
      externalId: externalId,
      offeringId: status.subscription_offering_id,
      offeringName: offering.name,
      amount: priceInfo.price,
      currency: priceInfo.currency,
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
    // Get current failure count
    const currentFailureCount = await this.tenantRepository.getPaymentFailedCount(tenantId);
    const newFailureCount = currentFailureCount + 1;

    // Update tenant with new failure count
    await this.tenantRepository.updateSubscriptionFields(tenantId, {
      payment_failed_count: newFailureCount,
      payment_failure_reason: failureReason,
      payment_status: 'failed',
    });

    // Suspend after 3 failed attempts
    if (newFailureCount >= 3) {
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
