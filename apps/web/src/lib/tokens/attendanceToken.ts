/**
 * Attendance Token Utilities
 *
 * Encodes/decodes tenant ID and schedule ID into an encrypted, URL-safe token
 * for QR code-based attendance tracking.
 *
 * Token format: Encodes tenant_id + schedule_id + expiration into a URL-safe string
 *
 * Usage:
 * - encodeAttendanceToken(tenantId, scheduleId, expirationDays) → "encoded-token"
 * - decodeAttendanceToken(token) → { tenantId, scheduleId, expiresAt }
 *
 * Security:
 * - XOR obfuscation with secret key
 * - Base64URL encoding for URL safety
 * - Configurable expiration time
 */

// Secret key for XOR obfuscation - use environment variable in production
const SECRET_KEY = process.env.ATTENDANCE_TOKEN_SECRET || process.env.SHORT_URL_TOKEN_SECRET || "stewardtrack-attendance-2024";

/**
 * XOR a string with the secret key
 */
function xorWithKey(input: string, key: string): string {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(
      input.charCodeAt(i) ^ key.charCodeAt(i % key.length)
    );
  }
  return result;
}

/**
 * Base64url encode (URL-safe base64)
 */
function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Base64url decode
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf-8");
}

/**
 * Remove hyphens from UUID to make it compact
 */
function compactUuid(uuid: string): string {
  return uuid.replace(/-/g, "");
}

/**
 * Re-insert hyphens to form UUID
 */
function expandUuid(compactId: string): string {
  return [
    compactId.slice(0, 8),
    compactId.slice(8, 12),
    compactId.slice(12, 16),
    compactId.slice(16, 20),
    compactId.slice(20, 32),
  ].join("-");
}

export interface AttendanceTokenData {
  tenantId: string;
  scheduleId: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * Encode an attendance token that includes tenant ID, schedule ID, and expiration
 *
 * @param tenantId - The tenant's UUID
 * @param scheduleId - The schedule's UUID
 * @param expirationDays - Number of days until the token expires (default: 365)
 * @returns A URL-safe token string
 *
 * @example
 * encodeAttendanceToken("tenant-uuid", "schedule-uuid", 365)
 * // Returns: "XYZabc123..."
 */
export function encodeAttendanceToken(
  tenantId: string,
  scheduleId: string,
  expirationDays: number = 365
): string {
  // Calculate expiration timestamp
  const expiresAt = Date.now() + (expirationDays * 24 * 60 * 60 * 1000);

  // Compact UUIDs
  const compactTenant = compactUuid(tenantId);
  const compactSchedule = compactUuid(scheduleId);

  // Combine: "A" prefix (for attendance) + compact tenant ID + ":" + compact schedule ID + "|" + expiration timestamp
  const payload = `A${compactTenant}:${compactSchedule}|${expiresAt}`;

  // XOR with secret key
  const obfuscated = xorWithKey(payload, SECRET_KEY);

  // Base64url encode
  return base64UrlEncode(obfuscated);
}

/**
 * Decode an attendance token back to tenant ID, schedule ID, and expiration
 *
 * @param token - The encoded token
 * @returns The decoded data with tenant ID, schedule ID, and expiration, or null if invalid
 *
 * @example
 * decodeAttendanceToken("XYZabc123...")
 * // Returns: { tenantId: "...", scheduleId: "...", expiresAt: 1234567890000 }
 */
export function decodeAttendanceToken(token: string): AttendanceTokenData | null {
  try {
    // Base64url decode
    const obfuscated = base64UrlDecode(token);

    // XOR with secret key
    const payload = xorWithKey(obfuscated, SECRET_KEY);

    // Check for attendance token prefix
    if (!payload.startsWith("A")) {
      return null;
    }

    // Split by delimiter to get IDs and expiration
    const [idsPart, expiresAtStr] = payload.slice(1).split("|");
    if (!idsPart || !expiresAtStr) {
      return null;
    }

    // Split IDs by colon
    const [compactTenant, compactSchedule] = idsPart.split(":");
    if (!compactTenant || !compactSchedule) {
      return null;
    }

    // Validate compact IDs look like UUIDs (32 hex chars each)
    if (!/^[0-9a-f]{32}$/i.test(compactTenant) || !/^[0-9a-f]{32}$/i.test(compactSchedule)) {
      return null;
    }

    // Parse expiration timestamp
    const expiresAt = parseInt(expiresAtStr, 10);
    if (isNaN(expiresAt)) {
      return null;
    }

    // Expand UUIDs
    const tenantId = expandUuid(compactTenant);
    const scheduleId = expandUuid(compactSchedule);

    return { tenantId, scheduleId, expiresAt };
  } catch {
    return null;
  }
}

/**
 * Check if an attendance token is valid and not expired
 *
 * @param token - The encoded token
 * @returns True if valid and not expired, false otherwise
 */
export function isAttendanceTokenValid(token: string): boolean {
  const data = decodeAttendanceToken(token);
  if (!data) return false;
  return Date.now() < data.expiresAt;
}

/**
 * Get the remaining validity of an attendance token
 *
 * @param token - The encoded token
 * @returns Number of days remaining, or -1 if invalid/expired
 */
export function getAttendanceTokenDaysRemaining(token: string): number {
  const data = decodeAttendanceToken(token);
  if (!data) return -1;

  const remaining = data.expiresAt - Date.now();
  if (remaining <= 0) return -1;

  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}

/**
 * Generate the full attendance URL for a schedule
 *
 * @param tenantId - The tenant's UUID
 * @param scheduleId - The schedule's UUID
 * @param expirationDays - Number of days until the token expires (default: 365)
 * @param baseUrl - The base URL of the application
 * @returns The full attendance URL
 *
 * @example
 * getAttendanceUrl("tenant-uuid", "schedule-uuid", 365)
 * // Returns: "https://stewardtrack.com/attend/XYZabc123..."
 */
export function getAttendanceUrl(
  tenantId: string,
  scheduleId: string,
  expirationDays: number = 365,
  baseUrl: string = "https://stewardtrack.com"
): string {
  const token = encodeAttendanceToken(tenantId, scheduleId, expirationDays);
  return `${baseUrl}/attend/${token}`;
}
