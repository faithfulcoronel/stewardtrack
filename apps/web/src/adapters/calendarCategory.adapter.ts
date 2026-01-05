import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter, QueryOptions } from '@/adapters/base.adapter';
import { CalendarCategory } from '@/models/calendarCategory.model';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import { TYPES } from '@/lib/types';
import { TenantContextError } from '@/utils/errorHandler';

export interface ICalendarCategoryAdapter extends IBaseAdapter<CalendarCategory> {
  getAll(): Promise<CalendarCategory[]>;
  getById(categoryId: string): Promise<CalendarCategory | null>;
  getByCode(code: string): Promise<CalendarCategory | null>;
  getActiveCategories(): Promise<CalendarCategory[]>;
  seedDefaultCategories(): Promise<void>;
}

@injectable()
export class CalendarCategoryAdapter
  extends BaseAdapter<CalendarCategory>
  implements ICalendarCategoryAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.TenantService) private tenantService: TenantService
  ) {
    super();
  }

  private async getTenantId(): Promise<string> {
    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      throw new TenantContextError('No tenant context available');
    }
    return tenant.id;
  }

  protected tableName = 'calendar_categories';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    code,
    description,
    color,
    icon,
    sort_order,
    is_system,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  protected override async onBeforeCreate(
    data: Partial<CalendarCategory>
  ): Promise<Partial<CalendarCategory>> {
    if (data.is_active === undefined) data.is_active = true;
    if (data.is_system === undefined) data.is_system = false;
    if (data.sort_order === undefined) data.sort_order = 0;
    if (!data.color) data.color = '#3B82F6';
    return data;
  }

  protected override async onAfterCreate(data: CalendarCategory): Promise<void> {
    await this.auditService.logAuditEvent('create', 'calendar_categories', data.id, data);
  }

  protected override async onAfterUpdate(data: CalendarCategory): Promise<void> {
    await this.auditService.logAuditEvent('update', 'calendar_categories', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'calendar_categories', id, { id });
  }

  async getAll(): Promise<CalendarCategory[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find calendar categories: ${error.message}`);
    }

    return (data as unknown as CalendarCategory[]) || [];
  }

  async getById(categoryId: string): Promise<CalendarCategory | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', categoryId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find calendar category by ID: ${error.message}`);
    }

    return data as CalendarCategory | null;
  }

  async getByCode(code: string): Promise<CalendarCategory | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('code', code)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find calendar category by code: ${error.message}`);
    }

    return data as CalendarCategory | null;
  }

  async getActiveCategories(): Promise<CalendarCategory[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find active calendar categories: ${error.message}`);
    }

    return (data as unknown as CalendarCategory[]) || [];
  }

  async seedDefaultCategories(): Promise<void> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const defaultCategories = [
      { code: 'care_plan', name: 'Care Plans', color: '#EF4444', icon: 'heart', sort_order: 1, is_system: true },
      { code: 'discipleship', name: 'Discipleship', color: '#8B5CF6', icon: 'book-open', sort_order: 2, is_system: true },
      { code: 'birthday', name: 'Birthdays', color: '#EC4899', icon: 'cake', sort_order: 3, is_system: true },
      { code: 'anniversary', name: 'Anniversaries', color: '#F97316', icon: 'gift', sort_order: 4, is_system: true },
      { code: 'meeting', name: 'Meetings', color: '#3B82F6', icon: 'users', sort_order: 5, is_system: true },
      { code: 'service', name: 'Services', color: '#10B981', icon: 'church', sort_order: 6, is_system: true },
      { code: 'event', name: 'Events', color: '#F59E0B', icon: 'calendar', sort_order: 7, is_system: true },
      { code: 'reminder', name: 'Reminders', color: '#6B7280', icon: 'bell', sort_order: 8, is_system: true },
      { code: 'general', name: 'General', color: '#64748B', icon: 'circle', sort_order: 99, is_system: true },
    ];

    for (const category of defaultCategories) {
      const existing = await this.getByCode(category.code);
      if (!existing) {
        await supabase.from(this.tableName).insert({
          ...category,
          tenant_id: tenantId,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
}
