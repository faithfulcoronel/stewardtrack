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

  async findByTenantId(tenantId: string): Promise<EncryptionKey | null> {
    const supabase = await this.getSupabaseClient();

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

  async findByTenantIdAndVersion(tenantId: string, version: number): Promise<EncryptionKey | null> {
    const supabase = await this.getSupabaseClient();

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

  async findActiveTenantKey(tenantId: string): Promise<EncryptionKey | null> {
    const supabase = await this.getSupabaseClient();

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

  async updateKey(tenantId: string, version: number, input: UpdateEncryptionKeyInput): Promise<void> {
    const supabase = await this.getSupabaseClient();

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
