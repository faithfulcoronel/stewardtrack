/**
 * Pending Registration Adapter
 *
 * Handles database operations for pending registrations during email verification.
 * Uses service role client as this table requires elevated privileges (RLS policy: service_role only).
 */

import 'server-only';
import 'reflect-metadata';
import { injectable } from 'inversify';
import { getSupabaseServiceClient } from '@/lib/supabase/service';
import type { PendingRegistration, CreatePendingRegistrationDto } from '@/models/pendingRegistration.model';

export interface IPendingRegistrationAdapter {
  create(data: CreatePendingRegistrationDto): Promise<PendingRegistration>;
  findByToken(token: string): Promise<PendingRegistration | null>;
  findByUserId(userId: string): Promise<PendingRegistration | null>;
  findByEmail(email: string): Promise<PendingRegistration | null>;
  markTokenUsed(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}

@injectable()
export class PendingRegistrationAdapter implements IPendingRegistrationAdapter {
  private tableName = 'pending_registrations';

  /**
   * Get service client for pending registrations
   * This table is only accessible via service role (RLS policy)
   */
  private async getClient() {
    return getSupabaseServiceClient();
  }

  /**
   * Create a new pending registration record
   */
  async create(data: CreatePendingRegistrationDto): Promise<PendingRegistration> {
    const supabase = await this.getClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        user_id: data.user_id,
        verification_token: data.verification_token,
        email: data.email,
        church_name: data.church_name,
        first_name: data.first_name,
        last_name: data.last_name,
        offering_id: data.offering_id,
        denomination: data.denomination ?? null,
        contact_number: data.contact_number ?? null,
        address: data.address ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create pending registration: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to create pending registration: missing response payload');
    }

    return result as unknown as PendingRegistration;
  }

  /**
   * Find a pending registration by verification token
   * Only returns if token is not yet used and not expired
   */
  async findByToken(token: string): Promise<PendingRegistration | null> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('verification_token', token)
      .is('token_used_at', null)
      .gt('token_expires_at', new Date().toISOString())
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find pending registration by token: ${error.message}`);
    }

    return data as unknown as PendingRegistration | null;
  }

  /**
   * Find a pending registration by user ID
   */
  async findByUserId(userId: string): Promise<PendingRegistration | null> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .is('token_used_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find pending registration by user ID: ${error.message}`);
    }

    return data as unknown as PendingRegistration | null;
  }

  /**
   * Find a pending registration by email
   */
  async findByEmail(email: string): Promise<PendingRegistration | null> {
    const supabase = await this.getClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('email', email.toLowerCase())
      .is('token_used_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find pending registration by email: ${error.message}`);
    }

    return data as unknown as PendingRegistration | null;
  }

  /**
   * Mark a verification token as used
   */
  async markTokenUsed(token: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({ token_used_at: new Date().toISOString() })
      .eq('verification_token', token);

    if (error) {
      throw new Error(`Failed to mark token as used: ${error.message}`);
    }
  }

  /**
   * Delete pending registration(s) by user ID
   */
  async deleteByUserId(userId: string): Promise<void> {
    const supabase = await this.getClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete pending registration: ${error.message}`);
    }
  }
}
