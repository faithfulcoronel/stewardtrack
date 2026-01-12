import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import type {
  EncryptionKey,
  CreateEncryptionKeyInput,
  UpdateEncryptionKeyInput
} from '@/models/encryptionKey.model';

export interface IEncryptionKeyAdapter {
  findByTenantId(tenantId: string): Promise<EncryptionKey | null>;
  findByTenantIdAndVersion(tenantId: string, version: number): Promise<EncryptionKey | null>;
  findActiveTenantKey(tenantId: string): Promise<EncryptionKey | null>;
  createKey(input: CreateEncryptionKeyInput): Promise<void>;
  updateKey(tenantId: string, version: number, input: UpdateEncryptionKeyInput): Promise<void>;
}

@injectable()
export class EncryptionKeyAdapter
  extends BaseAdapter<EncryptionKey>
  implements IEncryptionKeyAdapter
{
  constructor() {
    super();
  }

  /**
   * Find encryption key by tenant ID using service role client
   * Uses service role to bypass RLS (needed during registration when user isn't linked to tenant yet)
   */
  async findByTenantId(tenantId: string): Promise<EncryptionKey | null> {
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as EncryptionKey;
  }

  /**
   * Find encryption key by tenant ID and version using service role client
   */
  async findByTenantIdAndVersion(tenantId: string, version: number): Promise<EncryptionKey | null> {
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('key_version', version)
      .single();

    if (error || !data) {
      return null;
    }

    return data as EncryptionKey;
  }

  /**
   * Find active encryption key for tenant using service role client
   */
  async findActiveTenantKey(tenantId: string): Promise<EncryptionKey | null> {
    const supabase = await getSupabaseServiceClient();

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as EncryptionKey;
  }

  /**
   * Create a new encryption key using service role client
   * This bypasses RLS as it's called during tenant registration
   */
  async createKey(input: CreateEncryptionKeyInput): Promise<void> {
    const supabase = await getSupabaseServiceClient();

    const { error } = await supabase
      .from('encryption_keys')
      .insert(input);

    if (error) {
      throw new Error(`Failed to store tenant encryption key: ${error.message}`);
    }
  }

  /**
   * Update encryption key using service role client
   */
  async updateKey(tenantId: string, version: number, input: UpdateEncryptionKeyInput): Promise<void> {
    const supabase = await getSupabaseServiceClient();

    const { error } = await supabase
      .from('encryption_keys')
      .update(input)
      .eq('tenant_id', tenantId)
      .eq('key_version', version);

    if (error) {
      throw new Error(`Failed to update encryption key: ${error.message}`);
    }
  }
}
