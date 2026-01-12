/**
 * Short URL Token Utilities
 *
 * Generic token encoding/decoding for short URLs across the application.
 * Supports multiple entity types (members, families, events, etc.)
 *
 * Token format: Encodes entity type + ID into a URL-safe string
 *
 * Usage:
 * - encode("member", "uuid-here") → "encoded-token"
 * - decode("encoded-token") → { type: "member", id: "uuid-here" }
 *
 * Supported entity types:
 * - member: Church members
 * - family: Family/household units
 * - event: Calendar events
 * - group: Small groups
 * - donation: Donation records
 * - care: Care plans
 * - discipleship: Discipleship plans
 * - tenant: Tenant for public member registration
 */

// Entity type codes (short codes for compactness)
const ENTITY_TYPE_CODES: Record<string, string> = {
  member: "M",
  family: "F",
  event: "E",
  group: "G",
  donation: "D",
  care: "C",
  discipleship: "P",
  goal: "O",
  invitation: "I",
  tenant: "T", // For public member registration
};

// Reverse mapping for decoding
const CODE_TO_ENTITY_TYPE: Record<string, string> = Object.fromEntries(
  Object.entries(ENTITY_TYPE_CODES).map(([k, v]) => [v, k])
);

// Secret key for XOR obfuscation - use environment variable in production
const SECRET_KEY = process.env.SHORT_URL_TOKEN_SECRET || "stewardtrack-short-url-2024";

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

export type EntityType = keyof typeof ENTITY_TYPE_CODES;

export interface DecodedToken {
  type: EntityType;
  id: string;
}

/**
 * Encode an entity into a short, URL-safe token
 *
 * @param entityType - The type of entity (member, family, event, etc.)
 * @param entityId - The entity's UUID
 * @returns A short token string safe for URLs
 *
 * @example
 * encodeShortUrlToken("member", "56f5baf0-b7d9-4bdf-9416-547b1198e097")
 * // Returns: "XYZabc123..."
 */
export function encodeShortUrlToken(entityType: EntityType, entityId: string): string {
  const typeCode = ENTITY_TYPE_CODES[entityType];
  if (!typeCode) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  // Remove hyphens from UUID to make it shorter
  const compactId = entityId.replace(/-/g, "");

  // Combine type code and ID
  const payload = `${typeCode}${compactId}`;

  // XOR with secret key
  const obfuscated = xorWithKey(payload, SECRET_KEY);

  // Base64url encode
  return base64UrlEncode(obfuscated);
}

/**
 * Decode a token back to entity type and ID
 *
 * @param token - The encoded token
 * @returns The decoded entity type and ID, or null if invalid
 *
 * @example
 * decodeShortUrlToken("XYZabc123...")
 * // Returns: { type: "member", id: "56f5baf0-b7d9-4bdf-9416-547b1198e097" }
 */
export function decodeShortUrlToken(token: string): DecodedToken | null {
  try {
    // Base64url decode
    const obfuscated = base64UrlDecode(token);

    // XOR with secret key
    const payload = xorWithKey(obfuscated, SECRET_KEY);

    // Extract type code (first character)
    const typeCode = payload.charAt(0);
    const compactId = payload.slice(1);

    // Validate type code
    const entityType = CODE_TO_ENTITY_TYPE[typeCode] as EntityType | undefined;
    if (!entityType) {
      return null;
    }

    // Validate compact ID looks like a UUID (32 hex chars)
    if (!/^[0-9a-f]{32}$/i.test(compactId)) {
      return null;
    }

    // Re-insert hyphens to form UUID
    const entityId = [
      compactId.slice(0, 8),
      compactId.slice(8, 12),
      compactId.slice(12, 16),
      compactId.slice(16, 20),
      compactId.slice(20, 32),
    ].join("-");

    return { type: entityType, id: entityId };
  } catch {
    return null;
  }
}

/**
 * Generate the full short URL for an entity
 *
 * @param entityType - The type of entity
 * @param entityId - The entity's UUID
 * @param baseUrl - The base URL of the application
 * @returns The full short URL
 *
 * @example
 * getShortUrl("member", "56f5baf0-b7d9-4bdf-9416-547b1198e097")
 * // Returns: "https://stewardtrack.com/s/XYZabc123..."
 */
export function getShortUrl(
  entityType: EntityType,
  entityId: string,
  baseUrl: string = "https://stewardtrack.com"
): string {
  const token = encodeShortUrlToken(entityType, entityId);
  return `${baseUrl}/s/${token}`;
}

/**
 * Validate if a string is a valid entity type
 */
export function isValidEntityType(type: string): type is EntityType {
  return type in ENTITY_TYPE_CODES;
}

/**
 * Get all supported entity types
 */
export function getSupportedEntityTypes(): EntityType[] {
  return Object.keys(ENTITY_TYPE_CODES) as EntityType[];
}

/**
 * Encode a tenant ID for public member registration
 *
 * @param tenantId - The tenant's UUID
 * @returns A short token string safe for URLs
 *
 * @example
 * encodeTenantToken("56f5baf0-b7d9-4bdf-9416-547b1198e097")
 * // Returns: "XYZabc123..."
 */
export function encodeTenantToken(tenantId: string): string {
  return encodeShortUrlToken("tenant", tenantId);
}

/**
 * Decode a tenant token back to tenant ID
 *
 * @param token - The encoded token
 * @returns The tenant ID, or null if invalid
 *
 * @example
 * decodeTenantToken("XYZabc123...")
 * // Returns: "56f5baf0-b7d9-4bdf-9416-547b1198e097"
 */
export function decodeTenantToken(token: string): string | null {
  const decoded = decodeShortUrlToken(token);
  if (decoded?.type === "tenant") {
    return decoded.id;
  }
  return null;
}

/**
 * Generate the public member registration URL for a tenant
 *
 * @param tenantId - The tenant's UUID
 * @param baseUrl - The base URL of the application
 * @returns The full public registration URL
 *
 * @example
 * getPublicRegistrationUrl("56f5baf0-b7d9-4bdf-9416-547b1198e097")
 * // Returns: "https://stewardtrack.com/join/XYZabc123..."
 */
export function getPublicRegistrationUrl(
  tenantId: string,
  baseUrl: string = "https://stewardtrack.com"
): string {
  const token = encodeTenantToken(tenantId);
  return `${baseUrl}/join/${token}`;
}
