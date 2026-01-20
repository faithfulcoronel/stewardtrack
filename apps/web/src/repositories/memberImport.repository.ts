import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type {
  IMemberImportAdapter,
  MemberImportData,
  MemberImportResult,
  MemberExportRow,
} from '@/adapters/memberImport.adapter';

// =============================================================================
// Repository Interface
// =============================================================================

export interface IMemberImportRepository {
  importMembers(
    data: MemberImportData,
    tenantId: string,
    userId: string
  ): Promise<MemberImportResult>;

  getMembershipTypes(tenantId: string): Promise<Array<{ id: string; name: string; code: string }>>;
  getMembershipStages(tenantId: string): Promise<Array<{ id: string; name: string; code: string }>>;
  getMembershipCenters(tenantId: string): Promise<Array<{ id: string; name: string; code: string }>>;

  /** Fetch all members for export */
  getAllMembersForExport(tenantId: string): Promise<MemberExportRow[]>;
}

// =============================================================================
// Repository Implementation
// =============================================================================

@injectable()
export class MemberImportRepository implements IMemberImportRepository {
  constructor(
    @inject(TYPES.IMemberImportAdapter)
    private readonly memberImportAdapter: IMemberImportAdapter
  ) {}

  /**
   * Import members in batch
   */
  async importMembers(
    data: MemberImportData,
    tenantId: string,
    userId: string
  ): Promise<MemberImportResult> {
    return this.memberImportAdapter.importMembers(data, tenantId, userId);
  }

  /**
   * Get all membership types for validation
   */
  async getMembershipTypes(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    return this.memberImportAdapter.getMembershipTypes(tenantId);
  }

  /**
   * Get all membership stages for validation
   */
  async getMembershipStages(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    return this.memberImportAdapter.getMembershipStages(tenantId);
  }

  /**
   * Get all membership centers for validation
   */
  async getMembershipCenters(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    return this.memberImportAdapter.getMembershipCenters(tenantId);
  }

  /**
   * Fetch all members for export
   */
  async getAllMembersForExport(tenantId: string): Promise<MemberExportRow[]> {
    return this.memberImportAdapter.getAllMembersForExport(tenantId);
  }
}
