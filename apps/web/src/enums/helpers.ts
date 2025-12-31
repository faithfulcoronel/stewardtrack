/**
 * Enum Helper Functions
 *
 * Utility functions for working with enums across the application
 */

/**
 * Helper function to get all enum values as array
 */
export function getEnumValues<T extends Record<string, string>>(enumObj: T): T[keyof T][] {
  return Object.values(enumObj);
}

/**
 * Helper function to validate if a value is a valid enum member
 */
export function isValidEnumValue<T extends Record<string, string>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return typeof value === 'string' && Object.values(enumObj).includes(value as T[keyof T]);
}
