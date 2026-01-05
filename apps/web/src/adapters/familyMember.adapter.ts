import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { FamilyMember, FamilyRole } from '@/models/familyMember.model';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { getFieldEncryptionConfig } from '@/utils/encryptionUtils';
import { TYPES } from '@/lib/types';

export interface IFamilyMemberAdapter extends IBaseAdapter<FamilyMember> {
  findByFamily(familyId: string, tenantId: string): Promise<FamilyMember[]>;
  findByMember(memberId: string, tenantId: string): Promise<FamilyMember[]>;
  findPrimaryFamily(memberId: string, tenantId: string): Promise<FamilyMember | null>;
  findByFamilyAndMember(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<FamilyMember | null>;
  addMemberToFamily(
    familyId: string,
    memberId: string,
    tenantId: string,
    options: {
      isPrimary?: boolean;
      role?: FamilyRole;
      roleNotes?: string;
      createdBy?: string;
    }
  ): Promise<FamilyMember>;
  removeMemberFromFamily(familyId: string, memberId: string, tenantId: string): Promise<void>;
  updateMemberRole(
    familyId: string,
    memberId: string,
    tenantId: string,
    role: FamilyRole,
    roleNotes?: string
  ): Promise<FamilyMember>;
  setPrimaryFamily(memberId: string, familyId: string, tenantId: string): Promise<void>;
}

@injectable()
export class FamilyMemberAdapter
  extends BaseAdapter<FamilyMember>
  implements IFamilyMemberAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  /**
   * Get PII field configuration for members table (for nested member data)
   */
  private getMemberPIIFields() {
    return getFieldEncryptionConfig('members');
  }

  protected tableName = 'family_members';

  protected defaultSelect = `
    id,
    tenant_id,
    family_id,
    member_id,
    is_primary,
    role,
    role_notes,
    is_active,
    joined_at,
    left_at,
    created_by,
    updated_by,
    created_at,
    updated_at
  `;

  protected selectWithRelations = `
    id,
    tenant_id,
    family_id,
    member_id,
    is_primary,
    role,
    role_notes,
    is_active,
    joined_at,
    left_at,
    created_by,
    updated_by,
    created_at,
    updated_at,
    families:family_id (
      id,
      name,
      formal_name,
      address_street,
      address_street2,
      address_city,
      address_state,
      address_postal_code,
      address_country,
      family_photo_url
    ),
    members:member_id (
      id,
      first_name,
      last_name,
      email,
      contact_number,
      profile_picture_url,
      encrypted_fields
    )
  `;

  protected override async onAfterCreate(data: FamilyMember): Promise<void> {
    await this.auditService.logAuditEvent('create', 'family_member', data.id!, data);
  }

  protected override async onAfterUpdate(data: FamilyMember): Promise<void> {
    await this.auditService.logAuditEvent('update', 'family_member', data.id!, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'family_member', id, { id });
  }

