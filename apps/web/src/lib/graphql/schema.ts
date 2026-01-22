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

    """
    Search for care plans with filtering options
    """
    searchCarePlans(
      searchTerm: String
      status: String
      priority: String
      assignedToMemberId: String
      upcomingFollowUps: Boolean
      limit: Int = 50
    ): [CarePlan!]!

    """
    Get a specific care plan by ID
    """
    getCarePlan(id: String!): CarePlan

    """
    Get all care plans for a specific member
    """
    getMemberCarePlans(memberId: String!): [CarePlan!]!

    """
    Get care plan statistics for dashboard
    """
    getCarePlanStats: CarePlanStats!

    """
    Search for discipleship plans with filtering options
    """
    searchDiscipleshipPlans(
      searchTerm: String
      status: String
      pathwayId: String
      mentorId: String
      limit: Int = 50
    ): [DiscipleshipPlan!]!

    """
    Get a specific discipleship plan by ID
    """
    getDiscipleshipPlan(id: String!): DiscipleshipPlan

    """
    Get all discipleship plans for a specific member
    """
    getMemberDiscipleshipPlans(memberId: String!): [DiscipleshipPlan!]!

    """
    Get all available discipleship pathways
    """
    getDiscipleshipPathways: [DiscipleshipPathway!]!

    """
    Get a specific discipleship pathway by ID
    """
    getDiscipleshipPathway(id: String!): DiscipleshipPathway

    """
    Get discipleship plan statistics for dashboard
    """
    getDiscipleshipPlanStats: DiscipleshipPlanStats!

    """
    Search for accounts with filtering options
    """
    searchAccounts(
      searchTerm: String
      accountType: AccountType
      isActive: Boolean
      memberId: String
      limit: Int = 50
    ): [Account!]!

    """
    Get a specific account by ID
    """
    getAccount(id: String!): Account

    """
    Get account by member ID
    """
    getAccountByMember(memberId: String!): Account

    """
    Get account statistics for dashboard
    """
    getAccountStats: AccountStats!

    """
    Search for financial transactions with filtering options
    """
    searchFinancialTransactions(
      searchTerm: String
      transactionType: TransactionType
      status: TransactionStatus
      startDate: String
      endDate: String
      categoryId: String
      sourceId: String
      fundId: String
      limit: Int = 50
    ): [FinancialTransactionItem!]!

    """
    Get a specific financial transaction by ID
    """
    getFinancialTransaction(id: String!): FinancialTransactionItem

    """
    Get financial transaction statistics for dashboard
    """
    getFinancialTransactionStats(
      startDate: String
      endDate: String
    ): FinancialTransactionStats!
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

    """
    Create a new care plan
    """
    createCarePlan(input: CreateCarePlanInput!): CarePlan!

    """
    Update an existing care plan
    """
    updateCarePlan(id: String!, input: UpdateCarePlanInput!): CarePlan!

    """
    Close a care plan (mark as completed)
    """
    closeCarePlan(id: String!): CarePlan!

    """
    Reopen a closed care plan
    """
    reopenCarePlan(id: String!): CarePlan!

    """
    Delete a care plan (soft delete)
    """
    deleteCarePlan(id: String!): Boolean!

    """
    Create a new discipleship plan
    """
    createDiscipleshipPlan(input: CreateDiscipleshipPlanInput!): DiscipleshipPlan!

    """
    Update an existing discipleship plan
    """
    updateDiscipleshipPlan(id: String!, input: UpdateDiscipleshipPlanInput!): DiscipleshipPlan!

    """
    Complete a discipleship plan
    """
    completeDiscipleshipPlan(id: String!): DiscipleshipPlan!

    """
    Archive a discipleship plan
    """
    archiveDiscipleshipPlan(id: String!): DiscipleshipPlan!

    """
    Delete a discipleship plan (soft delete)
    """
    deleteDiscipleshipPlan(id: String!): Boolean!

    """
    Celebrate a milestone for a discipleship plan
    """
    celebrateMilestone(planId: String!, milestoneId: String!): DiscipleshipMilestone!

    """
    Uncelebrate a milestone for a discipleship plan
    """
    uncelebrateMilestone(planId: String!, milestoneId: String!): DiscipleshipMilestone!

    """
    Create a new account
    """
    createAccount(input: CreateAccountInput!): Account!

    """
    Update an existing account
    """
    updateAccount(id: String!, input: UpdateAccountInput!): Account!

    """
    Deactivate an account
    """
    deactivateAccount(id: String!): Account!

    """
    Activate an account
    """
    activateAccount(id: String!): Account!

    """
    Delete an account (soft delete)
    """
    deleteAccount(id: String!): Boolean!

    """
    Create a new financial transaction
    """
    createFinancialTransaction(input: CreateFinancialTransactionInput!): FinancialTransactionItem!

    """
    Update an existing financial transaction
    """
    updateFinancialTransaction(id: String!, input: UpdateFinancialTransactionInput!): FinancialTransactionItem!

    """
    Submit a financial transaction for approval
    """
    submitFinancialTransaction(id: String!): FinancialTransactionItem!

    """
    Approve a financial transaction
    """
    approveFinancialTransaction(id: String!): FinancialTransactionItem!

    """
    Post a financial transaction (finalize to ledger)
    """
    postFinancialTransaction(id: String!): FinancialTransactionItem!

    """
    Void a financial transaction
    """
    voidFinancialTransaction(id: String!, reason: String!): FinancialTransactionItem!

    """
    Delete a financial transaction (soft delete - only drafts)
    """
    deleteFinancialTransaction(id: String!): Boolean!
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

  type CarePlan {
    id: ID!
    tenant_id: ID!
    member_id: ID!
    status_code: String!
    status_label: String
    priority: String
    assigned_to: String
    assigned_to_member_id: String
    follow_up_at: String
    closed_at: String
    details: String
    membership_stage_id: String
    is_active: Boolean!
    member: MemberBasicInfo
    assigned_to_member: MemberBasicInfo
    created_at: String!
    updated_at: String!
  }

  type CarePlanStats {
    total: Int!
    active: Int!
    upcoming_follow_ups: Int!
    by_status: [StatusCount!]!
    by_priority: [PriorityCount!]!
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  type PriorityCount {
    priority: String!
    count: Int!
  }

  input CreateCarePlanInput {
    member_id: String!
    status_code: String!
    status_label: String
    priority: String
    assigned_to_member_id: String
    follow_up_at: String
    details: String
    membership_stage_id: String
    is_active: Boolean
  }

  input UpdateCarePlanInput {
    status_code: String
    status_label: String
    priority: String
    assigned_to_member_id: String
    follow_up_at: String
    details: String
    membership_stage_id: String
    is_active: Boolean
  }

  type DiscipleshipPlan {
    id: ID!
    tenant_id: ID!
    member_id: ID!
    pathway_id: ID!
    mentor_id: ID
    status: String!
    start_date: String!
    target_completion_date: String
    actual_completion_date: String
    notes: String
    is_active: Boolean!
    member: MemberBasicInfo
    mentor: MemberBasicInfo
    pathway: DiscipleshipPathway
    milestones: [DiscipleshipMilestone!]!
    completed_milestones_count: Int!
    total_milestones_count: Int!
    progress_percentage: Int!
    created_at: String!
    updated_at: String!
  }

  type DiscipleshipPathway {
    id: ID!
    name: String!
    description: String
    duration_weeks: Int
    milestones: [String!]!
    sort_order: Int!
    is_active: Boolean!
    is_default: Boolean!
    created_at: String!
    updated_at: String!
  }

  type DiscipleshipMilestone {
    id: ID!
    plan_id: ID!
    milestone_name: String!
    milestone_description: String
    completed_at: String
    celebrated_at: String
    notes: String
    sort_order: Int!
    created_at: String!
    updated_at: String!
  }

  type DiscipleshipPlanStats {
    total: Int!
    active: Int!
    completed: Int!
    archived: Int!
    by_pathway: [PathwayCount!]!
    by_status: [StatusCount!]!
    avg_completion_percentage: Float!
  }

  type PathwayCount {
    pathway_id: String!
    pathway_name: String!
    count: Int!
  }

  input CreateDiscipleshipPlanInput {
    member_id: String!
    pathway_id: String!
    mentor_id: String
    start_date: String!
    target_completion_date: String
    notes: String
  }

  input UpdateDiscipleshipPlanInput {
    mentor_id: String
    status: String
    target_completion_date: String
    actual_completion_date: String
    notes: String
    is_active: Boolean
  }

  type Account {
    id: ID!
    tenant_id: ID!
    name: String!
    account_type: AccountType!
    account_number: String!
    description: String
    email: String
    phone: String
    address: String
    website: String
    tax_id: String
    is_active: Boolean!
    notes: String
    member_id: String
    member: MemberBasicInfo
    created_at: String!
    updated_at: String!
  }

  enum AccountType {
    organization
    person
  }

  type AccountStats {
    total: Int!
    active: Int!
    inactive: Int!
    by_type: [AccountTypeCount!]!
    with_members: Int!
  }

  type AccountTypeCount {
    account_type: String!
    count: Int!
  }

  input CreateAccountInput {
    name: String!
    account_type: AccountType!
    account_number: String
    description: String
    email: String
    phone: String
    address: String
    website: String
    tax_id: String
    is_active: Boolean
    notes: String
    member_id: String
  }

  input UpdateAccountInput {
    name: String
    description: String
    email: String
    phone: String
    address: String
    website: String
    tax_id: String
    is_active: Boolean
    notes: String
    member_id: String
  }

  type FinancialTransactionItem {
    id: ID!
    tenant_id: ID!
    transaction_number: String!
    transaction_date: String!
    transaction_type: TransactionType
    description: String!
    reference: String
    status: TransactionStatus!
    amount: Float!
    source_id: String
    source: FinancialSourceBasicInfo
    category_id: String
    category: CategoryBasicInfo
    fund_id: String
    fund: FundBasicInfo
    account_id: String
    account: AccountBasicInfo
    submitted_at: String
    submitted_by: String
    approved_at: String
    approved_by: String
    posted_at: String
    posted_by: String
    voided_at: String
    voided_by: String
    void_reason: String
    created_at: String!
    updated_at: String!
  }

  type FinancialSourceBasicInfo {
    id: ID!
    name: String!
    code: String
    type: String
  }

  type CategoryBasicInfo {
    id: ID!
    name: String!
    code: String
    type: String
  }

  type FundBasicInfo {
    id: ID!
    name: String!
    code: String
  }

  type AccountBasicInfo {
    id: ID!
    name: String!
    account_number: String
    account_type: String
  }

  enum TransactionType {
    income
    expense
    transfer
    opening_balance
    fund_rollover
    refund
    adjustment
    reclass
    reversal
  }

  enum TransactionStatus {
    draft
    submitted
    approved
    posted
    voided
  }

  type FinancialTransactionStats {
    total: Int!
    by_type: [TransactionTypeCount!]!
    by_status: [TransactionStatusCount!]!
    total_income: Float!
    total_expense: Float!
    net_income: Float!
  }

  type TransactionTypeCount {
    transaction_type: String!
    count: Int!
    total_amount: Float!
  }

  type TransactionStatusCount {
    status: String!
    count: Int!
  }

  input CreateFinancialTransactionInput {
    transaction_type: TransactionType!
    transaction_date: String!
    description: String!
    reference: String
    amount: Float!
    category_id: String!
    source_id: String!
    fund_id: String!
    account_id: String
  }

  input UpdateFinancialTransactionInput {
    transaction_date: String
    description: String
    reference: String
    amount: Float
    category_id: String
    source_id: String
    fund_id: String
    account_id: String
  }
`;
