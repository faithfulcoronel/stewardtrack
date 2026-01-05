import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { Family } from '@/models/family.model';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import { TYPES } from '@/lib/types';

export interface IFamilyAdapter extends IBaseAdapter<Family> {
  findByIdAndTenant(familyId: string, tenantId: string): Promise<Family | null>;
  findByTenant(tenantId: string): Promise<Family[]>;
  findByTenantWithMemberSummary(tenantId: string): Promise<Family[]>;
  searchByName(tenantId: string, searchTerm: string): Promise<Family[]>;
  findWithMembers(familyId: string, tenantId: string): Promise<Family | null>;
}

@injectable()
export class FamilyAdapter extends BaseAdapter<Family> implements IFamilyAdapter {
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  /**
   * Get PII field configuration for members table
   */
  private getMemberPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  protected tableName = 'families';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    formal_name,
    address_street,
    address_street2,
    address_city,
    address_state,
    address_postal_code,
    address_country,
    family_photo_url,
    notes,
    tags,
    encrypted_fields,
    encryption_key_version,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at
  `;

  protected selectWithMembers = `
    id,
    tenant_id,
    name,
    formal_name,
    address_street,
    address_street2,
    address_city,
    address_state,
    address_postal_code,
    address_country,
    family_photo_url,
    notes,
    tags,
    encrypted_fields,
    encryption_key_version,
    created_by,
    updated_by,
    created_at,
    updated_at,
    deleted_at,
    family_members (
      id,
      member_id,
      is_primary,
      role,
      role_notes,
      is_active,
      joined_at,
      left_at,
      members:member_id (
        id,
        first_name,
        last_name,
        email,
        contact_number,
        profile_picture_url,
        encrypted_fields
      )
    )
  `;

  protected override async onAfterCreate(data: Family): Promise<void> {
    await this.auditService.logAuditEvent('create', 'family', data.id!, data);
  }

  protected override async onAfterUpdate(data: Family): Promise<void> {
    await this.auditService.logAuditEvent('update', 'family', data.id!, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'family', id, { id });
  }

  /**
   * Find a family by ID within a tenant (tenant-scoped)
   */
  async findByIdAndTenant(familyId: string, tenantId: string): Promise<Family | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', familyId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find family by ID: ${error.message}`);
    }

    return data as Family | null;
  }

  /**
   * Find all families for a tenant (non-deleted)
   */
  async findByTenant(tenantId: string): Promise<Family[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find families by tenant: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data as unknown as Family[];
  }

  /**
   * Find all families for a tenant with member count and head info for list views
   */
  async findByTenantWithMemberSummary(tenantId: string): Promise<Family[]> {
    const supabase = await this.getSupabaseClient();

    // Select with member summary - get count and head member info
    const selectWithSummary = `
      ${this.defaultSelect},
      family_members!inner (
        id,
        member_id,
        is_primary,
        role,
        is_active,
        members:member_id (
          id,
          first_name,
          last_name,
          encrypted_fields
        )
      )
    `;

    const { data, error } = await supabase
      .from(this.tableName)
      .select(selectWithSummary)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      // If inner join fails (no members), fall back to basic query
      console.log('[FamilyAdapter] Inner join failed, trying left join:', error.message);
      return this.findByTenantWithMemberSummaryLeftJoin(tenantId);
    }

    if (!data) {
      return [];
    }

    // Transform and decrypt member data
    return this.transformFamiliesWithMembers(data, tenantId);
  }

  /**
   * Helper: Find families with left join for families that may have no members
   */
  private async findByTenantWithMemberSummaryLeftJoin(tenantId: string): Promise<Family[]> {
    const supabase = await this.getSupabaseClient();

    const selectWithSummary = `
      ${this.defaultSelect},
      family_members (
        id,
        member_id,
        is_primary,
        role,
        is_active,
        members:member_id (
          id,
          first_name,
          last_name,
          encrypted_fields
        )
      )
    `;

    const { data, error } = await supabase
      .from(this.tableName)
      .select(selectWithSummary)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find families with summary: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return this.transformFamiliesWithMembers(data, tenantId);
  }

  /**
   * Helper: Transform raw family data with members and decrypt PII
   */
  private async transformFamiliesWithMembers(
    data: unknown[],
    tenantId: string
  ): Promise<Family[]> {
    const families: Family[] = [];

    for (const raw of data) {
      const familyData = raw as Record<string, unknown> & {
        family_members?: Array<{
          id: string;
          member_id: string;
          is_primary: boolean;
          role: string;
          is_active: boolean;
          members: {
            id: string;
            first_name: string;
            last_name: string;
            encrypted_fields: string[] | null;
          } | null;
        }>;
      };

      const family = { ...familyData } as unknown as Family;
      const activeMembers = (familyData.family_members || []).filter(fm => fm.is_active);

      // Set member count
      family.member_count = activeMembers.length;

      // Find head of family and decrypt their name
      const headMembership = activeMembers.find(fm => fm.role === 'head');
      if (headMembership?.members) {
        let memberData = headMembership.members;

        // Decrypt if encrypted
        if (memberData.encrypted_fields && memberData.encrypted_fields.length > 0) {
          try {
            const decrypted = await this.encryptionService.decryptFields(
              memberData as Record<string, unknown>,
              tenantId,
              this.getMemberPIIFields()
            );
            memberData = decrypted as typeof memberData;
          } catch (decryptError) {
            console.error('[FamilyAdapter] Failed to decrypt head member:', decryptError);
          }
        }

        family.head = {
          id: headMembership.id,
          tenant_id: tenantId,
          family_id: family.id!,
          member_id: headMembership.member_id,
          is_primary: headMembership.is_primary,
          role: 'head',
          is_active: headMembership.is_active,
          member: memberData,
        };
      } else {
        family.head = null;
      }

      // Clean up raw data
      delete (family as unknown as Record<string, unknown>).family_members;

      families.push(family);
    }

    return families;
  }

  /**
   * Search families by name within a tenant
   */
  async searchByName(tenantId: string, searchTerm: string): Promise<Family[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`name.ilike.%${searchTerm}%,formal_name.ilike.%${searchTerm}%`)
      .order('name', { ascending: true })
      .limit(50);

    if (error) {
      throw new Error(`Failed to search families: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return data as unknown as Family[];
  }

  /**
   * Find a family with its members
   */
  async findWithMembers(familyId: string, tenantId: string): Promise<Family | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMembers)
      .eq('id', familyId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find family with members: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Transform the nested data structure
    const family = data as unknown as Family & {
      family_members?: Array<{
        id: string;
        member_id: string;
        is_primary: boolean;
        role: string;
        role_notes: string | null;
        is_active: boolean;
        joined_at: string | null;
        left_at: string | null;
        members: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          contact_number: string | null;
          profile_picture_url: string | null;
          encrypted_fields: string[] | null;
        };
      }>;
    };

    // Map family_members to the expected structure and decrypt member data
    if (family.family_members) {
      const decryptedMembers = await Promise.all(
        family.family_members
          .filter((fm) => fm.is_active)
          .map(async (fm) => {
            // Decrypt member PII fields if they are encrypted
            let memberData = fm.members;
            if (memberData && memberData.encrypted_fields && memberData.encrypted_fields.length > 0) {
              try {
                const decrypted = await this.encryptionService.decryptFields(
                  memberData as Record<string, unknown>,
                  tenantId,
                  this.getMemberPIIFields()
                );
                memberData = decrypted as typeof memberData;
              } catch (decryptError) {
                console.error('[FamilyAdapter] Failed to decrypt member data:', decryptError);
                // Continue with encrypted data if decryption fails
              }
            }

            return {
              id: fm.id,
              tenant_id: tenantId,
              family_id: familyId,
              member_id: fm.member_id,
              is_primary: fm.is_primary,
              role: fm.role as 'head' | 'spouse' | 'child' | 'dependent' | 'other',
              role_notes: fm.role_notes,
              is_active: fm.is_active,
              joined_at: fm.joined_at,
              left_at: fm.left_at,
              member: memberData,
            };
          })
      );

      family.members = decryptedMembers;
      family.member_count = family.members.length;
      family.head = family.members.find((m) => m.role === 'head') || null;
      delete (family as unknown as Record<string, unknown>).family_members;
    }

    return family;
  }
}
