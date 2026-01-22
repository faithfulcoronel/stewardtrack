/**
 * GraphQL Client for AI Assistant Tools
 *
 * Calls GraphQL resolvers directly instead of making HTTP requests
 * This ensures tenant context is preserved from the current request
 */

import { resolvers } from './resolvers';
import type {
  SearchMembersArgs,
  GetMemberArgs,
  GetMemberBirthdaysArgs,
  GetMemberAnniversariesArgs,
} from './resolvers';
import type {
  SearchFamiliesArgs,
  GetFamilyArgs,
  GetFamilyMembersArgs,
  GetMemberFamiliesArgs,
  GetPrimaryFamilyArgs,
  CreateFamilyInput,
  UpdateFamilyInput,
  AddMemberToFamilyInput,
  UpdateMemberRoleArgs,
  RemoveMemberFromFamilyArgs,
  SetPrimaryFamilyArgs,
} from './familyResolvers';
import type {
  SearchCarePlansArgs,
  GetCarePlanArgs,
  GetMemberCarePlansArgs,
  CreateCarePlanInput,
  UpdateCarePlanInput,
} from './carePlanResolvers';
import type {
  SearchDiscipleshipPlansArgs,
  GetDiscipleshipPlanArgs,
  GetMemberDiscipleshipPlansArgs,
  GetDiscipleshipPathwayArgs,
  CreateDiscipleshipPlanInput,
  UpdateDiscipleshipPlanInput,
  CelebrateMilestoneArgs,
} from './discipleshipPlanResolvers';
import type {
  SearchAccountsArgs,
  GetAccountArgs,
  GetAccountByMemberArgs,
  CreateAccountInput,
  UpdateAccountInput,
} from './accountResolvers';
import type {
  SearchFinancialTransactionsArgs,
  GetFinancialTransactionArgs,
  GetFinancialTransactionStatsArgs,
  CreateFinancialTransactionArgs,
  UpdateFinancialTransactionArgs,
  VoidFinancialTransactionArgs,
} from './financialTransactionResolvers';

/**
 * Execute a GraphQL query by calling resolvers directly
 * This maintains the tenant context from the current request
 */
