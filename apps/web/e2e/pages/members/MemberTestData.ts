/**
 * Test Data Types and Generators for Member Tests
 * Single Responsibility: Test data management
 */

export interface MemberTestData {
  firstName: string;
  lastName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  birthdate?: string;
  maritalStatus?: string;
  gender?: string;
  addressStreet?: string;
  addressCity?: string;
  addressState?: string;
  addressPostal?: string;
}

export interface ComprehensiveMemberData {
  identity?: {
    firstName?: string;
    lastName?: string;
    preferredName?: string;
    envelopeNumber?: string;
    birthdate?: string;
    maritalStatus?: string;
    anniversary?: string;
    occupation?: string;
  };
  household?: {
    householdName?: string;
    addressStreet?: string;
    addressCity?: string;
    addressState?: string;
    addressPostal?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    preferredContact?: string;
  };
  engagement?: {
    smallGroup?: string;
    mentor?: string;
    attendanceRate?: string;
    discipleshipNextStep?: string;
    prayerFocus?: string;
  };
  care?: {
    pastoralNotes?: string;
    prayerRequests?: string;
    emergencyContact?: string;
    emergencyRelationship?: string;
    emergencyPhone?: string;
    physician?: string;
  };
  serving?: {
    servingTeam?: string;
    servingRole?: string;
    servingSchedule?: string;
    servingCoach?: string;
    teamFocus?: string;
    reportsTo?: string;
  };
  finance?: {
    recurringGiving?: string;
    recurringFrequency?: string;
    recurringMethod?: string;
    pledgeAmount?: string;
    pledgeCampaign?: string;
    primaryFund?: string;
    statementPreference?: string;
    capacityTier?: string;
    financeNotes?: string;
  };
  admin?: {
    stage?: string;
    membershipType?: string;
    center?: string;
    joinDate?: string;
    dataSteward?: string;
  };
}

/**
 * Generate basic member test data
 */
export function generateMemberData(overrides: Partial<MemberTestData> = {}): MemberTestData {
  const timestamp = Date.now();
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return {
    firstName,
    lastName,
    preferredName: firstName,
    email: `test-member-${timestamp}@example.com`,
    phone: '555-123-4567',
    birthdate: '1990-01-15',
    maritalStatus: 'single',
    gender: 'male',
    addressStreet: '123 Test Street',
    addressCity: 'Test City',
    addressState: 'TX',
    addressPostal: '12345',
    ...overrides,
  };
}

/**
 * Generate comprehensive test data for all form fields
 */
export function generateComprehensiveMemberData(overrides: Partial<ComprehensiveMemberData> = {}): ComprehensiveMemberData {
  const timestamp = Date.now();
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return {
    identity: {
      firstName,
      lastName,
      preferredName: firstName,
      envelopeNumber: `ENV-${timestamp.toString().slice(-6)}`,
      occupation: 'Software Engineer',
      maritalStatus: 'single',
      ...overrides.identity,
    },
    household: {
      householdName: `${lastName} Family`,
      addressStreet: '123 Test Street',
      addressCity: 'Test City',
      addressState: 'TX',
      addressPostal: '12345',
      ...overrides.household,
    },
    contact: {
      email: `test-member-${timestamp}@example.com`,
      phone: '555-123-4567',
      preferredContact: 'Email',
      ...overrides.contact,
    },
    engagement: {
      smallGroup: 'Young Adults Group',
      mentor: 'Pastor John',
      attendanceRate: '85',
      discipleshipNextStep: 'Complete leadership training',
      prayerFocus: 'Spiritual growth',
      ...overrides.engagement,
    },
    care: {
      pastoralNotes: 'Member is actively engaged in community.',
      prayerRequests: 'Pray for family health.',
      emergencyContact: 'Jane Doe',
      emergencyRelationship: 'Spouse',
      emergencyPhone: '555-987-6543',
      physician: 'Dr. Smith',
      ...overrides.care,
    },
    serving: {
      servingTeam: 'Hospitality',
      servingRole: 'Greeter',
      servingSchedule: 'Sundays 9am',
      servingCoach: 'Team Lead Mary',
      teamFocus: 'Welcome Ministry',
      reportsTo: 'Ministry Director',
      ...overrides.serving,
    },
    finance: {
      recurringGiving: '100',
      recurringFrequency: 'monthly',
      recurringMethod: 'ach',
      pledgeAmount: '1200',
      pledgeCampaign: 'Building Fund 2025',
      primaryFund: 'General Fund',
      statementPreference: 'email',
      capacityTier: 'mid',
      financeNotes: 'Prefers email statements.',
      ...overrides.finance,
    },
    admin: {
      dataSteward: 'Admin Team',
      ...overrides.admin,
    },
  };
}
