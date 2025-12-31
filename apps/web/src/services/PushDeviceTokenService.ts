/**
 * ================================================================================
 * PUSH DEVICE TOKEN SERVICE
 * ================================================================================
 *
 * Business logic layer for managing push notification device tokens.
 *
 * ================================================================================
 */

import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IPushDeviceTokenRepository } from '@/repositories/pushDeviceToken.repository';
import type {
  PushDeviceToken,
  CreatePushDeviceTokenDto,
  UpdatePushDeviceTokenDto,
} from '@/models/notification/pushDeviceToken.model';

export interface IPushDeviceTokenService {
  /**
   * Register a new device token for a user
   */
  registerToken(
    userId: string,
    tenantId: string,
    dto: CreatePushDeviceTokenDto
  ): Promise<PushDeviceToken>;

  /**
   * Unregister a device token
   */
  unregisterToken(userId: string, token: string): Promise<boolean>;

  /**
   * Get all active device tokens for a user
   */
  getActiveTokens(userId: string): Promise<PushDeviceToken[]>;

  /**
   * Get all device tokens for a user (including inactive)
   */
  getAllTokens(userId: string): Promise<PushDeviceToken[]>;

  /**
   * Update a device token
   */
  updateToken(userId: string, tokenId: string, dto: UpdatePushDeviceTokenDto): Promise<PushDeviceToken | null>;

  /**
   * Deactivate a device token (e.g., when FCM reports it as invalid)
   */
  deactivateToken(tokenId: string): Promise<boolean>;

  /**
   * Deactivate a device token by token string
   */
  deactivateByTokenString(token: string): Promise<boolean>;

  /**
   * Get device tokens for multiple users (for bulk notifications)
   */
  getTokensForUsers(userIds: string[]): Promise<Map<string, string[]>>;

  /**
   * Clean up all tokens for a user (e.g., on logout)
   */
  clearAllTokens(userId: string): Promise<number>;

  /**
   * Record that a token was used (update last_used_at)
   */
  recordTokenUsage(tokenId: string): Promise<void>;
}

@injectable()
export class PushDeviceTokenService implements IPushDeviceTokenService {
  constructor(
    @inject(TYPES.IPushDeviceTokenRepository) private tokenRepo: IPushDeviceTokenRepository
  ) {}

  async registerToken(
    userId: string,
    tenantId: string,
    dto: CreatePushDeviceTokenDto
  ): Promise<PushDeviceToken> {
    // Upsert the token (create or update if exists)
    const token = await this.tokenRepo.upsert(userId, tenantId, dto);
    return token;
  }

  async unregisterToken(userId: string, token: string): Promise<boolean> {
    // Find the token first to verify ownership
    const existingToken = await this.tokenRepo.findByToken(token);

    if (!existingToken) {
      return false;
    }

    // Verify the token belongs to the user
    if (existingToken.user_id !== userId) {
      console.warn('Attempt to unregister token belonging to another user');
      return false;
    }

    return await this.tokenRepo.deleteByToken(token);
  }

  async getActiveTokens(userId: string): Promise<PushDeviceToken[]> {
    return await this.tokenRepo.findActiveByUserId(userId);
  }

  async getAllTokens(userId: string): Promise<PushDeviceToken[]> {
    return await this.tokenRepo.findByUserId(userId);
  }

  async updateToken(
    userId: string,
    tokenId: string,
    dto: UpdatePushDeviceTokenDto
  ): Promise<PushDeviceToken | null> {
    // Verify the token belongs to the user
    const existingToken = await this.tokenRepo.findById(tokenId);

    if (!existingToken || existingToken.user_id !== userId) {
      return null;
    }

    return await this.tokenRepo.update(tokenId, dto);
  }

  async deactivateToken(tokenId: string): Promise<boolean> {
    return await this.tokenRepo.deactivate(tokenId);
  }

  async deactivateByTokenString(token: string): Promise<boolean> {
    const existingToken = await this.tokenRepo.findByToken(token);

    if (!existingToken) {
      return false;
    }

    return await this.tokenRepo.deactivate(existingToken.id);
  }

  async getTokensForUsers(userIds: string[]): Promise<Map<string, string[]>> {
    const tokens = await this.tokenRepo.findByUserIds(userIds);

    // Group tokens by user ID
    const tokenMap = new Map<string, string[]>();

    for (const token of tokens) {
      const userTokens = tokenMap.get(token.user_id) || [];
      userTokens.push(token.token);
      tokenMap.set(token.user_id, userTokens);
    }

    return tokenMap;
  }

  async clearAllTokens(userId: string): Promise<number> {
    return await this.tokenRepo.deleteAllByUserId(userId);
  }

  async recordTokenUsage(tokenId: string): Promise<void> {
    await this.tokenRepo.updateLastUsed(tokenId);
  }
}
