import 'server-only';
import crypto from 'crypto';
import { injectable } from 'inversify';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { TenantEncryptionKey } from '@/types/encryption';

/**
 * Manages encryption keys with hierarchical key derivation
 *
 * Key Hierarchy:
 * 1. System Master Key (env var, never stored)
 * 2. Tenant Master Key (encrypted with system key, stored in DB)
 * 3. Field-Specific Keys (derived from tenant key, never stored)
 *
 * Security Features:
 * - HKDF-SHA256 for key derivation
 * - Tenant isolation (unique keys per tenant)
 * - Key versioning for rotation support
 * - Master key encryption for storage
 */
@injectable()
export class EncryptionKeyManager {
  private systemMasterKey: Buffer;
  private keyCache: Map<string, { key: Buffer; version: number; expiresAt: number }>;
  private readonly cacheTTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Load system master key from environment
    const key = process.env.ENCRYPTION_MASTER_KEY;

    if (!key) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY environment variable is not set. ' +
        'Generate with: node -e "console.log(crypto.randomBytes(32).toString(\'base64\'))"'
      );
    }

    try {
      this.systemMasterKey = Buffer.from(key, 'base64');

      if (this.systemMasterKey.length !== 32) {
        throw new Error(
          `Invalid ENCRYPTION_MASTER_KEY length: expected 32 bytes, got ${this.systemMasterKey.length} bytes`
        );
      }
    } catch (error) {
      throw new Error(
        `Failed to parse ENCRYPTION_MASTER_KEY: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    this.keyCache = new Map();
  }

  /**
   * Generate a new tenant master key during registration
   */
  async generateTenantKey(tenantId: string): Promise<void> {
    const supabase = await createSupabaseServerClient();

    // Check if tenant already has a key
    const { data: existing } = await supabase
      .from('encryption_keys')
      .select('id')
      .eq('tenant_id', tenantId)
      .single();

    if (existing) {
      throw new Error(`Tenant ${tenantId} already has an encryption key`);
    }

    // Generate random 256-bit master key
    const masterKey = crypto.randomBytes(32);
    const salt = crypto.randomBytes(32);

    // Encrypt master key with system key
    const encryptedKey = this.encryptMasterKey(masterKey);

    // Store in database
    const { error } = await supabase.from('encryption_keys').insert({
      tenant_id: tenantId,
      key_version: 1,
      encrypted_master_key: encryptedKey,
      key_derivation_salt: salt,
      algorithm: 'AES-256-GCM',
      is_active: true,
      created_at: new Date().toISOString()
    });

    if (error) {
      throw new Error(`Failed to store tenant encryption key: ${error.message}`);
    }

    console.log(`[EncryptionKeyManager] Generated encryption key for tenant ${tenantId}`);
  }

  /**
   * Retrieve tenant's active master key (with caching)
   */
  async getTenantKey(
    tenantId: string,
    version?: number
  ): Promise<{ masterKey: Buffer; keyVersion: number }> {
    // Check cache first (only for active keys, not specific versions)
    if (!version) {
      const cached = this.keyCache.get(tenantId);
      if (cached && cached.expiresAt > Date.now()) {
        return { masterKey: cached.key, keyVersion: cached.version };
      }
    }

    const supabase = await createSupabaseServerClient();

    let query = supabase
      .from('encryption_keys')
      .select('*')
      .eq('tenant_id', tenantId);

    if (version) {
      query = query.eq('key_version', version);
    } else {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      throw new Error(
        `Tenant encryption key not found for tenant ${tenantId}` +
        (version ? ` version ${version}` : '')
      );
    }

    const masterKey = this.decryptMasterKey(data.encrypted_master_key);

    // Cache active key
    if (!version && data.is_active) {
      this.keyCache.set(tenantId, {
        key: masterKey,
        version: data.key_version,
        expiresAt: Date.now() + this.cacheTTL
      });
    }

    return { masterKey, keyVersion: data.key_version };
  }

  /**
   * Derive field-specific key from master key using HKDF-SHA256
   *
   * This ensures each field uses a different key derived from the master key,
   * providing defense in depth. Field keys are never stored, only derived on demand.
   */
  deriveFieldKey(masterKey: Buffer, fieldName: string): Buffer {
    if (masterKey.length !== 32) {
      throw new Error(
        `Invalid master key length: expected 32 bytes, got ${masterKey.length} bytes`
      );
    }

    // Use field name as context info for HKDF
    const info = Buffer.from(`stewardtrack:field:${fieldName}`, 'utf8');

    // Derive 256-bit key using HKDF-SHA256
    const derivedKey = crypto.hkdfSync(
      'sha256',
      masterKey,
      Buffer.alloc(0), // No salt for HKDF (salt is in tenant key already)
      info,
      32 // 256 bits
    );

    return Buffer.from(derivedKey);
  }

  /**
   * Rotate tenant's encryption key
   *
   * This creates a new key version and marks the old one as inactive.
   * A background job should re-encrypt all data with the new key.
   */
  async rotateKey(tenantId: string): Promise<{ oldVersion: number; newVersion: number }> {
    const supabase = await createSupabaseServerClient();

    // Get current key version
    const { keyVersion: currentVersion } = await this.getTenantKey(tenantId);

    // Generate new master key
    const newMasterKey = crypto.randomBytes(32);
    const newSalt = crypto.randomBytes(32);
    const encryptedKey = this.encryptMasterKey(newMasterKey);

    const now = new Date().toISOString();

    // Mark old key as inactive
    const { error: deactivateError } = await supabase
      .from('encryption_keys')
      .update({
        is_active: false,
        rotated_at: now
      })
      .eq('tenant_id', tenantId)
      .eq('key_version', currentVersion);

    if (deactivateError) {
      throw new Error(`Failed to deactivate old key: ${deactivateError.message}`);
    }

    // Insert new key
    const { error: insertError } = await supabase
      .from('encryption_keys')
      .insert({
        tenant_id: tenantId,
        key_version: currentVersion + 1,
        encrypted_master_key: encryptedKey,
        key_derivation_salt: newSalt,
        algorithm: 'AES-256-GCM',
        is_active: true,
        created_at: now
      });

    if (insertError) {
      throw new Error(`Failed to insert new key: ${insertError.message}`);
    }

    // Clear cache
    this.keyCache.delete(tenantId);

    console.log(
      `[EncryptionKeyManager] Rotated key for tenant ${tenantId}: v${currentVersion} -> v${currentVersion + 1}`
    );

    return { oldVersion: currentVersion, newVersion: currentVersion + 1 };
  }

  /**
   * Clear cached keys (useful for testing or forced key refresh)
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.keyCache.delete(tenantId);
    } else {
      this.keyCache.clear();
    }
  }

  /**
   * Encrypt master key with system key using AES-256-GCM
   */
  private encryptMasterKey(masterKey: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.systemMasterKey, iv);

    const encrypted = Buffer.concat([
      cipher.update(masterKey),
      cipher.final()
    ]);

    const authTag = cipher.getAuthTag();

    // Format: iv (12) + authTag (16) + ciphertext (32) = 60 bytes
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  /**
   * Decrypt master key that was encrypted with system key
   */
  private decryptMasterKey(encryptedKey: string): Buffer {
    const buffer = Buffer.from(encryptedKey, 'base64');

    if (buffer.length !== 60) {
      throw new Error(
        `Invalid encrypted master key length: expected 60 bytes, got ${buffer.length} bytes`
      );
    }

    const iv = buffer.subarray(0, 12);
    const authTag = buffer.subarray(12, 28);
    const ciphertext = buffer.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.systemMasterKey, iv);
    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
      ]);
    } catch (error) {
      throw new Error(
        'Failed to decrypt master key: Authentication failed or key corrupted'
      );
    }
  }
}
