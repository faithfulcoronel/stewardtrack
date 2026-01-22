/**
 * GraphQL Schema Definition for StewardTrack
 *
 * Defines type definitions for efficient query-driven member search
 */

export const typeDefs = `#graphql
  type Query {
    """
    Search for members by name with efficient database query.
    Searches across first_name, middle_name, last_name, and preferred_name fields.
    """
    searchMembers(
      searchTerm: String!
      gender: String
      maritalStatus: String
      limit: Int = 50
    ): [Member!]!

    """
    Get a specific member by ID, email, or name
    """
    getMember(
      id: String
      email: String
      name: String
    ): Member

    """
    Get members with birthdays in a specific month
    """
    getMemberBirthdays(month: Int): [Member!]!

    """
    Get members with anniversaries in a specific month
    """
    getMemberAnniversaries(month: Int): [Member!]!
  }

  type Member {
    id: ID!
    first_name: String!
    last_name: String!
    middle_name: String
    preferred_name: String
    email: String
    contact_number: String
    birthday: String
    anniversary: String
    gender: String
    marital_status: String
    occupation: String
    address_street: String
    address_street2: String
    address_city: String
    address_state: String
    address_postal_code: String
    address_country: String
    membership_type_id: String!
    membership_status_id: String!
    membership_center_id: String
    membership_date: String
    baptism_date: String
    created_at: String!
    updated_at: String!
  }
`;
