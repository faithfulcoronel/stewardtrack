/**
 * ================================================================================
 * XENPLATFORM SERVICE
 * ================================================================================
 *
 * Handles Xendit XenPlatform integration for multi-tenant donation handling.
 * Each church tenant gets an "Owned Sub-account" that:
 * - Receives donations directly (isolated balance)
 * - Enables direct bank payouts from sub-account balance
 * - Is fully controlled by StewardTrack (churches don't need Xendit accounts)
 *
 * Key Concepts:
 * - Platform Account: StewardTrack's master Xendit account with XenPlatform enabled
 * - Owned Sub-account: Created per tenant, fully controlled by platform
 * - for-user-id Header: Used in API calls to transact on behalf of sub-account
 *
 * Documentation: https://docs.xendit.co/docs/xenplatform-overview
 *
 * ================================================================================
 */

import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { ITenantRepository } from '@/repositories/tenant.repository';
import type { XenditService } from '@/services/XenditService';

/**
 * Xendit Account (Sub-account) response
 */
export interface XenditSubAccount {
  id: string;
  created: string;
  updated: string;
  type: 'OWNED' | 'MANAGED';
  email: string;
  public_profile: {
    business_name: string;
  };
  country: string;
  status: 'REGISTERED' | 'AWAITING_DOCS' | 'LIVE' | 'SUSPENDED';
}

/**
 * Xendit Balance response
 */
export interface XenditBalance {
  balance: number;
  pending_balance: number;
  currency: string;
}

/**
 * Create sub-account params
 */
export interface CreateSubAccountParams {
  email: string;
  businessName: string;
  type?: 'OWNED';
}

@injectable()
export class XenPlatformService {
  constructor(
    @inject(TYPES.ITenantRepository) private tenantRepository: ITenantRepository,
    @inject(TYPES.XenditService) private xenditService: XenditService
  ) {}

  // ==================== SUB-ACCOUNT MANAGEMENT ====================

  /**
   * Create a new Xendit Owned Sub-account for a tenant.
   * This is called during tenant registration/onboarding.
   *
   * @param tenantId - The tenant ID
   * @param businessName - Church/organization name (shown on payment statements)
   * @param email - Contact email for the sub-account
   * @returns The created sub-account
   */
  async createSubAccount(
    tenantId: string,
    businessName: string,
    email: string
  ): Promise<XenditSubAccount> {
    console.log(`[XenPlatformService] Creating sub-account for tenant ${tenantId}, business: ${businessName}`);

    // Create sub-account via Xendit API
    const subAccount = await this.xenditService.createXenPlatformAccount({
      email,
      type: 'OWNED',
      publicProfile: { business_name: businessName },
    });

    // Update tenant with sub-account ID
    await this.tenantRepository.update(tenantId, {
      xendit_sub_account_id: subAccount.id,
      xendit_sub_account_status: 'active',
    });

    console.log(`[XenPlatformService] Created sub-account ${subAccount.id} for tenant ${tenantId}`);

    return subAccount;
  }

  /**
   * Get sub-account details from Xendit
   *
   * @param subAccountId - The Xendit sub-account ID
   * @returns Sub-account details or null if not found
   */
  async getSubAccount(subAccountId: string): Promise<XenditSubAccount | null> {
    try {
      return await this.xenditService.getXenPlatformAccount(subAccountId);
    } catch (error) {
      console.warn(`[XenPlatformService] Sub-account not found: ${subAccountId}`);
      return null;
    }
  }

  /**
   * Get the balance of a sub-account
   *
   * @param subAccountId - The Xendit sub-account ID
   * @returns Balance information
   */
  async getSubAccountBalance(subAccountId: string): Promise<XenditBalance> {
    return await this.xenditService.getBalanceForSubAccount(subAccountId);
  }

  // ==================== TENANT HELPERS ====================

  /**
   * Get the Xendit sub-account ID for a tenant
   *
   * @param tenantId - The tenant ID
   * @returns Sub-account ID or null if not configured
   */
  async getTenantSubAccountId(tenantId: string): Promise<string | null> {
    const tenant = await this.tenantRepository.findById(tenantId);
    return tenant?.xendit_sub_account_id || null;
  }

  /**
   * Check if a tenant has an active Xendit sub-account
   *
   * @param tenantId - The tenant ID
   * @returns True if sub-account exists and is active
   */
  async hasTenantSubAccount(tenantId: string): Promise<boolean> {
    const tenant = await this.tenantRepository.findById(tenantId);
    return !!(
      tenant?.xendit_sub_account_id &&
      tenant?.xendit_sub_account_status === 'active'
    );
  }

  /**
   * Get sub-account details and balance for a tenant
   * Used for displaying status in admin UI
   *
   * @param tenantId - The tenant ID
   * @returns Sub-account status with balance, or null if not configured
   */
  async getTenantSubAccountStatus(tenantId: string): Promise<{
    subAccountId: string;
    status: string;
    balance: number;
    pendingBalance: number;
    currency: string;
  } | null> {
    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant?.xendit_sub_account_id) {
      return null;
    }

    try {
      const balance = await this.getSubAccountBalance(tenant.xendit_sub_account_id);

      return {
        subAccountId: tenant.xendit_sub_account_id,
        status: tenant.xendit_sub_account_status || 'pending',
        balance: balance.balance,
        pendingBalance: balance.pending_balance,
        currency: balance.currency,
      };
    } catch (error) {
      console.error(`[XenPlatformService] Failed to get balance for tenant ${tenantId}:`, error);

      // Return basic info even if balance fetch fails
      return {
        subAccountId: tenant.xendit_sub_account_id,
        status: tenant.xendit_sub_account_status || 'pending',
        balance: 0,
        pendingBalance: 0,
        currency: 'PHP',
      };
    }
  }

  // ==================== PROVISIONING ====================

  /**
   * Provision XenPlatform sub-account for a newly registered tenant.
   * Called automatically during tenant onboarding.
   *
   * @param tenantId - The tenant ID
   * @param businessName - Church name
   * @param adminEmail - Admin's email address
   * @returns The created sub-account or null if provisioning fails
   */
  async provisionTenantSubAccount(
    tenantId: string,
    businessName: string,
    adminEmail: string
  ): Promise<XenditSubAccount | null> {
    // Check if already provisioned
    const existing = await this.getTenantSubAccountId(tenantId);
    if (existing) {
      console.log(`[XenPlatformService] Tenant ${tenantId} already has sub-account ${existing}`);
      return await this.getSubAccount(existing);
    }

    try {
      return await this.createSubAccount(tenantId, businessName, adminEmail);
    } catch (error) {
      console.error(`[XenPlatformService] Failed to provision sub-account for tenant ${tenantId}:`, error);

      // Mark tenant as pending sub-account creation
      await this.tenantRepository.update(tenantId, {
        xendit_sub_account_status: 'pending',
      });

      return null;
    }
  }

  /**
   * Retry sub-account creation for tenants that failed during initial provisioning
   *
   * @param tenantId - The tenant ID
   * @returns The created sub-account or null if retry fails
   */
  async retrySubAccountCreation(tenantId: string): Promise<XenditSubAccount | null> {
    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    if (tenant.xendit_sub_account_id && tenant.xendit_sub_account_status === 'active') {
      console.log(`[XenPlatformService] Tenant ${tenantId} already has active sub-account`);
      return await this.getSubAccount(tenant.xendit_sub_account_id);
    }

    // Get admin email for the tenant
    const adminEmail = tenant.email || `tenant-${tenantId}@stewardtrack.app`;

    return await this.createSubAccount(tenantId, tenant.name, adminEmail);
  }
}
