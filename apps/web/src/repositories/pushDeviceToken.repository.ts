/**
 * ================================================================================
 * PUSH DEVICE TOKEN REPOSITORY
 * ================================================================================
 *
 * Repository layer for push device tokens. Delegates to the adapter.
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IPushDeviceTokenAdapter } from '@/adapters/pushDeviceToken.adapter';
import type {
  PushDeviceToken,
  CreatePushDeviceTokenDto,
  UpdatePushDeviceTokenDto,
} from '@/models/notification/pushDeviceToken.model';

export interface IPushDeviceTokenRepository {
  findByUserId(userId: string): Promise<PushDeviceToken[]>;
  findActiveByUserId(userId: string): Promise<PushDeviceToken[]>;
  findByToken(token: string): Promise<PushDeviceToken | null>;
  findById(id: string): Promise<PushDeviceToken | null>;
  upsert(userId: string, tenantId: string, dto: CreatePushDeviceTokenDto): Promise<PushDeviceToken>;
  update(id: string, dto: UpdatePushDeviceTokenDto): Promise<PushDeviceToken | null>;
  updateLastUsed(id: string): Promise<void>;
  delete(id: string): Promise<boolean>;
  deleteByToken(token: string): Promise<boolean>;
  deleteAllByUserId(userId: string): Promise<number>;
  deactivate(id: string): Promise<boolean>;
  findByUserIds(userIds: string[]): Promise<PushDeviceToken[]>;
}

@injectable()
export class PushDeviceTokenRepository implements IPushDeviceTokenRepository {
  constructor(
    @inject(TYPES.IPushDeviceTokenAdapter) private adapter: IPushDeviceTokenAdapter
  ) {}

  async findByUserId(userId: string): Promise<PushDeviceToken[]> {
    return this.adapter.findByUserId(userId);
  }

  async findActiveByUserId(userId: string): Promise<PushDeviceToken[]> {
    return this.adapter.findActiveByUserId(userId);
  }

  async findByToken(token: string): Promise<PushDeviceToken | null> {
    return this.adapter.findByToken(token);
  }

  async findById(id: string): Promise<PushDeviceToken | null> {
    return this.adapter.findById(id);
  }

  async upsert(
    userId: string,
    tenantId: string,
    dto: CreatePushDeviceTokenDto
  ): Promise<PushDeviceToken> {
    return this.adapter.upsert(userId, tenantId, dto);
  }

  async update(id: string, dto: UpdatePushDeviceTokenDto): Promise<PushDeviceToken | null> {
    return this.adapter.updateToken(id, dto);
  }

  async updateLastUsed(id: string): Promise<void> {
    return this.adapter.updateLastUsed(id);
  }

  async delete(id: string): Promise<boolean> {
    const token = await this.adapter.findById(id);
    if (!token) return false;
    return this.adapter.deleteByToken(token.token);
  }

  async deleteByToken(token: string): Promise<boolean> {
    return this.adapter.deleteByToken(token);
  }

  async deleteAllByUserId(userId: string): Promise<number> {
    return this.adapter.deleteAllByUserId(userId);
  }

  async deactivate(id: string): Promise<boolean> {
    return this.adapter.deactivate(id);
  }

  async findByUserIds(userIds: string[]): Promise<PushDeviceToken[]> {
    return this.adapter.findByUserIds(userIds);
  }
}
