/**
 * GraphQL Resolvers for Member, Family, Care Plan, and Discipleship Plan Queries
 *
 * Implements efficient database queries with caching
 * Note: Member names are encrypted, so we cache decrypted results
 */

import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { IMemberRepository } from '@/repositories/member.repository';
import { memberCache } from './memberCache';
import { tenantUtils } from '@/utils/tenantUtils';
import { Member } from '@/models/member.model';
import { familyResolvers } from './familyResolvers';
import { carePlanResolvers } from './carePlanResolvers';
import { discipleshipPlanResolvers } from './discipleshipPlanResolvers';
import { accountResolvers } from './accountResolvers';
import { financialTransactionResolvers } from './financialTransactionResolvers';

export interface SearchMembersArgs {
  searchTerm: string;
  gender?: string;
  maritalStatus?: string;
  limit?: number;
}

export interface GetMemberArgs {
  id?: string;
  email?: string;
  name?: string;
}

export interface GetMemberBirthdaysArgs {
  month?: number;
}

export interface GetMemberAnniversariesArgs {
  month?: number;
}

/**
 * Helper function to get all members with caching
 * Since member names are encrypted, we need to decrypt them for searching.
 * Caching reduces the number of decrypt operations.
 */
async function getAllMembers(): Promise<Member[]> {
  const tenantId = await tenantUtils.getTenantId();

  if (!tenantId) {
    throw new Error('No tenant context available');
  }

  // Check cache first
  const cached = memberCache.get(tenantId);
  if (cached) {
    return cached;
  }

  // Fetch from database if not cached
  const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
  const result = await memberRepo.findAll();

  if (!result.data) {
    throw new Error('Failed to retrieve members');
  }

  // Cache the results
  memberCache.set(tenantId, result.data);

  return result.data;
}

export const resolvers = {
  Query: {
    // Member queries
    /**
     * Search members with caching optimization
     * Note: Member names are encrypted, so we cache decrypted results
     */
    searchMembers: async (_: any, args: SearchMembersArgs) => {
      const { searchTerm, gender, maritalStatus, limit = 50 } = args;

      console.log(`[GraphQL] searchMembers: term="${searchTerm}", gender=${gender}, maritalStatus=${maritalStatus}, limit=${limit}`);

      // Get all members (with caching)
      let members = await getAllMembers();

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase().trim();
        members = members.filter(m => {
          const firstName = m.first_name?.toLowerCase() || '';
          const lastName = m.last_name?.toLowerCase() || '';
          const middleName = m.middle_name?.toLowerCase() || '';
          const preferredName = m.preferred_name?.toLowerCase() || '';
          const email = m.email?.toLowerCase() || '';
          const phone = m.contact_number?.toLowerCase() || '';

          const allNameParts = [firstName, middleName, lastName, preferredName]
            .filter(part => part.length > 0)
            .join(' ');

          const searchWords = searchLower.split(/\s+/).filter(w => w.length > 0);
          const allWordsMatch = searchWords.every(word => allNameParts.includes(word));

          return allWordsMatch ||
                 firstName.includes(searchLower) ||
                 middleName.includes(searchLower) ||
                 lastName.includes(searchLower) ||
                 preferredName.includes(searchLower) ||
                 email.includes(searchLower) ||
                 phone.includes(searchLower);
        });
      }

      // Apply gender filter
      if (gender) {
        members = members.filter(m => m.gender === gender);
      }

      // Apply marital status filter
      if (maritalStatus) {
        members = members.filter(m => m.marital_status === maritalStatus);
      }

      // Apply limit
      members = members.slice(0, limit);

      console.log(`[GraphQL] searchMembers: found ${members.length} members`);

      return members;
    },

    /**
     * Get a specific member by ID, email, or name (with caching)
     */
    getMember: async (_: any, args: GetMemberArgs) => {
      const { id, email, name } = args;

      console.log(`[GraphQL] getMember: id=${id}, email=${email}, name=${name}`);

      // Search by ID first (most specific) - bypass cache for single record lookup
      if (id) {
        const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);
        const result = await memberRepo.findById(id);
        return result || null;
      }

      // Search by email or name - use cache
      const members = await getAllMembers();

      let member: Member | null = null;

      // Search by email
      if (email && !member) {
        member = members.find(m =>
          m.email?.toLowerCase() === email.toLowerCase()
        ) || null;
      }

      // Search by name
      if (name && !member) {
        const searchName = name.toLowerCase().trim();
        member = members.find(m => {
          const firstName = m.first_name?.toLowerCase() || '';
          const lastName = m.last_name?.toLowerCase() || '';
          const middleName = m.middle_name?.toLowerCase() || '';
          const preferredName = m.preferred_name?.toLowerCase() || '';

          const allNameParts = [firstName, middleName, lastName, preferredName]
            .filter(part => part.length > 0)
            .join(' ');

          const searchWords = searchName.split(/\s+/).filter(w => w.length > 0);
          const allWordsMatch = searchWords.every(word => allNameParts.includes(word));

          return allWordsMatch ||
                 firstName.includes(searchName) ||
                 middleName.includes(searchName) ||
                 lastName.includes(searchName) ||
                 preferredName.includes(searchName);
        }) || null;
      }

      console.log(`[GraphQL] getMember: ${member ? 'found' : 'not found'}`);

      return member;
    },

    /**
     * Get members with birthdays in a specific month
     */
    getMemberBirthdays: async (_: any, args: GetMemberBirthdaysArgs) => {
      const { month } = args;
      const memberRepo = container.get<IMemberRepository>(TYPES.IMemberRepository);

      console.log(`[GraphQL] getMemberBirthdays: month=${month || 'current'}`);

      if (month) {
        return await memberRepo.getBirthdaysByMonth(month);
      } else {
        return await memberRepo.getCurrentMonthBirthdays();
      }
    },

    /**
     * Get members with anniversaries in a specific month (with caching)
     */
    getMemberAnniversaries: async (_: any, args: GetMemberAnniversariesArgs) => {
      const { month } = args;

      console.log(`[GraphQL] getMemberAnniversaries: month=${month || 'current'}`);

      // Get all members with caching and filter by anniversary month
      const members = await getAllMembers();

      const currentMonth = month || new Date().getMonth() + 1;

      return members.filter(m => {
        if (!m.anniversary) return false;
        const anniversaryDate = new Date(m.anniversary);
        return anniversaryDate.getMonth() + 1 === currentMonth;
      });
    },

    // Family queries (from familyResolvers)
    ...familyResolvers.Query,

    // Care plan queries (from carePlanResolvers)
    ...carePlanResolvers.Query,

    // Discipleship plan queries (from discipleshipPlanResolvers)
    ...discipleshipPlanResolvers.Query,

    // Account queries (from accountResolvers)
    ...accountResolvers.Query,

    // Financial transaction queries (from financialTransactionResolvers)
    ...financialTransactionResolvers.Query,
  },

  // Mutations (combined from familyResolvers, carePlanResolvers, discipleshipPlanResolvers, accountResolvers, and financialTransactionResolvers)
  Mutation: {
    ...familyResolvers.Mutation,
    ...carePlanResolvers.Mutation,
    ...discipleshipPlanResolvers.Mutation,
    ...accountResolvers.Mutation,
    ...financialTransactionResolvers.Mutation,
  },
};
