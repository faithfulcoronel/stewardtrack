import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IFeatureImportAdapter,
  ImportData,
  ImportResult,
  ExportData,
} from '@/adapters/featureImport.adapter';

// ============================================================================
// Interface
// ============================================================================

export interface IFeatureImportRepository {
  getExportData(): Promise<ExportData>;
  importBatch(data: ImportData, userId: string): Promise<ImportResult>;
}

// ============================================================================
// Implementation
// ============================================================================

@injectable()
export class FeatureImportRepository implements IFeatureImportRepository {
  constructor(
    @inject(TYPES.IFeatureImportAdapter)
    private readonly adapter: IFeatureImportAdapter,
  ) {}

  /**
   * Gets all features, permissions, and role templates for export/template download
   */
  public async getExportData(): Promise<ExportData> {
    return this.adapter.getExportData();
  }

  /**
   * Imports features, permissions, and role templates via RPC
   */
  public async importBatch(data: ImportData, userId: string): Promise<ImportResult> {
    return this.adapter.importBatch(data, userId);
  }
}