export async function graphqlQuery<T = any>(
  query: string,
  variables?: Record<string, any>
): Promise<T> {
  console.log(`[GraphQL Client] Executing query directly via resolvers`);
  console.log(`[GraphQL Client] Variables:`, JSON.stringify(variables, null, 2));

  const vars = variables || {};

  // Parse query to determine which resolver to call
  // This is a simple implementation - in production you'd use a proper GraphQL parser
  if (query.includes('searchMembers')) {
    const args: SearchMembersArgs = {
      searchTerm: vars.searchTerm || '',
      gender: vars.gender,
      maritalStatus: vars.maritalStatus,
      limit: vars.limit,
    };
    const result = await resolvers.Query.searchMembers(null, args);
    return { searchMembers: result } as T;
  }

  if (query.includes('getMember(')) {
    const args: GetMemberArgs = {
      id: vars.id,
      email: vars.email,
      name: vars.name,
    };
    const result = await resolvers.Query.getMember(null, args);
    return { getMember: result } as T;
  }

  if (query.includes('getMemberBirthdays')) {
    const args: GetMemberBirthdaysArgs = {
      month: vars.month,
    };
    const result = await resolvers.Query.getMemberBirthdays(null, args);
    return { getMemberBirthdays: result } as T;
  }

  if (query.includes('getMemberAnniversaries')) {
    const args: GetMemberAnniversariesArgs = {
      month: vars.month,
    };
    const result = await resolvers.Query.getMemberAnniversaries(null, args);
    return { getMemberAnniversaries: result } as T;
  }

  // Family queries
  if (query.includes('searchFamilies')) {
    const args: SearchFamiliesArgs = {
      searchTerm: vars.searchTerm,
      hasMembers: vars.hasMembers,
      limit: vars.limit,
    };
    const result = await resolvers.Query.searchFamilies(null, args);
    return { searchFamilies: result } as T;
  }

  if (query.includes('getFamily(')) {
    const args: GetFamilyArgs = {
      id: vars.id,
    };
    const result = await resolvers.Query.getFamily(null, args);
    return { getFamily: result } as T;
  }

  if (query.includes('getFamilyMembers')) {
    const args: GetFamilyMembersArgs = {
      familyId: vars.familyId,
    };
    const result = await resolvers.Query.getFamilyMembers(null, args);
    return { getFamilyMembers: result } as T;
  }

  if (query.includes('getMemberFamilies')) {
    const args: GetMemberFamiliesArgs = {
      memberId: vars.memberId,
    };
    const result = await resolvers.Query.getMemberFamilies(null, args);
    return { getMemberFamilies: result } as T;
  }

  if (query.includes('getPrimaryFamily')) {
    const args: GetPrimaryFamilyArgs = {
      memberId: vars.memberId,
    };
    const result = await resolvers.Query.getPrimaryFamily(null, args);
    return { getPrimaryFamily: result } as T;
  }

  // Family mutations
  if (query.includes('createFamily')) {
    const result = await resolvers.Mutation.createFamily(null, { input: vars.input as CreateFamilyInput });
    return { createFamily: result } as T;
  }

  if (query.includes('updateFamily')) {
    const result = await resolvers.Mutation.updateFamily(null, { id: vars.id, input: vars.input as UpdateFamilyInput });
    return { updateFamily: result } as T;
  }

  if (query.includes('addMemberToFamily')) {
    const result = await resolvers.Mutation.addMemberToFamily(null, { input: vars.input as AddMemberToFamilyInput });
    return { addMemberToFamily: result } as T;
  }

  if (query.includes('removeMemberFromFamily')) {
    const args: RemoveMemberFromFamilyArgs = {
      familyId: vars.familyId,
      memberId: vars.memberId,
    };
    const result = await resolvers.Mutation.removeMemberFromFamily(null, args);
    return { removeMemberFromFamily: result } as T;
  }

  if (query.includes('updateMemberRole')) {
    const args: UpdateMemberRoleArgs = {
      familyId: vars.familyId,
      memberId: vars.memberId,
      role: vars.role,
    };
    const result = await resolvers.Mutation.updateMemberRole(null, args);
    return { updateMemberRole: result } as T;
  }

  if (query.includes('setPrimaryFamily')) {
    const args: SetPrimaryFamilyArgs = {
      memberId: vars.memberId,
      familyId: vars.familyId,
    };
    const result = await resolvers.Mutation.setPrimaryFamily(null, args);
    return { setPrimaryFamily: result } as T;
  }

  // Care plan queries
  if (query.includes('searchCarePlans')) {
    const args: SearchCarePlansArgs = {
      searchTerm: vars.searchTerm,
      status: vars.status,
      priority: vars.priority,
      assignedToMemberId: vars.assignedToMemberId,
      upcomingFollowUps: vars.upcomingFollowUps,
      limit: vars.limit,
    };
    const result = await resolvers.Query.searchCarePlans(null, args);
    return { searchCarePlans: result } as T;
  }

  if (query.includes('getCarePlan(')) {
    const args: GetCarePlanArgs = {
      id: vars.id,
    };
    const result = await resolvers.Query.getCarePlan(null, args);
    return { getCarePlan: result } as T;
  }

  if (query.includes('getMemberCarePlans')) {
    const args: GetMemberCarePlansArgs = {
      memberId: vars.memberId,
    };
    const result = await resolvers.Query.getMemberCarePlans(null, args);
    return { getMemberCarePlans: result } as T;
  }

  if (query.includes('getCarePlanStats')) {
    const result = await resolvers.Query.getCarePlanStats();
    return { getCarePlanStats: result } as T;
  }

  // Care plan mutations
  if (query.includes('createCarePlan')) {
    const result = await resolvers.Mutation.createCarePlan(null, { input: vars.input as CreateCarePlanInput });
    return { createCarePlan: result } as T;
  }

  if (query.includes('updateCarePlan')) {
    const result = await resolvers.Mutation.updateCarePlan(null, { id: vars.id, input: vars.input as UpdateCarePlanInput });
    return { updateCarePlan: result } as T;
  }

  if (query.includes('closeCarePlan')) {
    const result = await resolvers.Mutation.closeCarePlan(null, { id: vars.id });
    return { closeCarePlan: result } as T;
  }

  if (query.includes('reopenCarePlan')) {
    const result = await resolvers.Mutation.reopenCarePlan(null, { id: vars.id });
    return { reopenCarePlan: result } as T;
  }

  if (query.includes('deleteCarePlan')) {
    const result = await resolvers.Mutation.deleteCarePlan(null, { id: vars.id });
    return { deleteCarePlan: result } as T;
  }

  // Discipleship plan queries
  if (query.includes('searchDiscipleshipPlans')) {
    const args: SearchDiscipleshipPlansArgs = {
      searchTerm: vars.searchTerm,
      status: vars.status,
      pathwayId: vars.pathwayId,
      mentorId: vars.mentorId,
      limit: vars.limit,
    };
    const result = await resolvers.Query.searchDiscipleshipPlans(null, args);
    return { searchDiscipleshipPlans: result } as T;
  }

  if (query.includes('getDiscipleshipPlan(')) {
    const args: GetDiscipleshipPlanArgs = {
      id: vars.id,
    };
    const result = await resolvers.Query.getDiscipleshipPlan(null, args);
    return { getDiscipleshipPlan: result } as T;
  }

  if (query.includes('getMemberDiscipleshipPlans')) {
    const args: GetMemberDiscipleshipPlansArgs = {
      memberId: vars.memberId,
    };
    const result = await resolvers.Query.getMemberDiscipleshipPlans(null, args);
    return { getMemberDiscipleshipPlans: result } as T;
  }

  if (query.includes('getDiscipleshipPathways')) {
    const result = await resolvers.Query.getDiscipleshipPathways();
    return { getDiscipleshipPathways: result } as T;
  }

  if (query.includes('getDiscipleshipPathway(')) {
    const args: GetDiscipleshipPathwayArgs = {
      id: vars.id,
    };
    const result = await resolvers.Query.getDiscipleshipPathway(null, args);
    return { getDiscipleshipPathway: result } as T;
  }

  if (query.includes('getDiscipleshipPlanStats')) {
    const result = await resolvers.Query.getDiscipleshipPlanStats();
    return { getDiscipleshipPlanStats: result } as T;
  }

  // Discipleship plan mutations
  if (query.includes('createDiscipleshipPlan')) {
    const result = await resolvers.Mutation.createDiscipleshipPlan(null, { input: vars.input as CreateDiscipleshipPlanInput });
    return { createDiscipleshipPlan: result } as T;
  }

  if (query.includes('updateDiscipleshipPlan')) {
    const result = await resolvers.Mutation.updateDiscipleshipPlan(null, { id: vars.id, input: vars.input as UpdateDiscipleshipPlanInput });
    return { updateDiscipleshipPlan: result } as T;
  }

  if (query.includes('completeDiscipleshipPlan')) {
    const result = await resolvers.Mutation.completeDiscipleshipPlan(null, { id: vars.id });
    return { completeDiscipleshipPlan: result } as T;
  }

  if (query.includes('archiveDiscipleshipPlan')) {
    const result = await resolvers.Mutation.archiveDiscipleshipPlan(null, { id: vars.id });
    return { archiveDiscipleshipPlan: result } as T;
  }

  if (query.includes('deleteDiscipleshipPlan')) {
    const result = await resolvers.Mutation.deleteDiscipleshipPlan(null, { id: vars.id });
    return { deleteDiscipleshipPlan: result } as T;
  }

  if (query.includes('celebrateMilestone')) {
    const args: CelebrateMilestoneArgs = {
      planId: vars.planId,
      milestoneId: vars.milestoneId,
    };
    const result = await resolvers.Mutation.celebrateMilestone(null, args);
    return { celebrateMilestone: result } as T;
  }

  if (query.includes('uncelebrateMilestone')) {
    const args: CelebrateMilestoneArgs = {
      planId: vars.planId,
      milestoneId: vars.milestoneId,
    };
    const result = await resolvers.Mutation.uncelebrateMilestone(null, args);
    return { uncelebrateMilestone: result } as T;
  }

  // Account queries
  if (query.includes('searchAccounts')) {
    const args: SearchAccountsArgs = {
      searchTerm: vars.searchTerm,
      accountType: vars.accountType,
      isActive: vars.isActive,
      memberId: vars.memberId,
      limit: vars.limit,
    };
    const result = await resolvers.Query.searchAccounts(null, args);
    return { searchAccounts: result } as T;
  }

  if (query.includes('getAccount(')) {
    const args: GetAccountArgs = {
      id: vars.id,
    };
    const result = await resolvers.Query.getAccount(null, args);
    return { getAccount: result } as T;
  }

  if (query.includes('getAccountByMember')) {
    const args: GetAccountByMemberArgs = {
      memberId: vars.memberId,
    };
    const result = await resolvers.Query.getAccountByMember(null, args);
    return { getAccountByMember: result } as T;
  }

  if (query.includes('getAccountStats')) {
    const result = await resolvers.Query.getAccountStats();
    return { getAccountStats: result } as T;
  }

  // Account mutations
  if (query.includes('createAccount')) {
    const result = await resolvers.Mutation.createAccount(null, { input: vars.input as CreateAccountInput });
    return { createAccount: result } as T;
  }

  if (query.includes('updateAccount')) {
    const result = await resolvers.Mutation.updateAccount(null, { id: vars.id, input: vars.input as UpdateAccountInput });
    return { updateAccount: result } as T;
  }

  if (query.includes('deactivateAccount')) {
    const result = await resolvers.Mutation.deactivateAccount(null, { id: vars.id });
    return { deactivateAccount: result } as T;
  }

  if (query.includes('activateAccount')) {
    const result = await resolvers.Mutation.activateAccount(null, { id: vars.id });
    return { activateAccount: result } as T;
  }

  if (query.includes('deleteAccount')) {
    const result = await resolvers.Mutation.deleteAccount(null, { id: vars.id });
    return { deleteAccount: result } as T;
  }

  // Financial transaction queries
  if (query.includes('searchFinancialTransactions')) {
    const args: SearchFinancialTransactionsArgs = {
      searchTerm: vars.searchTerm,
      transactionType: vars.transactionType,
      status: vars.status,
      startDate: vars.startDate,
      endDate: vars.endDate,
      categoryId: vars.categoryId,
      sourceId: vars.sourceId,
      fundId: vars.fundId,
      limit: vars.limit,
    };
    const result = await resolvers.Query.searchFinancialTransactions(null, args);
    return { searchFinancialTransactions: result } as T;
  }

  if (query.includes('getFinancialTransaction(')) {
    const args: GetFinancialTransactionArgs = {
      id: vars.id,
    };
    const result = await resolvers.Query.getFinancialTransaction(null, args);
    return { getFinancialTransaction: result } as T;
  }

  if (query.includes('getFinancialTransactionStats')) {
    const args: GetFinancialTransactionStatsArgs = {
      startDate: vars.startDate,
      endDate: vars.endDate,
    };
    const result = await resolvers.Query.getFinancialTransactionStats(null, args);
    return { getFinancialTransactionStats: result } as T;
  }

  // Financial transaction mutations
  if (query.includes('createFinancialTransaction')) {
    const args: CreateFinancialTransactionArgs = { input: vars.input };
    const result = await resolvers.Mutation.createFinancialTransaction(null, args);
    return { createFinancialTransaction: result } as T;
  }

  if (query.includes('updateFinancialTransaction')) {
    const args: UpdateFinancialTransactionArgs = { id: vars.id, input: vars.input };
    const result = await resolvers.Mutation.updateFinancialTransaction(null, args);
    return { updateFinancialTransaction: result } as T;
  }

  if (query.includes('submitFinancialTransaction')) {
    const result = await resolvers.Mutation.submitFinancialTransaction(null, { id: vars.id });
    return { submitFinancialTransaction: result } as T;
  }

  if (query.includes('approveFinancialTransaction')) {
    const result = await resolvers.Mutation.approveFinancialTransaction(null, { id: vars.id });
    return { approveFinancialTransaction: result } as T;
  }

  if (query.includes('postFinancialTransaction')) {
    const result = await resolvers.Mutation.postFinancialTransaction(null, { id: vars.id });
    return { postFinancialTransaction: result } as T;
  }

  if (query.includes('voidFinancialTransaction')) {
    const args: VoidFinancialTransactionArgs = { id: vars.id, reason: vars.reason };
    const result = await resolvers.Mutation.voidFinancialTransaction(null, args);
    return { voidFinancialTransaction: result } as T;
  }

  if (query.includes('deleteFinancialTransaction')) {
    const result = await resolvers.Mutation.deleteFinancialTransaction(null, { id: vars.id });
    return { deleteFinancialTransaction: result } as T;
  }

  throw new Error(`Unknown GraphQL query/mutation: ${query.substring(0, 100)}`);
}

