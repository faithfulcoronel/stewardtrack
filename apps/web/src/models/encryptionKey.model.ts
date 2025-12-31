/**
 * Encryption Key Model
 *
 * Represents tenant encryption keys stored in the database
 */

export interface EncryptionKey {
  id: string;
  tenant_id: string;
  key_version: number;
  encrypted_master_key: string;
  key_derivation_salt: Buffer;
  algorithm: string;
  is_active: boolean;
  created_at: string;
  rotated_at: string | null;
}

export interface CreateEncryptionKeyInput {
  tenant_id: string;
  key_version: number;
  encrypted_master_key: string;
  key_derivation_salt: Buffer;
  algorithm: string;
  is_active: boolean;
  created_at: string;
}

export interface UpdateEncryptionKeyInput {
  is_active?: boolean;
  rotated_at?: string;
}
