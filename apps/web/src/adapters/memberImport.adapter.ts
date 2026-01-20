import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import type { FieldEncryptionConfig } from '@/types/encryption';
import { TYPES } from '@/lib/types';

// =============================================================================
// Types
// =============================================================================

export interface MemberImportRow {
  first_name: string;
  last_name: string;
  middle_name?: string | null;
  preferred_name?: string | null;
  email?: string | null;
  contact_number?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  marital_status?: 'single' | 'married' | 'widowed' | 'divorced' | 'engaged' | null;
  birthday?: string | null;
  anniversary?: string | null;
  address_street?: string | null;
  address_city?: string | null;
  address_state?: string | null;
  address_postal_code?: string | null;
  address_country?: string | null;
  occupation?: string | null;
  membership_type_code?: string | null;
  membership_stage_code?: string | null;
  membership_center_code?: string | null;
  membership_date?: string | null;
  tags?: string[] | null;
}

export interface MemberImportResult {
  success: boolean;
  imported_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
  imported_ids: string[];
}

export interface MemberImportData {
  members: MemberImportRow[];
}

// =============================================================================
// Export Types
// =============================================================================

export interface MemberExportRow {
  first_name: string;
  last_name: string;
  middle_name: string | null;
  preferred_name: string | null;
  email: string | null;
  contact_number: string | null;
  gender: string | null;
  marital_status: string | null;
  birthday: string | null;
  anniversary: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_postal_code: string | null;
  address_country: string | null;
  occupation: string | null;
  membership_type_code: string | null;
  membership_stage_code: string | null;
  membership_center_code: string | null;
  membership_date: string | null;
  tags: string | null;
}

// =============================================================================
// Adapter Interface
// =============================================================================

export interface IMemberImportAdapter {
  importMembers(
    data: MemberImportData,
    tenantId: string,
    userId: string
  ): Promise<MemberImportResult>;

  getMembershipTypes(tenantId: string): Promise<Array<{ id: string; name: string; code: string }>>;
  getMembershipStages(tenantId: string): Promise<Array<{ id: string; name: string; code: string }>>;
  getMembershipCenters(tenantId: string): Promise<Array<{ id: string; name: string; code: string }>>;

  /** Fetch all members for export in import-compatible format */
  getAllMembersForExport(tenantId: string): Promise<MemberExportRow[]>;
}

// =============================================================================
// Adapter Implementation
// =============================================================================

