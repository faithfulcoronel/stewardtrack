import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
import type { ILicenseAssignmentAdapter } from '@/adapters/licenseAssignment.adapter';
import type {
  LicenseAssignment,
  LicenseAssignmentWithDetails,
  TenantForAssignment,
  AssignmentResult,
  CreateLicenseAssignmentDto,
  LicenseHistoryEntry,
  FeatureChangeSummary,
} from '@/models/licenseAssignment.model';
import { TYPES } from '@/lib/types';

export interface ILicenseAssignmentRepository extends BaseRepository<LicenseAssignment> {
  /**
   * Assigns a product offering to a tenant
   */
  assignLicenseToTenant(data: CreateLicenseAssignmentDto): Promise<AssignmentResult>;

  /**
   * Gets all tenants available for license assignment
   */
  getTenantsForAssignment(): Promise<TenantForAssignment[]>;

  /**
   * Gets the license assignment history for a tenant
   */
  getTenantLicenseHistory(tenantId: string): Promise<LicenseHistoryEntry[]>;

  /**
   * Gets a preview of feature changes for an assignment
   */
  getFeatureChangeSummary(
    tenantId: string,
    newOfferingId: string
  ): Promise<FeatureChangeSummary>;

  /**
   * Gets assignment details with related data
   */
  getAssignmentWithDetails(assignmentId: string): Promise<LicenseAssignmentWithDetails | null>;
}

@injectable()
export class LicenseAssignmentRepository
  extends BaseRepository<LicenseAssignment>
  implements ILicenseAssignmentRepository
{
  constructor(
    @inject(TYPES.ILicenseAssignmentAdapter)
    private readonly licenseAssignmentAdapter: ILicenseAssignmentAdapter
  ) {
    super(licenseAssignmentAdapter);
  }

  /**
   * Assigns a product offering to a tenant
   */
  async assignLicenseToTenant(
    data: CreateLicenseAssignmentDto
  ): Promise<AssignmentResult> {
    return await this.licenseAssignmentAdapter.assignLicenseToTenant(data);
  }

  /**
   * Gets all tenants available for license assignment
   */
  async getTenantsForAssignment(): Promise<TenantForAssignment[]> {
    return await this.licenseAssignmentAdapter.getTenantsForAssignment();
  }

  /**
   * Gets the license assignment history for a tenant
   */
  async getTenantLicenseHistory(tenantId: string): Promise<LicenseHistoryEntry[]> {
    return await this.licenseAssignmentAdapter.getTenantLicenseHistory(tenantId);
  }

  /**
   * Gets a preview of feature changes for an assignment
   */
  async getFeatureChangeSummary(
    tenantId: string,
    newOfferingId: string
  ): Promise<FeatureChangeSummary> {
    return await this.licenseAssignmentAdapter.getFeatureChangeSummary(
      tenantId,
      newOfferingId
    );
  }

  /**
   * Gets assignment details with related data
   */
  async getAssignmentWithDetails(
    assignmentId: string
  ): Promise<LicenseAssignmentWithDetails | null> {
    return await this.licenseAssignmentAdapter.getAssignmentWithDetails(assignmentId);
  }
}
