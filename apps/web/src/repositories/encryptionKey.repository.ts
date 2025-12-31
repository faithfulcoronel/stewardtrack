import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IEncryptionKeyAdapter } from '@/adapters/encryptionKey.adapter';
import type {
  EncryptionKey,
  CreateEncryptionKeyInput
} from '@/models/encryptionKey.model';

export interface IEncryptionKeyRepository {
  findByTenantId(tenantId: string): Promise<EncryptionKey | null>;
  findByTenantIdAndVersion(tenantId: string, version: number): Promise<EncryptionKey | null>;
  findActiveTenantKey(tenantId: string): Promise<EncryptionKey | null>;
  createKey(input: CreateEncryptionKeyInput): Promise<void>;
  deactivateKey(tenantId: string, version: number, rotatedAt: string): Promise<void>;
}

@injectable()
export class EncryptionKeyRepository implements IEncryptionKeyRepository {
  constructor(
    @inject(TYPES.IEncryptionKeyAdapter)
    private adapter: IEncryptionKeyAdapter
  ) {}

  async findByTenantId(tenantId: string): Promise<EncryptionKey | null> {
    return this.adapter.findByTenantId(tenantId);
  }

  async findByTenantIdAndVersion(tenantId: string, version: number): Promise<EncryptionKey | null> {
    return this.adapter.findByTenantIdAndVersion(tenantId, version);
  }

  async findActiveTenantKey(tenantId: string): Promise<EncryptionKey | null> {
    return this.adapter.findActiveTenantKey(tenantId);
  }

  async createKey(input: CreateEncryptionKeyInput): Promise<void> {
    return this.adapter.createKey(input);
  }

  async deactivateKey(tenantId: string, version: number, rotatedAt: string): Promise<void> {
    return this.adapter.updateKey(tenantId, version, {
      is_active: false,
      rotated_at: rotatedAt
    });
  }
}
