/**
 * GraphQL Schema Definition for StewardTrack
 *
 * Defines type definitions for efficient query-driven member and family search
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

    """
    Search for families by name with efficient database query.
    Searches across family name and formal_name fields.
    """
    searchFamilies(
      searchTerm: String
      hasMembers: Boolean
      limit: Int = 50
    ): [Family!]!

    """
    Get a specific family by ID with all members
    """
    getFamily(id: String!): Family

    """
    Get all members of a specific family
    """
    getFamilyMembers(familyId: String!): [FamilyMemberInfo!]!

    """
    Get all families that a member belongs to
    """
    getMemberFamilies(memberId: String!): [FamilyMemberInfo!]!

    """
    Get a member's primary family
    """
    getPrimaryFamily(memberId: String!): FamilyMemberInfo
  }

  type Mutation {
    """
    Create a new family
    """
    createFamily(input: CreateFamilyInput!): Family!

    """
    Update an existing family
    """
    updateFamily(id: String!, input: UpdateFamilyInput!): Family!

    """
    Add a member to a family with a specific role
    """
    addMemberToFamily(input: AddMemberToFamilyInput!): FamilyMemberInfo!

    """
    Remove a member from a family
    """
    removeMemberFromFamily(familyId: String!, memberId: String!): Boolean!

    """
    Update a member's role within a family
    """
    updateMemberRole(familyId: String!, memberId: String!, role: FamilyRole!): FamilyMemberInfo!

    """
    Set a family as a member's primary family
    """
    setPrimaryFamily(memberId: String!, familyId: String!): Boolean!
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

  type Family {
    id: ID!
    tenant_id: ID!
    name: String!
    formal_name: String
    address_street: String
    address_street2: String
    address_city: String
    address_state: String
    address_postal_code: String
    address_country: String
    family_photo_url: String
    notes: String
    tags: [String!]
    member_count: Int!
    members: [FamilyMemberInfo!]!
    head: FamilyMemberInfo
    created_at: String!
    updated_at: String!
  }

  type FamilyMemberInfo {
    id: ID!
    family_id: ID!
    member_id: ID!
    role: FamilyRole!
    role_notes: String
    is_primary: Boolean!
    is_active: Boolean!
    joined_at: String
    left_at: String
    family: FamilyBasicInfo
    member: MemberBasicInfo
  }

  type FamilyBasicInfo {
    id: ID!
    name: String!
    formal_name: String
    address_street: String
    address_city: String
    address_state: String
    member_count: Int
  }

  type MemberBasicInfo {
    id: ID!
    first_name: String!
    last_name: String!
    middle_name: String
    preferred_name: String
    email: String
    contact_number: String
    profile_picture_url: String
  }

  enum FamilyRole {
    head
    spouse
    child
    dependent
    other
  }

  input CreateFamilyInput {
    name: String!
    formal_name: String
    address_street: String
    address_street2: String
    address_city: String
    address_state: String
    address_postal_code: String
    address_country: String
    notes: String
    tags: [String!]
  }

  input UpdateFamilyInput {
    name: String
    formal_name: String
    address_street: String
    address_street2: String
    address_city: String
    address_state: String
    address_postal_code: String
    address_country: String
    notes: String
    tags: [String!]
  }

  input AddMemberToFamilyInput {
    family_id: String!
    member_id: String!
    role: FamilyRole!
    role_notes: String
    is_primary: Boolean
  }
`;
