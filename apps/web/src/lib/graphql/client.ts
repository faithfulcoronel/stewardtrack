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

  throw new Error(`Unknown GraphQL query: ${query.substring(0, 100)}`);
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
