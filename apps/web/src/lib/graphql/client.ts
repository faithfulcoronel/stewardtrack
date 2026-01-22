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