/**
 * GraphQL Queries for Member Operations
 */
export const MemberQueries = {
  /**
   * Search for members by name
   */
  SEARCH_MEMBERS: `
    query SearchMembers($searchTerm: String!, $gender: String, $maritalStatus: String, $limit: Int) {
      searchMembers(searchTerm: $searchTerm, gender: $gender, maritalStatus: $maritalStatus, limit: $limit) {
        id
        first_name
        last_name
        middle_name
        preferred_name
        email
        contact_number
        birthday
        anniversary
        gender
        marital_status
        occupation
        address_street
        address_city
        address_state
        address_postal_code
        membership_date
        baptism_date
      }
    }
  `,

  /**
   * Get a specific member
   */
  GET_MEMBER: `
    query GetMember($id: String, $email: String, $name: String) {
      getMember(id: $id, email: $email, name: $name) {
        id
        first_name
        last_name
        middle_name
        preferred_name
        email
        contact_number
        birthday
        anniversary
        gender
        marital_status
        occupation
        address_street
        address_street2
        address_city
        address_state
        address_postal_code
        address_country
        membership_type_id
        membership_status_id
        membership_center_id
        membership_date
        baptism_date
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get member birthdays
   */
  GET_MEMBER_BIRTHDAYS: `
    query GetMemberBirthdays($month: Int) {
      getMemberBirthdays(month: $month) {
        id
        first_name
        last_name
        middle_name
        preferred_name
        email
        contact_number
        birthday
        gender
        marital_status
      }
    }
  `,

  /**
   * Get member anniversaries
   */
  GET_MEMBER_ANNIVERSARIES: `
    query GetMemberAnniversaries($month: Int) {
      getMemberAnniversaries(month: $month) {
        id
        first_name
        last_name
        middle_name
        preferred_name
        email
        contact_number
        anniversary
        gender
        marital_status
      }
    }
  `,
};

/**
 * GraphQL Queries for Family Operations
 */
export const FamilyQueries = {
  /**
   * Search for families by name
   */
  SEARCH_FAMILIES: `
    query SearchFamilies($searchTerm: String, $hasMembers: Boolean, $limit: Int) {
      searchFamilies(searchTerm: $searchTerm, hasMembers: $hasMembers, limit: $limit) {
        id
        name
        formal_name
        address_street
        address_city
        address_state
        address_postal_code
        member_count
        head {
          member {
            id
            first_name
            last_name
            email
          }
        }
        created_at
      }
    }
  `,

  /**
   * Get a specific family with all members
   */
  GET_FAMILY: `
    query GetFamily($id: String!) {
      getFamily(id: $id) {
        id
        name
        formal_name
        address_street
        address_street2
        address_city
        address_state
        address_postal_code
        address_country
        family_photo_url
        notes
        tags
        member_count
        members {
          id
          role
          role_notes
          is_primary
          joined_at
          member {
            id
            first_name
            last_name
            middle_name
            preferred_name
            email
            contact_number
            profile_picture_url
          }
        }
        head {
          member {
            id
            first_name
            last_name
            email
            contact_number
          }
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get all members of a family
   */
  GET_FAMILY_MEMBERS: `
    query GetFamilyMembers($familyId: String!) {
      getFamilyMembers(familyId: $familyId) {
        id
        role
        role_notes
        is_primary
        joined_at
        member {
          id
          first_name
          last_name
          middle_name
          preferred_name
          email
          contact_number
          profile_picture_url
        }
      }
    }
  `,

  /**
   * Get all families that a member belongs to
   */
  GET_MEMBER_FAMILIES: `
    query GetMemberFamilies($memberId: String!) {
      getMemberFamilies(memberId: $memberId) {
        id
        role
        role_notes
        is_primary
        joined_at
        family {
          id
          name
          formal_name
          address_street
          address_city
          address_state
          member_count
        }
      }
    }
  `,

  /**
   * Get a member's primary family
   */
  GET_PRIMARY_FAMILY: `
    query GetPrimaryFamily($memberId: String!) {
      getPrimaryFamily(memberId: $memberId) {
        id
        role
        role_notes
        is_primary
        joined_at
        family {
          id
          name
          formal_name
          address_street
          address_city
          address_state
          member_count
        }
      }
    }
  `,
};

/**
 * GraphQL Mutations for Family Operations
 */
export const FamilyMutations = {
  /**
   * Create a new family
   */
  CREATE_FAMILY: `
    mutation CreateFamily($input: CreateFamilyInput!) {
      createFamily(input: $input) {
        id
        name
        formal_name
        address_street
        address_street2
        address_city
        address_state
        address_postal_code
        address_country
        notes
        tags
        member_count
        created_at
      }
    }
  `,

  /**
   * Update an existing family
   */
  UPDATE_FAMILY: `
    mutation UpdateFamily($id: String!, $input: UpdateFamilyInput!) {
      updateFamily(id: $id, input: $input) {
        id
        name
        formal_name
        address_street
        address_street2
        address_city
        address_state
        address_postal_code
        address_country
        notes
        tags
        updated_at
      }
    }
  `,

  /**
   * Add a member to a family
   */
  ADD_MEMBER_TO_FAMILY: `
    mutation AddMemberToFamily($input: AddMemberToFamilyInput!) {
      addMemberToFamily(input: $input) {
        id
        role
        role_notes
        is_primary
        joined_at
        member {
          id
          first_name
          last_name
          email
        }
        family {
          id
          name
        }
      }
    }
  `,

  /**
   * Remove a member from a family
   */
  REMOVE_MEMBER_FROM_FAMILY: `
    mutation RemoveMemberFromFamily($familyId: String!, $memberId: String!) {
      removeMemberFromFamily(familyId: $familyId, memberId: $memberId)
    }
  `,

  /**
   * Update a member's role within a family
   */
  UPDATE_MEMBER_ROLE: `
    mutation UpdateMemberRole($familyId: String!, $memberId: String!, $role: FamilyRole!) {
      updateMemberRole(familyId: $familyId, memberId: $memberId, role: $role) {
        id
        role
        role_notes
        updated_at
      }
    }
  `,

  /**
   * Set a family as a member's primary family
   */
  SET_PRIMARY_FAMILY: `
    mutation SetPrimaryFamily($memberId: String!, $familyId: String!) {
      setPrimaryFamily(memberId: $memberId, familyId: $familyId)
    }
  `,
};

/**
 * GraphQL Queries for Care Plan Operations
 */
export const CarePlanQueries = {
  /**
   * Search for care plans with various filters
   */
  SEARCH_CARE_PLANS: `
    query SearchCarePlans($searchTerm: String, $status: String, $priority: String, $assignedToMemberId: String, $upcomingFollowUps: Boolean, $limit: Int) {
      searchCarePlans(searchTerm: $searchTerm, status: $status, priority: $priority, assignedToMemberId: $assignedToMemberId, upcomingFollowUps: $upcomingFollowUps, limit: $limit) {
        id
        tenant_id
        member_id
        status_code
        status_label
        priority
        assigned_to
        assigned_to_member_id
        follow_up_at
        closed_at
        details
        membership_stage_id
        is_active
        member {
          id
          first_name
          last_name
          email
          contact_number
        }
        assigned_to_member {
          id
          first_name
          last_name
          email
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get a specific care plan by ID
   */
  GET_CARE_PLAN: `
    query GetCarePlan($id: String!) {
      getCarePlan(id: $id) {
        id
        tenant_id
        member_id
        status_code
        status_label
        priority
        assigned_to
        assigned_to_member_id
        follow_up_at
        closed_at
        details
        membership_stage_id
        is_active
        member {
          id
          first_name
          last_name
          middle_name
          preferred_name
          email
          contact_number
          profile_picture_url
        }
        assigned_to_member {
          id
          first_name
          last_name
          email
          contact_number
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get all care plans for a specific member
   */
  GET_MEMBER_CARE_PLANS: `
    query GetMemberCarePlans($memberId: String!) {
      getMemberCarePlans(memberId: $memberId) {
        id
        status_code
        status_label
        priority
        assigned_to
        assigned_to_member_id
        follow_up_at
        closed_at
        details
        is_active
        assigned_to_member {
          id
          first_name
          last_name
          email
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get care plan statistics for the tenant
   */
  GET_CARE_PLAN_STATS: `
    query GetCarePlanStats {
      getCarePlanStats {
        total
        active
        upcoming_follow_ups
        by_status {
          status_code
          status_label
          count
        }
        by_priority {
          priority
          count
        }
      }
    }
  `,
};

/**
 * GraphQL Mutations for Care Plan Operations
 */
export const CarePlanMutations = {
  /**
   * Create a new care plan
   */
  CREATE_CARE_PLAN: `
    mutation CreateCarePlan($input: CreateCarePlanInput!) {
      createCarePlan(input: $input) {
        id
        tenant_id
        member_id
        status_code
        status_label
        priority
        assigned_to_member_id
        follow_up_at
        details
        membership_stage_id
        is_active
        member {
          id
          first_name
          last_name
          email
        }
        assigned_to_member {
          id
          first_name
          last_name
          email
        }
        created_at
      }
    }
  `,

  /**
   * Update an existing care plan
   */
  UPDATE_CARE_PLAN: `
    mutation UpdateCarePlan($id: String!, $input: UpdateCarePlanInput!) {
      updateCarePlan(id: $id, input: $input) {
        id
        status_code
        status_label
        priority
        assigned_to_member_id
        follow_up_at
        details
        membership_stage_id
        is_active
        assigned_to_member {
          id
          first_name
          last_name
          email
        }
        updated_at
      }
    }
  `,

  /**
   * Close a care plan
   */
  CLOSE_CARE_PLAN: `
    mutation CloseCarePlan($id: String!) {
      closeCarePlan(id: $id) {
        id
        status_code
        status_label
        closed_at
        is_active
        updated_at
      }
    }
  `,

  /**
   * Reopen a closed care plan
   */
  REOPEN_CARE_PLAN: `
    mutation ReopenCarePlan($id: String!) {
      reopenCarePlan(id: $id) {
        id
        status_code
        status_label
        closed_at
        is_active
        updated_at
      }
    }
  `,

  /**
   * Delete a care plan (soft delete)
   */
  DELETE_CARE_PLAN: `
    mutation DeleteCarePlan($id: String!) {
      deleteCarePlan(id: $id)
    }
  `,
};

/**
 * GraphQL Queries for Discipleship Plan Operations
 */
export const DiscipleshipPlanQueries = {
  /**
   * Search for discipleship plans with various filters
   */
  SEARCH_DISCIPLESHIP_PLANS: `
    query SearchDiscipleshipPlans($searchTerm: String, $status: String, $pathwayId: String, $mentorId: String, $limit: Int) {
      searchDiscipleshipPlans(searchTerm: $searchTerm, status: $status, pathwayId: $pathwayId, mentorId: $mentorId, limit: $limit) {
        id
        tenant_id
        member_id
        pathway_id
        mentor_id
        status
        start_date
        target_completion_date
        actual_completion_date
        notes
        is_active
        member {
          id
          first_name
          last_name
          email
          contact_number
        }
        mentor {
          id
          first_name
          last_name
          email
        }
        pathway {
          id
          name
          description
        }
        completed_milestones_count
        total_milestones_count
        progress_percentage
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get a specific discipleship plan by ID
   */
  GET_DISCIPLESHIP_PLAN: `
    query GetDiscipleshipPlan($id: String!) {
      getDiscipleshipPlan(id: $id) {
        id
        tenant_id
        member_id
        pathway_id
        mentor_id
        status
        start_date
        target_completion_date
        actual_completion_date
        notes
        is_active
        member {
          id
          first_name
          last_name
          middle_name
          preferred_name
          email
          contact_number
          profile_picture_url
        }
        mentor {
          id
          first_name
          last_name
          email
          contact_number
        }
        pathway {
          id
          name
          description
          duration_weeks
          milestones
        }
        milestones {
          id
          milestone_name
          milestone_description
          completed_at
          celebrated_at
          notes
          sort_order
        }
        completed_milestones_count
        total_milestones_count
        progress_percentage
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get all discipleship plans for a specific member
   */
  GET_MEMBER_DISCIPLESHIP_PLANS: `
    query GetMemberDiscipleshipPlans($memberId: String!) {
      getMemberDiscipleshipPlans(memberId: $memberId) {
        id
        pathway_id
        mentor_id
        status
        target_completion_date
        notes
        is_active
        pathway {
          id
          name
          description
        }
        mentor {
          id
          first_name
          last_name
        }
        completed_milestones_count
        total_milestones_count
        progress_percentage
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get all available discipleship pathways
   */
  GET_DISCIPLESHIP_PATHWAYS: `
    query GetDiscipleshipPathways {
      getDiscipleshipPathways {
        id
        name
        description
        duration_weeks
        milestones
        sort_order
        is_active
        is_default
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get a specific discipleship pathway by ID
   */
  GET_DISCIPLESHIP_PATHWAY: `
    query GetDiscipleshipPathway($id: String!) {
      getDiscipleshipPathway(id: $id) {
        id
        name
        description
        duration_weeks
        milestones
        sort_order
        is_active
        is_default
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get discipleship plan statistics for the tenant
   */
  GET_DISCIPLESHIP_PLAN_STATS: `
    query GetDiscipleshipPlanStats {
      getDiscipleshipPlanStats {
        total
        active
        completed
        archived
        by_pathway {
          pathway_id
          pathway_name
          count
        }
        by_status {
          status
          count
        }
        avg_completion_percentage
      }
    }
  `,
};

/**
 * GraphQL Mutations for Discipleship Plan Operations
 */
export const DiscipleshipPlanMutations = {
  /**
   * Create a new discipleship plan
   */
  CREATE_DISCIPLESHIP_PLAN: `
    mutation CreateDiscipleshipPlan($input: CreateDiscipleshipPlanInput!) {
      createDiscipleshipPlan(input: $input) {
        id
        tenant_id
        member_id
        pathway_id
        mentor_id
        status
        start_date
        target_completion_date
        notes
        is_active
        member {
          id
          first_name
          last_name
          email
        }
        mentor {
          id
          first_name
          last_name
        }
        pathway {
          id
          name
        }
        created_at
      }
    }
  `,

  /**
   * Update an existing discipleship plan
   */
  UPDATE_DISCIPLESHIP_PLAN: `
    mutation UpdateDiscipleshipPlan($id: String!, $input: UpdateDiscipleshipPlanInput!) {
      updateDiscipleshipPlan(id: $id, input: $input) {
        id
        mentor_id
        status
        target_completion_date
        actual_completion_date
        notes
        is_active
        mentor {
          id
          first_name
          last_name
        }
        updated_at
      }
    }
  `,

  /**
   * Complete a discipleship plan
   */
  COMPLETE_DISCIPLESHIP_PLAN: `
    mutation CompleteDiscipleshipPlan($id: String!) {
      completeDiscipleshipPlan(id: $id) {
        id
        status
        actual_completion_date
        updated_at
      }
    }
  `,

  /**
   * Archive a discipleship plan
   */
  ARCHIVE_DISCIPLESHIP_PLAN: `
    mutation ArchiveDiscipleshipPlan($id: String!) {
      archiveDiscipleshipPlan(id: $id) {
        id
        status
        is_active
        updated_at
      }
    }
  `,

  /**
   * Delete a discipleship plan (soft delete)
   */
  DELETE_DISCIPLESHIP_PLAN: `
    mutation DeleteDiscipleshipPlan($id: String!) {
      deleteDiscipleshipPlan(id: $id)
    }
  `,

  /**
   * Celebrate a milestone
   */
  CELEBRATE_MILESTONE: `
    mutation CelebrateMilestone($planId: String!, $milestoneId: String!) {
      celebrateMilestone(planId: $planId, milestoneId: $milestoneId) {
        id
        milestone_name
        milestone_description
        completed_at
        celebrated_at
        notes
        updated_at
      }
    }
  `,

  /**
   * Uncelebrate a milestone
   */
  UNCELEBRATE_MILESTONE: `
    mutation UncelebrateMilestone($planId: String!, $milestoneId: String!) {
      uncelebrateMilestone(planId: $planId, milestoneId: $milestoneId) {
        id
        milestone_name
        celebrated_at
        updated_at
      }
    }
  `,
};

/**
 * GraphQL Queries for Account Operations
 */
export const AccountQueries = {
  /**
   * Search for accounts
   */
  SEARCH_ACCOUNTS: `
    query SearchAccounts($searchTerm: String, $accountType: AccountType, $isActive: Boolean, $memberId: String, $limit: Int) {
      searchAccounts(searchTerm: $searchTerm, accountType: $accountType, isActive: $isActive, memberId: $memberId, limit: $limit) {
        id
        name
        account_type
        account_number
        description
        email
        phone
        address
        website
        is_active
        member_id
        member {
          id
          first_name
          last_name
          email
          contact_number
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get a specific account by ID
   */
  GET_ACCOUNT: `
    query GetAccount($id: String!) {
      getAccount(id: $id) {
        id
        name
        account_type
        account_number
        description
        email
        phone
        address
        website
        tax_id
        is_active
        notes
        member_id
        member {
          id
          first_name
          last_name
          email
          contact_number
          profile_picture_url
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get account by member ID
   */
  GET_ACCOUNT_BY_MEMBER: `
    query GetAccountByMember($memberId: String!) {
      getAccountByMember(memberId: $memberId) {
        id
        name
        account_type
        account_number
        description
        email
        phone
        address
        website
        is_active
        notes
        member_id
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get account statistics
   */
  GET_ACCOUNT_STATS: `
    query GetAccountStats {
      getAccountStats {
        total
        active
        inactive
        by_type {
          account_type
          count
        }
        with_members
      }
    }
  `,
};

/**
 * GraphQL Mutations for Account Operations
 */
export const AccountMutations = {
  /**
   * Create a new account
   */
  CREATE_ACCOUNT: `
    mutation CreateAccount($input: CreateAccountInput!) {
      createAccount(input: $input) {
        id
        name
        account_type
        account_number
        description
        email
        phone
        address
        website
        is_active
        notes
        member_id
        member {
          id
          first_name
          last_name
          email
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Update an existing account
   */
  UPDATE_ACCOUNT: `
    mutation UpdateAccount($id: String!, $input: UpdateAccountInput!) {
      updateAccount(id: $id, input: $input) {
        id
        name
        account_type
        account_number
        description
        email
        phone
        address
        website
        is_active
        notes
        member_id
        created_at
        updated_at
      }
    }
  `,

  /**
   * Deactivate an account
   */
  DEACTIVATE_ACCOUNT: `
    mutation DeactivateAccount($id: String!) {
      deactivateAccount(id: $id) {
        id
        name
        is_active
        updated_at
      }
    }
  `,

  /**
   * Activate an account
   */
  ACTIVATE_ACCOUNT: `
    mutation ActivateAccount($id: String!) {
      activateAccount(id: $id) {
        id
        name
        is_active
        updated_at
      }
    }
  `,

  /**
   * Delete an account
   */
  DELETE_ACCOUNT: `
    mutation DeleteAccount($id: String!) {
      deleteAccount(id: $id)
    }
  `,
};

/**
 * GraphQL Queries for Financial Transaction Operations
 */
export const FinancialTransactionQueries = {
  /**
   * Search for financial transactions
   */
  SEARCH_FINANCIAL_TRANSACTIONS: `
    query SearchFinancialTransactions(
      $searchTerm: String
      $transactionType: TransactionType
      $status: TransactionStatus
      $startDate: String
      $endDate: String
      $categoryId: String
      $sourceId: String
      $fundId: String
      $limit: Int
    ) {
      searchFinancialTransactions(
        searchTerm: $searchTerm
        transactionType: $transactionType
        status: $status
        startDate: $startDate
        endDate: $endDate
        categoryId: $categoryId
        sourceId: $sourceId
        fundId: $fundId
        limit: $limit
      ) {
        id
        transaction_number
        transaction_date
        transaction_type
        description
        reference
        status
        amount
        source {
          id
          name
          code
          type
        }
        category {
          id
          name
          code
          type
        }
        fund {
          id
          name
          code
        }
        account {
          id
          name
          account_number
          account_type
        }
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get a specific financial transaction by ID
   */
  GET_FINANCIAL_TRANSACTION: `
    query GetFinancialTransaction($id: String!) {
      getFinancialTransaction(id: $id) {
        id
        transaction_number
        transaction_date
        transaction_type
        description
        reference
        status
        amount
        source {
          id
          name
          code
          type
        }
        category {
          id
          name
          code
          type
        }
        fund {
          id
          name
          code
        }
        account {
          id
          name
          account_number
          account_type
        }
        submitted_at
        submitted_by
        approved_at
        approved_by
        posted_at
        posted_by
        voided_at
        voided_by
        void_reason
        created_at
        updated_at
      }
    }
  `,

  /**
   * Get financial transaction statistics
   */
  GET_FINANCIAL_TRANSACTION_STATS: `
    query GetFinancialTransactionStats($startDate: String, $endDate: String) {
      getFinancialTransactionStats(startDate: $startDate, endDate: $endDate) {
        total
        by_type {
          transaction_type
          count
          total_amount
        }
        by_status {
          status
          count
        }
        total_income
        total_expense
        net_income
      }
    }
  `,
};

/**
 * GraphQL Mutations for Financial Transaction Operations
 */
export const FinancialTransactionMutations = {
  /**
   * Create a new financial transaction
   */
  CREATE_FINANCIAL_TRANSACTION: `
    mutation CreateFinancialTransaction($input: CreateFinancialTransactionInput!) {
      createFinancialTransaction(input: $input) {
        id
        transaction_number
        transaction_date
        transaction_type
        description
        reference
        status
        amount
        source {
          id
          name
          code
        }
        category {
          id
          name
          code
        }
        fund {
          id
          name
          code
        }
        account {
          id
          name
          account_number
        }
        created_at
      }
    }
  `,

  /**
   * Update an existing financial transaction
   */
  UPDATE_FINANCIAL_TRANSACTION: `
    mutation UpdateFinancialTransaction($id: String!, $input: UpdateFinancialTransactionInput!) {
      updateFinancialTransaction(id: $id, input: $input) {
        id
        transaction_number
        transaction_date
        transaction_type
        description
        reference
        status
        amount
        source {
          id
          name
          code
        }
        category {
          id
          name
          code
        }
        fund {
          id
          name
          code
        }
        account {
          id
          name
          account_number
        }
        updated_at
      }
    }
  `,

  /**
   * Submit financial transaction for approval
   */
  SUBMIT_FINANCIAL_TRANSACTION: `
    mutation SubmitFinancialTransaction($id: String!) {
      submitFinancialTransaction(id: $id) {
        id
        status
        submitted_at
        submitted_by
        updated_at
      }
    }
  `,

  /**
   * Approve financial transaction
   */
  APPROVE_FINANCIAL_TRANSACTION: `
    mutation ApproveFinancialTransaction($id: String!) {
      approveFinancialTransaction(id: $id) {
        id
        status
        approved_at
        approved_by
        updated_at
      }
    }
  `,

  /**
   * Post financial transaction (finalize to ledger)
   */
  POST_FINANCIAL_TRANSACTION: `
    mutation PostFinancialTransaction($id: String!) {
      postFinancialTransaction(id: $id) {
        id
        status
        posted_at
        posted_by
        updated_at
      }
    }
  `,

  /**
   * Void financial transaction
   */
  VOID_FINANCIAL_TRANSACTION: `
    mutation VoidFinancialTransaction($id: String!, $reason: String!) {
      voidFinancialTransaction(id: $id, reason: $reason) {
        id
        status
        voided_at
        voided_by
        void_reason
        updated_at
      }
    }
  `,

  /**
   * Delete financial transaction (soft delete)
   */
  DELETE_FINANCIAL_TRANSACTION: `
    mutation DeleteFinancialTransaction($id: String!) {
      deleteFinancialTransaction(id: $id)
    }
  `,
};