@injectable()
export class MemberImportAdapter implements IMemberImportAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {}

  /**
   * PII fields that need encryption for member import/export.
   * Note: Individual address fields (address_street, etc.) are NOT encrypted,
   * only the combined 'address' field is encrypted in the main members table.
   */
  private getPIIFields(): FieldEncryptionConfig[] {
    return [
      { fieldName: 'first_name', required: true },
      { fieldName: 'last_name', required: true },
      { fieldName: 'middle_name', required: false },
      { fieldName: 'email', required: false },
      { fieldName: 'contact_number', required: false },
    ];
  }

  /**
   * Get Supabase client with server-side credentials
   */
  protected async getSupabaseClient() {
    const { createSupabaseServerClient } = await import('@/lib/supabase/server');
    return await createSupabaseServerClient();
  }

  /**
   * Import members in batch via RPC function.
   * Encrypts PII fields before import.
   */
  async importMembers(
    data: MemberImportData,
    tenantId: string,
    userId: string
  ): Promise<MemberImportResult> {
    const supabase = await this.getSupabaseClient();

    // Encrypt PII fields for each member before import
    const encryptedMembers: MemberImportRow[] = [];
    const piiFields = this.getPIIFields();

    for (const member of data.members) {
      try {
        const encrypted = await this.encryptionService.encryptFields(
          member as unknown as Record<string, unknown>,
          tenantId,
          piiFields
        );
        encryptedMembers.push(encrypted as unknown as MemberImportRow);
      } catch (error) {
        console.error('[MemberImportAdapter] Encryption failed for member:', error);
        throw new Error(
          `Failed to encrypt member data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(`[MemberImportAdapter] Encrypted ${encryptedMembers.length} members for import`);

    // Call the RPC function for batch import with encrypted data
    const { data: result, error } = await supabase.rpc('import_members_batch', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_members: encryptedMembers,
    });

    if (error) {
      console.error('[MemberImportAdapter] RPC error:', error);
      throw new Error(`Failed to import members: ${error.message}`);
    }

    const importResult = result as unknown as MemberImportResult;

    // Log audit event for bulk import (use 'create' since we're creating members)
    if (importResult.imported_count > 0) {
      await this.auditService.logAuditEvent('create', 'members', tenantId, {
        action: 'bulk_import',
        imported_count: importResult.imported_count,
        error_count: importResult.error_count,
      });
    }

    return importResult;
  }

  /**
   * Get all membership types for validation and template
   */
  async getMembershipTypes(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('membership_type')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch membership types: ${error.message}`);
    }

    return (data as unknown as Array<{ id: string; name: string; code: string }>) || [];
  }

  /**
   * Get all membership stages for validation and template
   */
  async getMembershipStages(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('membership_stage')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch membership stages: ${error.message}`);
    }

    return (data as unknown as Array<{ id: string; name: string; code: string }>) || [];
  }

  /**
   * Get all membership centers for validation and template
   */
  async getMembershipCenters(
    tenantId: string
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('membership_center')
      .select('id, name, code')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch membership centers: ${error.message}`);
    }

    return (data as unknown as Array<{ id: string; name: string; code: string }>) || [];
  }

  /**
   * Fetch all members for export in import-compatible format.
   * Decrypts PII fields before returning.
   */
  async getAllMembersForExport(tenantId: string): Promise<MemberExportRow[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('members')
      .select(`
        first_name,
        last_name,
        middle_name,
        preferred_name,
        email,
        contact_number,
        gender,
        marital_status,
        birthday,
        anniversary,
        address_street,
        address_city,
        address_state,
        address_postal_code,
        address_country,
        occupation,
        membership_date,
        tags,
        encrypted_fields,
        membership_type:membership_type_id(code),
        membership_stage:membership_status_id(code),
        membership_center:membership_center_id(code)
      `)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('last_name')
      .order('first_name');

    if (error) {
      throw new Error(`Failed to fetch members for export: ${error.message}`);
    }

    const piiFields = this.getPIIFields();
    const exportRows: MemberExportRow[] = [];

    // Transform and decrypt each member
    for (const member of data || []) {
      const memberData = member as Record<string, unknown>;
      const encryptedFields = memberData.encrypted_fields as string[] | null;

      // Decrypt PII fields if the record has encrypted fields
      let decryptedMember = memberData;
      if (encryptedFields && encryptedFields.length > 0) {
        try {
          decryptedMember = await this.encryptionService.decryptFields(
            memberData,
            tenantId,
            piiFields
          );
        } catch (decryptError) {
          console.error('[MemberImportAdapter] Decryption failed for member, using encrypted data:', decryptError);
          // Continue with encrypted data as fallback
        }
      }

      const membershipType = decryptedMember.membership_type as { code: string } | null;
      const membershipStage = decryptedMember.membership_stage as { code: string } | null;
      const membershipCenter = decryptedMember.membership_center as { code: string } | null;
      const tags = decryptedMember.tags as string[] | null;

      exportRows.push({
        first_name: decryptedMember.first_name as string,
        last_name: decryptedMember.last_name as string,
        middle_name: decryptedMember.middle_name as string | null,
        preferred_name: decryptedMember.preferred_name as string | null,
        email: decryptedMember.email as string | null,
        contact_number: decryptedMember.contact_number as string | null,
        gender: decryptedMember.gender as string | null,
        marital_status: decryptedMember.marital_status as string | null,
        birthday: decryptedMember.birthday ? this.formatDate(decryptedMember.birthday as string) : null,
        anniversary: decryptedMember.anniversary ? this.formatDate(decryptedMember.anniversary as string) : null,
        address_street: decryptedMember.address_street as string | null,
        address_city: decryptedMember.address_city as string | null,
        address_state: decryptedMember.address_state as string | null,
        address_postal_code: decryptedMember.address_postal_code as string | null,
        address_country: decryptedMember.address_country as string | null,
        occupation: decryptedMember.occupation as string | null,
        membership_type_code: membershipType?.code || null,
        membership_stage_code: membershipStage?.code || null,
        membership_center_code: membershipCenter?.code || null,
        membership_date: decryptedMember.membership_date ? this.formatDate(decryptedMember.membership_date as string) : null,
        tags: tags && tags.length > 0 ? tags.join(', ') : null,
      });
    }

    console.log(`[MemberImportAdapter] Exported and decrypted ${exportRows.length} members`);
    return exportRows;
  }

  /**
   * Format a date string to YYYY-MM-DD format
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return dateString;
    }
  }
}