  /**
   * Find all members of a family
   */
  async findByFamily(familyId: string, tenantId: string): Promise<FamilyMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithRelations)
      .eq('family_id', familyId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('role', { ascending: true });

    if (error) {
      throw new Error(`Failed to find family members: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return this.transformResults(data, tenantId);
  }

  /**
   * Find all families a member belongs to
   */
  async findByMember(memberId: string, tenantId: string): Promise<FamilyMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithRelations)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('is_primary', { ascending: false });

    if (error) {
      throw new Error(`Failed to find member families: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    return this.transformResults(data, tenantId);
  }

  /**
   * Find a member's primary family
   */
  async findPrimaryFamily(memberId: string, tenantId: string): Promise<FamilyMember | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithRelations)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('is_primary', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find primary family: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const results = await this.transformResults([data], tenantId);
    return results[0] || null;
  }

  /**
   * Find a specific family-member relationship
   */
  async findByFamilyAndMember(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<FamilyMember | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithRelations)
      .eq('family_id', familyId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find family member: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    const results = await this.transformResults([data], tenantId);
    return results[0] || null;
  }

  /**
   * Add a member to a family
   */
  async addMemberToFamily(
    familyId: string,
    memberId: string,
    tenantId: string,
    options: {
      isPrimary?: boolean;
      role?: FamilyRole;
      roleNotes?: string;
      createdBy?: string;
    } = {}
  ): Promise<FamilyMember> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .insert({
        family_id: familyId,
        member_id: memberId,
        tenant_id: tenantId,
        is_primary: options.isPrimary ?? false,
        role: options.role ?? 'other',
        role_notes: options.roleNotes,
        is_active: true,
        joined_at: new Date().toISOString().split('T')[0],
        created_by: options.createdBy,
        updated_by: options.createdBy,
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Member is already in this family');
      }
      throw new Error(`Failed to add member to family: ${error.message}`);
    }

    await this.onAfterCreate(data as unknown as FamilyMember);

    return data as unknown as FamilyMember;
  }

  /**
   * Remove a member from a family (soft delete by setting is_active = false)
   */
  async removeMemberFromFamily(
    familyId: string,
    memberId: string,
    tenantId: string
  ): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        is_active: false,
        left_at: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      })
      .eq('family_id', familyId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to remove member from family: ${error.message}`);
    }
  }

  /**
   * Update a member's role in a family
   */
  async updateMemberRole(
    familyId: string,
    memberId: string,
    tenantId: string,
    role: FamilyRole,
    roleNotes?: string
  ): Promise<FamilyMember> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      role,
      updated_at: new Date().toISOString(),
    };

    if (roleNotes !== undefined) {
      updateData.role_notes = roleNotes;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('family_id', familyId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update member role: ${error.message}`);
    }

    await this.onAfterUpdate(data as unknown as FamilyMember);

    return data as unknown as FamilyMember;
  }

  /**
   * Set a member's primary family
   * Note: The database trigger will auto-demote any existing primary family
   */
  async setPrimaryFamily(memberId: string, familyId: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({
        is_primary: true,
        updated_at: new Date().toISOString(),
      })
      .eq('family_id', familyId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to set primary family: ${error.message}`);
    }
  }

  /**
   * Transform database results to include nested relations properly
   * Also decrypts member PII fields (first_name, last_name, email, contact_number)
   */
  private async transformResults(
    data: unknown[],
    tenantId: string
  ): Promise<FamilyMember[]> {
    const results: FamilyMember[] = [];

    for (const item of data) {
      const row = item as Record<string, unknown>;
      const familyMember: FamilyMember = {
        id: row.id as string,
        tenant_id: row.tenant_id as string,
        family_id: row.family_id as string,
        member_id: row.member_id as string,
        is_primary: row.is_primary as boolean,
        role: row.role as FamilyRole,
        role_notes: row.role_notes as string | null,
        is_active: row.is_active as boolean,
        joined_at: row.joined_at as string | null,
        left_at: row.left_at as string | null,
        created_by: row.created_by as string | undefined,
        updated_by: row.updated_by as string | undefined,
        created_at: row.created_at as string | undefined,
        updated_at: row.updated_at as string | undefined,
      };

      // Add family data if present
      if (row.families && typeof row.families === 'object') {
        const family = row.families as Record<string, unknown>;
        familyMember.family = {
          id: family.id as string,
          tenant_id: row.tenant_id as string,
          name: family.name as string,
          formal_name: family.formal_name as string | null,
          address_street: family.address_street as string | null,
          address_street2: family.address_street2 as string | null,
          address_city: family.address_city as string | null,
          address_state: family.address_state as string | null,
          address_postal_code: family.address_postal_code as string | null,
          address_country: family.address_country as string | null,
          family_photo_url: family.family_photo_url as string | null,
        };
      }

      // Add member data if present and decrypt PII fields
      if (row.members && typeof row.members === 'object') {
        const member = row.members as Record<string, unknown>;
        const encryptedFields = member.encrypted_fields as string[] | undefined;

        // Build member data object
        let memberData = {
          id: member.id as string,
          first_name: member.first_name as string,
          last_name: member.last_name as string,
          email: member.email as string | null,
          contact_number: member.contact_number as string | null,
          profile_picture_url: member.profile_picture_url as string | null,
        };

        // Decrypt member PII fields if they are encrypted
        if (encryptedFields && encryptedFields.length > 0) {
          try {
            const decrypted = await this.encryptionService.decryptFields(
              memberData as Record<string, unknown>,
              tenantId,
              this.getMemberPIIFields()
            );
            memberData = {
              ...memberData,
              first_name: (decrypted as Record<string, unknown>).first_name as string ?? memberData.first_name,
              last_name: (decrypted as Record<string, unknown>).last_name as string ?? memberData.last_name,
              email: (decrypted as Record<string, unknown>).email as string | null ?? memberData.email,
              contact_number: (decrypted as Record<string, unknown>).contact_number as string | null ?? memberData.contact_number,
            };
          } catch (error) {
            console.error('Failed to decrypt member fields:', error);
            // Keep encrypted values if decryption fails
          }
        }

        familyMember.member = memberData;
      }

      results.push(familyMember);
    }

    return results;
  }
}
