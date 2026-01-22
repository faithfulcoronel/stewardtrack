import 'server-only';
import { injectable } from 'inversify';
import { BaseAdapter } from './base.adapter';
import { AICreditPackage } from '@/models/aiCreditPackage.model';
import { IBaseAdapter } from './base.adapter';

export interface IAICreditPackageAdapter extends IBaseAdapter<AICreditPackage> {
  findById(id: string): Promise<AICreditPackage | null>;
  getActivePackages(currency: string): Promise<AICreditPackage[]>;
  getFeaturedPackages(currency: string): Promise<AICreditPackage[]>;
  softDelete(id: string): Promise<void>;
  restore(id: string): Promise<void>;
}

@injectable()
export class AICreditPackageAdapter
  extends BaseAdapter<AICreditPackage>
  implements IAICreditPackageAdapter
{
  protected tableName = 'ai_credit_packages';
  protected defaultSelect = `
    id,
    name,
    description,
    credits_amount,
    price,
    currency,
    sort_order,
    is_featured,
    badge_text,
    savings_percent,
    is_active,
    created_at,
    updated_at,
    deleted_at
  `;

  /**
   * Get active packages filtered by currency, sorted by sort_order
   */
  async getActivePackages(currency: string): Promise<AICreditPackage[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('is_active', true)
      .eq('currency', currency)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get active packages: ${error.message}`);
    }

    return (data || []) as unknown as AICreditPackage[];
  }

  /**
   * Get featured packages
   */
  async getFeaturedPackages(currency: string): Promise<AICreditPackage[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('is_active', true)
      .eq('is_featured', true)
      .eq('currency', currency)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to get featured packages: ${error.message}`);
    }

    return (data || []) as unknown as AICreditPackage[];
  }

  /**
   * Soft delete a package
   */
  async softDelete(id: string): Promise<void> {
    const client = await this.getSupabaseClient();
    const { error } = await client
      .from(this.tableName)
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to soft delete package: ${error.message}`);
    }
  }

  /**
   * Restore a soft-deleted package
   */
  async restore(id: string): Promise<void> {
    const client = await this.getSupabaseClient();
    const { error } = await client
      .from(this.tableName)
      .update({
        deleted_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to restore package: ${error.message}`);
    }
  }

  /**
   * Override findById to not filter by tenant_id (packages are global)
   */
  async findById(id: string): Promise<AICreditPackage | null> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      throw new Error(`Failed to find package by id: ${error.message}`);
    }

    return data as unknown as AICreditPackage;
  }

  /**
   * Override findAll to exclude deleted packages by default
   */
  async findAll(): Promise<AICreditPackage[]> {
    const client = await this.getSupabaseClient();
    const { data, error } = await client
      .from(this.tableName)
      .select(this.defaultSelect)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to find packages: ${error.message}`);
    }

    return (data || []) as unknown as AICreditPackage[];
  }
}
