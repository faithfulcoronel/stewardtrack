/**
 * GraphQL Resolvers for Account Queries and Mutations
 *
 * Implements efficient database queries with caching for accounts
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IAccountAdapter } from '@/adapters/account.adapter';
import type { IMemberRepository } from '@/repositories/member.repository';
import { tenantUtils } from '@/utils/tenantUtils';
import { Account } from '@/models/account.model';

export interface SearchAccountsArgs {
  searchTerm?: string;
  accountType?: 'organization' | 'person';
  isActive?: boolean;
  memberId?: string;
  limit?: number;
}

export interface GetAccountArgs {
  id: string;
}

export interface GetAccountByMemberArgs {
  memberId: string;
}

export interface CreateAccountInput {
  name: string;
  account_type: 'organization' | 'person';
  account_number?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_id?: string;
  is_active?: boolean;
  notes?: string;
  member_id?: string;
}

export interface UpdateAccountInput {
  name?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  tax_id?: string;
  is_active?: boolean;
  notes?: string;
  member_id?: string;
}

/**
 * Helper function to enrich account with member data
 */
async function enrichAccountWithMember(account: Account): Promise<Account> {
  if (!account.member_id) {
    return account;
  }

  const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
  const member = await memberRepo.findById(account.member_id);

  return {
    ...account,
    member: member || undefined,
  };
}

export const accountResolvers = {
  Query: {
    /**
     * Search accounts with caching optimization
     */
    searchAccounts: async (_: any, args: SearchAccountsArgs) => {
      const { searchTerm, accountType, isActive, memberId, limit = 50 } = args;

      console.log(`[GraphQL] searchAccounts: term="${searchTerm}", type=${accountType}, active=${isActive}, memberId=${memberId}, limit=${limit}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      // Build filter conditions
      const filters: Record<string, any> = {};

      if (accountType) {
        filters.account_type = { operator: 'eq', value: accountType };
      }

      if (isActive !== undefined) {
        filters.is_active = { operator: 'eq', value: isActive };
      }

      if (memberId) {
        filters.member_id = { operator: 'eq', value: memberId };
      }

      // Text search across name
      if (searchTerm) {
        filters.name = { operator: 'ilike', value: `%${searchTerm}%` };
      }

      const { data: accounts } = await accountAdapter.fetch({
        filters,
        pagination: { page: 1, pageSize: limit },
      });

      // Enrich with member data
      const enrichedAccounts = await Promise.all(
        accounts.map(account => enrichAccountWithMember(account))
      );

      console.log(`[GraphQL] searchAccounts: found ${enrichedAccounts.length} accounts`);

      return enrichedAccounts;
    },

    /**
     * Get a specific account by ID
     */
    getAccount: async (_: any, args: GetAccountArgs) => {
      const { id } = args;

      console.log(`[GraphQL] getAccount: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);
      const account = await accountAdapter.fetchById(id);

      if (!account) {
        console.log(`[GraphQL] getAccount: not found`);
        return null;
      }

      const enrichedAccount = await enrichAccountWithMember(account);

      console.log(`[GraphQL] getAccount: found`);

      return enrichedAccount;
    },

    /**
     * Get account by member ID
     */
    getAccountByMember: async (_: any, args: GetAccountByMemberArgs) => {
      const { memberId } = args;

      console.log(`[GraphQL] getAccountByMember: memberId=${memberId}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      const { data: accounts } = await accountAdapter.fetch({
        filters: { member_id: { operator: 'eq', value: memberId } },
        pagination: { page: 1, pageSize: 1 },
      });

      if (!accounts || accounts.length === 0) {
        console.log(`[GraphQL] getAccountByMember: not found`);
        return null;
      }

      const enrichedAccount = await enrichAccountWithMember(accounts[0]);

      console.log(`[GraphQL] getAccountByMember: found`);

      return enrichedAccount;
    },

    /**
     * Get account statistics
     */
    getAccountStats: async () => {
      console.log(`[GraphQL] getAccountStats`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      // Get all accounts
      const { data: allAccounts } = await accountAdapter.fetch({});

      // Calculate statistics
      const total = allAccounts.length;
      const active = allAccounts.filter(a => a.is_active).length;
      const inactive = total - active;

      // Group by account type
      const byType = allAccounts.reduce((acc: any, account) => {
        const type = account.account_type;
        if (!acc[type]) {
          acc[type] = 0;
        }
        acc[type]++;
        return acc;
      }, {});

      const typeStats = Object.entries(byType).map(([type, count]) => ({
        account_type: type,
        count,
      }));

      // Count accounts with members
      const withMembers = allAccounts.filter(a => a.member_id).length;

      console.log(`[GraphQL] getAccountStats: retrieved statistics`);

      return {
        total,
        active,
        inactive,
        by_type: typeStats,
        with_members: withMembers,
      };
    },
  },

  Mutation: {
    /**
     * Create a new account
     */
    createAccount: async (_: any, { input }: { input: CreateAccountInput }) => {
      console.log(`[GraphQL] createAccount: name="${input.name}", type="${input.account_type}"`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      // Generate account number if not provided
      const accountNumber = input.account_number || `ACC-${Date.now()}`;

      const account = await accountAdapter.create({
        ...input,
        account_number: accountNumber,
        tenant_id: tenantId,
        is_active: input.is_active !== undefined ? input.is_active : true,
      });

      const enrichedAccount = await enrichAccountWithMember(account);

      console.log(`[GraphQL] createAccount: created account ${account.id}`);

      return enrichedAccount;
    },

    /**
     * Update an existing account
     */
    updateAccount: async (_: any, { id, input }: { id: string; input: UpdateAccountInput }) => {
      console.log(`[GraphQL] updateAccount: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      const account = await accountAdapter.update(id, input);

      const enrichedAccount = await enrichAccountWithMember(account);

      console.log(`[GraphQL] updateAccount: updated account ${id}`);

      return enrichedAccount;
    },

    /**
     * Deactivate an account
     */
    deactivateAccount: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] deactivateAccount: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      const account = await accountAdapter.update(id, { is_active: false });

      const enrichedAccount = await enrichAccountWithMember(account);

      console.log(`[GraphQL] deactivateAccount: deactivated account ${id}`);

      return enrichedAccount;
    },

    /**
     * Activate an account
     */
    activateAccount: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] activateAccount: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      const account = await accountAdapter.update(id, { is_active: true });

      const enrichedAccount = await enrichAccountWithMember(account);

      console.log(`[GraphQL] activateAccount: activated account ${id}`);

      return enrichedAccount;
    },

    /**
     * Delete an account (soft delete)
     */
    deleteAccount: async (_: any, { id }: { id: string }) => {
      console.log(`[GraphQL] deleteAccount: id=${id}`);

      const tenantId = await tenantUtils.getTenantId();

      if (!tenantId) {
        throw new Error('No tenant context available');
      }

      const accountAdapter = container.get<IAccountAdapter>(TYPES.IAccountAdapter);

      await accountAdapter.delete(id);

      console.log(`[GraphQL] deleteAccount: deleted account ${id}`);

      return true;
    },
  },
};
