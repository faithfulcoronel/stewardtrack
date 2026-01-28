import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IProductOfferingImportExportAdapter,
  ProductOfferingExportRow,
  ProductOfferingUpsertData,
  BulkUpsertResult,
  ExistingOfferingWithPrices,
  FeatureCatalogEntry,
  BundleEntry,
} from '@/adapters/productOfferingImportExport.adapter';

export interface IProductOfferingImportExportRepository {
  /**
   * Get all product offerings formatted for export
   */
  getAllOfferingsForExport(): Promise<ProductOfferingExportRow[]>;

  /**
   * Get existing offerings by codes for preview comparison
   */
  getExistingOfferingsByCodes(codes: string[]): Promise<ExistingOfferingWithPrices[]>;

  /**
   * Execute bulk upsert via RPC
   */
  executeBulkUpsert(offerings: ProductOfferingUpsertData[], userId: string): Promise<BulkUpsertResult>;

  /**
   * Get all feature codes for reference data
   */
  getAllFeatureCodes(): Promise<FeatureCatalogEntry[]>;

  /**
   * Get all bundle codes for reference data
   */
  getAllBundleCodes(): Promise<BundleEntry[]>;
}

@injectable()
export class ProductOfferingImportExportRepository implements IProductOfferingImportExportRepository {
  constructor(
    @inject(TYPES.IProductOfferingImportExportAdapter)
    private adapter: IProductOfferingImportExportAdapter
  ) {}

  async getAllOfferingsForExport(): Promise<ProductOfferingExportRow[]> {
    return this.adapter.getAllOfferingsForExport();
  }

  async getExistingOfferingsByCodes(codes: string[]): Promise<ExistingOfferingWithPrices[]> {
    return this.adapter.getExistingOfferingsByCodes(codes);
  }

  async executeBulkUpsert(offerings: ProductOfferingUpsertData[], userId: string): Promise<BulkUpsertResult> {
    return this.adapter.executeBulkUpsert(offerings, userId);
  }

  async getAllFeatureCodes(): Promise<FeatureCatalogEntry[]> {
    return this.adapter.getAllFeatureCodes();
  }

  async getAllBundleCodes(): Promise<BundleEntry[]> {
    return this.adapter.getAllBundleCodes();
  }
}
