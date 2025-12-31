/**
 * Test Data Generator
 *
 * Provides functions to generate unique test data for E2E tests
 */

/**
 * Generate unique email for testing
 */
export function generateTestEmail(prefix = 'test'): string {
  const timestamp = Date.now();
  return `${prefix}-${timestamp}@example.com`;
}

/**
 * Generate strong password for testing
 */
export function generateTestPassword(): string {
  return 'TestPassword123!';
}

/**
 * Generate unique church name for testing
 */
export function generateTestChurchName(prefix = 'Test Church'): string {
  const timestamp = Date.now();
  return `${prefix} ${timestamp}`;
}

/**
 * Generate random first name for testing
 */
export function generateTestFirstName(): string {
  const names = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa'];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Generate random last name for testing
 */
export function generateTestLastName(): string {
  const names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
  return names[Math.floor(Math.random() * names.length)];
}

/**
 * Generate complete registration data
 */
export function generateRegistrationData(overrides: Partial<RegistrationData> = {}): RegistrationData {
  const password = generateTestPassword();

  return {
    email: generateTestEmail(),
    password,
    confirmPassword: password,
    churchName: generateTestChurchName(),
    firstName: generateTestFirstName(),
    lastName: generateTestLastName(),
    ...overrides,
  };
}

/**
 * Registration data type
 */
export interface RegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  churchName: string;
  firstName: string;
  lastName: string;
}
