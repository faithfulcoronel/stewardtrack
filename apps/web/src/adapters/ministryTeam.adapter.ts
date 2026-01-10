import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  MinistryTeam,
  MinistryTeamWithMember,
  MinistryTeamCreateInput,
  MinistryTeamUpdateInput,
} from '@/models/scheduler/ministryTeam.model';
import type { AuditService } from '@/services/AuditService';
import type { EncryptionService } from '@/lib/encryption/EncryptionService';
import { TYPES } from '@/lib/types';
import type { FieldEncryptionConfig } from '@/types/encryption';

export interface IMinistryTeamAdapter extends IBaseAdapter<MinistryTeam> {
  getByMinistry(ministryId: string, tenantId: string): Promise<MinistryTeamWithMember[]>;
  getByMember(memberId: string, tenantId: string): Promise<MinistryTeam[]>;
  getByMinistryAndMember(ministryId: string, memberId: string, tenantId: string): Promise<MinistryTeam | null>;
  createTeamMember(data: MinistryTeamCreateInput, tenantId: string): Promise<MinistryTeam>;
  updateTeamMember(id: string, data: MinistryTeamUpdateInput, tenantId: string): Promise<MinistryTeam>;
  deleteTeamMember(id: string, tenantId: string): Promise<void>;
}

@injectable()
export class MinistryTeamAdapter
  extends BaseAdapter<MinistryTeam>
  implements IMinistryTeamAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.EncryptionService) private encryptionService: EncryptionService
  ) {
    super();
  }

  /**
   * Get PII field configuration for member fields we're selecting in joins
   * These are the encrypted fields from the members table that we need to decrypt
   */
  private getMemberPIIFields(): FieldEncryptionConfig[] {
    return [
      { fieldName: 'first_name', required: true },
      { fieldName: 'last_name', required: true },
      { fieldName: 'email', required: false },
      { fieldName: 'contact_number', required: false },
    ];
  }

  /**
   * Decrypt member PII fields in a MinistryTeamWithMember record
   */
  private async decryptMemberData(
    record: MinistryTeamWithMember,
    tenantId: string
  ): Promise<MinistryTeamWithMember> {
    if (!record.member) {
      return record;
    }

    try {
      // Create a temporary object with member data for decryption
      const memberData = {
        ...record.member,
        encrypted_fields: ['first_name', 'last_name', 'email', 'contact_number'],
      };

      // Decrypt the member fields
      const decrypted = await this.encryptionService.decryptFields(
        memberData,
        tenantId,
        this.getMemberPIIFields()
      );

      // Return record with decrypted member data
      return {
        ...record,
        member: {
          id: record.member.id,
          first_name: decrypted.first_name ?? record.member.first_name,
          last_name: decrypted.last_name ?? record.member.last_name,
          email: decrypted.email ?? record.member.email,
          contact_number: decrypted.contact_number ?? record.member.contact_number,
          profile_picture_url: record.member.profile_picture_url,
        },
      };
    } catch (error) {
      console.error('[MinistryTeamAdapter] Failed to decrypt member data:', error);
      // Return original record if decryption fails
      return record;
    }
  }

  protected tableName = 'ministry_teams';

  protected defaultSelect = `
    id,
    tenant_id,
    ministry_id,
    member_id,
    role,
    position,
    status,
    joined_at,
    created_at,
    updated_at
  `;

  protected selectWithMember = `
    ${this.defaultSelect},
    member:members!member_id(
      id,
      first_name,
      last_name,
      email,
      contact_number,
      profile_picture_url
    )
  `;

  async getByMinistry(ministryId: string, tenantId: string): Promise<MinistryTeamWithMember[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.selectWithMember)
      .eq('ministry_id', ministryId)
      .eq('tenant_id', tenantId)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch ministry team: ${error.message}`);
    }

    const records = (data as unknown as MinistryTeamWithMember[]) || [];

    // Decrypt member PII fields for each record
    if (records.length > 0) {
      try {
        const decryptedRecords = await Promise.all(
          records.map((record) => this.decryptMemberData(record, tenantId))
        );
        console.log(`[MinistryTeamAdapter] Decrypted ${decryptedRecords.length} team member records`);
        return decryptedRecords;
      } catch (error) {
        console.error('[MinistryTeamAdapter] Bulk decryption failed:', error);
        // Return original records if decryption fails
        return records;
      }
    }

    return records;
  }

  async getByMember(memberId: string, tenantId: string): Promise<MinistryTeam[]> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to fetch member's ministry teams: ${error.message}`);
    }

    return (data as unknown as MinistryTeam[]) || [];
  }

  async getByMinistryAndMember(ministryId: string, memberId: string, tenantId: string): Promise<MinistryTeam | null> {
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('ministry_id', ministryId)
      .eq('member_id', memberId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch ministry team member: ${error.message}`);
    }

    return data as unknown as MinistryTeam | null;
  }

  async createTeamMember(data: MinistryTeamCreateInput, tenantId: string): Promise<MinistryTeam> {
    const supabase = await this.getSupabaseClient();

    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert({
        tenant_id: tenantId,
        ministry_id: data.ministry_id,
        member_id: data.member_id,
        role: data.role ?? 'member',
        position: data.position ?? null,
        status: data.status ?? 'active',
        joined_at: new Date().toISOString(),
      })
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to add team member: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to add team member: missing response payload');
    }

    const teamMember = result as unknown as MinistryTeam;
    await this.auditService.logAuditEvent('create', 'ministry_teams', teamMember.id, teamMember);

    return teamMember;
  }

  async updateTeamMember(id: string, data: MinistryTeamUpdateInput, tenantId: string): Promise<MinistryTeam> {
    const supabase = await this.getSupabaseClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (data.role !== undefined) updateData.role = data.role;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.status !== undefined) updateData.status = data.status;

    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(this.defaultSelect)
      .single();

    if (error) {
      throw new Error(`Failed to update team member: ${error.message}`);
    }

    if (!result) {
      throw new Error('Failed to update team member: not found');
    }

    const teamMember = result as unknown as MinistryTeam;
    await this.auditService.logAuditEvent('update', 'ministry_teams', id, teamMember);

    return teamMember;
  }

  async deleteTeamMember(id: string, tenantId: string): Promise<void> {
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to remove team member: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'ministry_teams', id, { id });
  }
}
