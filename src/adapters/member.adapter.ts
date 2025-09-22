import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from './base.adapter';
import { Member } from '../models/member.model';
import type { AuditService } from '../services/AuditService';
import { TYPES } from '../lib/types';
import { tenantUtils } from '../utils/tenantUtils';

export interface IMemberAdapter extends IBaseAdapter<Member> {
  getCurrentMonthBirthdays(): Promise<Member[]>;
  getBirthdaysByMonth(month: number): Promise<Member[]>;
  getCurrentUserMember(): Promise<Member | null>;
}

@injectable()
export class MemberAdapter
  extends BaseAdapter<Member>
  implements IMemberAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  private async getTenantId() {
    return this.context?.tenantId ?? (await tenantUtils.getTenantId());
  }
  protected tableName = 'members';
  
  protected defaultSelect = `
    id,
    first_name,
    last_name,
    middle_name,
    preferred_name,
    email,
    contact_number,
    address,
    membership_date,
    birthday,
    profile_picture_url,
    gender,
    marital_status,
    baptism_date,
    spiritual_gifts,
    ministry_interests,
    emergency_contact_name,
    emergency_contact_phone,
    leadership_position,
    small_groups,
    ministries,
    volunteer_roles,
    attendance_rate,
    last_attendance_date,
    pastoral_notes,
    prayer_requests,
    created_at,
    updated_at,
    membership_type_id,
    membership_status_id
  `;

  protected defaultRelationships: QueryOptions['relationships'] = [
    {
      table: 'membership_type',
      foreignKey: 'membership_type_id',
      select: ['id', 'name', 'code']
    },
    {
      table: 'membership_status',
      foreignKey: 'membership_status_id',
      select: ['id', 'name', 'code']
    }
  ];

  async getCurrentMonthBirthdays(): Promise<Member[]> {
    const { data, error } = await this.supabase.rpc('get_current_month_birthdays');
    if (error) throw error;
    return (data || []) as Member[];
  }

  async getBirthdaysByMonth(month: number): Promise<Member[]> {
    const { data, error } = await this.supabase.rpc('get_birthdays_for_month', {
      p_month: month,
    });
    if (error) throw error;
    return (data || []) as Member[];
  }

  async getCurrentUserMember(): Promise<Member | null> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();
    if (!user) return null;

    const tenantId = await this.getTenantId();
    if (!tenantId) return null;

    const { data: tenantUser } = await this.supabase
      .from('tenant_users')
      .select('member_id')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single();

    if (!tenantUser?.member_id) return null;

    const { data: member } = await this.supabase
      .from('members')
      .select('*')
      .eq('id', tenantUser.member_id)
      .is('deleted_at', null)
      .single();

    return (member as Member) || null;
  }

  protected override async onBeforeDelete(id: string): Promise<void> {
    // Check for family relationships
    const { data: familyRelationships, error: relationshipsError } = await this.supabase
      .from('family_relationships')
      .select('id')
      .or(`member_id.eq.${id},related_member_id.eq.${id}`)
      .limit(1);

    if (relationshipsError) throw relationshipsError;
    if (familyRelationships?.length) {
      throw new Error('Cannot delete member with existing family relationships');
    }

    // Check for financial transactions
    const { data: transactions, error: transactionsError } = await this.supabase
      .from('financial_transactions')
      .select('id')
      .eq('member_id', id)
      .limit(1);

    if (transactionsError) throw transactionsError;
    if (transactions?.length) {
      throw new Error('Cannot delete member with existing financial transactions');
    }
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('delete', 'member', id, { id });
  }

  protected override async onBeforeCreate(data: Partial<Member>): Promise<Partial<Member>> {
    // Repositories handle validation

    // Check for duplicate email if provided
    if (data.email) {
      const { data: existingMember } = await this.fetch({
        filters: {
          email: {
            operator: 'eq',
            value: data.email
          }
        }
      });

      if (existingMember?.length) {
        throw new Error('A member with this email already exists');
      }
    }

    return data;
  }

  protected override async onAfterCreate(data: Member): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('create', 'member', data.id, data);
  }

  protected override async onBeforeUpdate(id: string, data: Partial<Member>): Promise<Partial<Member>> {
    // Validate email if being updated
    if (data.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error('Invalid email format');
      }

      // Check for duplicate email
      const { data: existingMember } = await this.fetch({
        filters: {
          email: {
            operator: 'eq',
            value: data.email
          },
          id: {
            operator: 'neq',
            value: id
          }
        }
      });

      if (existingMember?.length) {
        throw new Error('A member with this email already exists');
      }
    }

    return data;
  }

  protected override async onAfterUpdate(data: Member): Promise<void> {
    // Log audit event
    await this.auditService.logAuditEvent('update', 'member', data.id, data);
  }
}