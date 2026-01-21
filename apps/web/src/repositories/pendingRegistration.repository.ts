/**
 * Pending Registration Repository
 *
 * Repository for managing pending registration records during email verification flow.
 */

import { injectable, inject } from 'inversify';
import type { IPendingRegistrationAdapter } from '@/adapters/pendingRegistration.adapter';
import type { PendingRegistration, CreatePendingRegistrationDto } from '@/models/pendingRegistration.model';
import { TYPES } from '@/lib/types';

export interface IPendingRegistrationRepository {
  create(data: CreatePendingRegistrationDto): Promise<PendingRegistration>;
  findByToken(token: string): Promise<PendingRegistration | null>;
  findByUserId(userId: string): Promise<PendingRegistration | null>;
  findByEmail(email: string): Promise<PendingRegistration | null>;
  markTokenUsed(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

@injectable()
export class PendingRegistrationRepository implements IPendingRegistrationRepository {
  constructor(
    @inject(TYPES.IPendingRegistrationAdapter)
    private readonly adapter: IPendingRegistrationAdapter
  ) {}

  /**
   * Create a new pending registration
   */
  async create(data: CreatePendingRegistrationDto): Promise<PendingRegistration> {
    return await this.adapter.create(data);
  }

  /**
   * Find pending registration by verification token
   * Only returns valid, unused, non-expired tokens
   */
  async findByToken(token: string): Promise<PendingRegistration | null> {
    return await this.adapter.findByToken(token);
  }

  /**
   * Find pending registration by user ID
   */
  async findByUserId(userId: string): Promise<PendingRegistration | null> {
    return await this.adapter.findByUserId(userId);
  }

  /**
   * Find pending registration by email address
   */
  async findByEmail(email: string): Promise<PendingRegistration | null> {
    return await this.adapter.findByEmail(email);
  }

  /**
   * Mark a verification token as used (after successful verification)
   */
  async markTokenUsed(token: string): Promise<void> {
    return await this.adapter.markTokenUsed(token);
  }

  /**
   * Delete pending registration(s) for a user
   */
  async deleteByUserId(userId: string): Promise<void> {
    return await this.adapter.deleteByUserId(userId);
  }
}
