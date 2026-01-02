import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { IProductOfferingPriceAdapter, ProductOfferingPrice } from '@/adapters/productOfferingPrice.adapter';
import { TYPES } from '@/lib/types';

export interface IProductOfferingPriceRepository extends BaseRepository<ProductOfferingPrice> {
  getOfferingPrices(offeringId: string): Promise<ProductOfferingPrice[]>;
  upsertOfferingPrice(offeringId: string, currency: string, price: number, isActive: boolean): Promise<ProductOfferingPrice>;
  deleteOfferingPrice(offeringId: string, currency: string): Promise<void>;
  replaceOfferingPrices(offeringId: string, prices: Array<{ currency: string; price: number; is_active: boolean }>): Promise<ProductOfferingPrice[]>;
}

@injectable()
export class ProductOfferingPriceRepository
  extends BaseRepository<ProductOfferingPrice>
  implements IProductOfferingPriceRepository
{
  constructor(
    @inject(TYPES.IProductOfferingPriceAdapter)
    private readonly productOfferingPriceAdapter: IProductOfferingPriceAdapter
  ) {
    super(productOfferingPriceAdapter);
  }

  async getOfferingPrices(offeringId: string): Promise<ProductOfferingPrice[]> {
    return await this.productOfferingPriceAdapter.getOfferingPrices(offeringId);
  }

  async upsertOfferingPrice(
    offeringId: string,
    currency: string,
    price: number,
    isActive: boolean
  ): Promise<ProductOfferingPrice> {
    return await this.productOfferingPriceAdapter.upsertOfferingPrice(offeringId, currency, price, isActive);
  }

  async deleteOfferingPrice(offeringId: string, currency: string): Promise<void> {
    await this.productOfferingPriceAdapter.deleteOfferingPrice(offeringId, currency);
  }

  async replaceOfferingPrices(
    offeringId: string,
    prices: Array<{ currency: string; price: number; is_active: boolean }>
  ): Promise<ProductOfferingPrice[]> {
    return await this.productOfferingPriceAdapter.replaceOfferingPrices(offeringId, prices);
  }
}
