import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface ProductOfferingPrice {
  id: string;
  offering_id: string;
  currency: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IProductOfferingPriceAdapter extends IBaseAdapter<ProductOfferingPrice> {
  getOfferingPrices(offeringId: string): Promise<ProductOfferingPrice[]>;
  upsertOfferingPrice(offeringId: string, currency: string, price: number, isActive: boolean): Promise<ProductOfferingPrice>;
  deleteOfferingPrice(offeringId: string, currency: string): Promise<void>;
  replaceOfferingPrices(offeringId: string, prices: Array<{ currency: string; price: number; is_active: boolean }>): Promise<ProductOfferingPrice[]>;
}

@injectable()
export class ProductOfferingPriceAdapter
  extends BaseAdapter<ProductOfferingPrice>
  implements IProductOfferingPriceAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'product_offering_prices';

  protected defaultSelect = `
    id,
    offering_id,
    currency,
    price,
    is_active,
    created_at,
    updated_at
  `;

  async getOfferingPrices(offeringId: string): Promise<ProductOfferingPrice[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('offering_id', offeringId)
      .order('currency');

    if (error) {
      throw new Error(`Failed to get offering prices: ${error.message}`);
    }

    return (data || []) as ProductOfferingPrice[];
  }

  async upsertOfferingPrice(
    offeringId: string,
    currency: string,
    price: number,
    isActive: boolean
  ): Promise<ProductOfferingPrice> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(
        {
          offering_id: offeringId,
          currency,
          price,
          is_active: isActive,
        },
        {
          onConflict: 'offering_id,currency',
        }
      )
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to upsert offering price: ${error.message}`);
    }

    await this.auditService.logAuditEvent('update', this.tableName, offeringId, {
      offering_id: offeringId,
      currency,
      price,
      is_active: isActive,
    });

    return data as ProductOfferingPrice;
  }

  async deleteOfferingPrice(offeringId: string, currency: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('offering_id', offeringId)
      .eq('currency', currency);

    if (error) {
      throw new Error(`Failed to delete offering price: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', this.tableName, offeringId, {
      offering_id: offeringId,
      currency,
    });
  }

  async replaceOfferingPrices(
    offeringId: string,
    prices: Array<{ currency: string; price: number; is_active: boolean }>
  ): Promise<ProductOfferingPrice[]> {
    const supabase = await this.getSupabaseClient();

    // Delete all existing prices for this offering
    const { error: deleteError } = await supabase
      .from(this.tableName)
      .delete()
      .eq('offering_id', offeringId);

    if (deleteError) {
      throw new Error(`Failed to delete existing prices: ${deleteError.message}`);
    }

    // If no new prices to insert, return empty array
    if (!prices.length) {
      return [];
    }

    // Insert new prices
    const insertData = prices.map((p) => ({
      offering_id: offeringId,
      currency: p.currency,
      price: p.price,
      is_active: p.is_active,
    }));

    const { data, error: insertError } = await supabase
      .from(this.tableName)
      .insert(insertData)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert new prices: ${insertError.message}`);
    }

    await this.auditService.logAuditEvent('update', this.tableName, offeringId, {
      action: 'replace_all',
      offering_id: offeringId,
      prices,
    });

    return (data || []) as ProductOfferingPrice[];
  }

  protected override async onAfterCreate(data: ProductOfferingPrice): Promise<void> {
    await this.auditService.logAuditEvent('create', this.tableName, data.id, data);
  }

  protected override async onAfterUpdate(data: ProductOfferingPrice): Promise<void> {
    await this.auditService.logAuditEvent('update', this.tableName, data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', this.tableName, id, { id });
  }
}
