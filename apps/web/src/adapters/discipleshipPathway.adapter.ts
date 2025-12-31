/**
 * ================================================================================
 * DISCIPLESHIP PATHWAY ADAPTER
 * ================================================================================
 *
 * Handles database operations for discipleship pathways.
 * Extends BaseAdapter for common CRUD operations.
 *
 * TENANT CONTEXT PATTERN:
 * Uses inherited `ensureTenantContext()` from BaseAdapter for multi-tenant isolation.
 * This method provides fallback to TenantService if context is not explicitly set.
 *
 * For metadata services creating this adapter outside DI, use applyRequestContext():
 *   const adapter = new DiscipleshipPathwayAdapter(auditService);
 *   (adapter as any).context = { tenantId: resolvedTenantId };
 *
 * ================================================================================
 */

import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import { DiscipleshipPathway } from '@/models/discipleshipPathway.model';
import type { AuditService } from '@/services/AuditService';
import { TYPES } from '@/lib/types';

export interface IDiscipleshipPathwayAdapter extends IBaseAdapter<DiscipleshipPathway> {
  getAll(): Promise<DiscipleshipPathway[]>;
  getById(pathwayId: string): Promise<DiscipleshipPathway | null>;
  getByCode(code: string): Promise<DiscipleshipPathway | null>;
  getActive(): Promise<DiscipleshipPathway[]>;
}

@injectable()
export class DiscipleshipPathwayAdapter
  extends BaseAdapter<DiscipleshipPathway>
  implements IDiscipleshipPathwayAdapter
{
  constructor(@inject(TYPES.AuditService) private auditService: AuditService) {
    super();
  }

  protected tableName = 'discipleship_pathways';

  protected defaultSelect = `
    id,
    tenant_id,
    name,
    code,
    description,
    display_order,
    is_active,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  protected override async onAfterCreate(data: DiscipleshipPathway): Promise<void> {
    await this.auditService.logAuditEvent('create', 'discipleship_pathways', data.id, data);
  }

  protected override async onAfterUpdate(data: DiscipleshipPathway): Promise<void> {
    await this.auditService.logAuditEvent('update', 'discipleship_pathways', data.id, data);
  }

  protected override async onAfterDelete(id: string): Promise<void> {
    await this.auditService.logAuditEvent('delete', 'discipleship_pathways', id, { id });
  }

  async getAll(): Promise<DiscipleshipPathway[]> {
    const tenantId = await this.ensureTenantContext();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find discipleship pathways: ${error.message}`);
    }

    return (data || []) as unknown as DiscipleshipPathway[];
  }

  async getById(pathwayId: string): Promise<DiscipleshipPathway | null> {
    const tenantId = await this.ensureTenantContext();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', pathwayId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find discipleship pathway by ID: ${error.message}`);
    }

    return data as DiscipleshipPathway | null;
  }

  async getByCode(code: string): Promise<DiscipleshipPathway | null> {
    const tenantId = await this.ensureTenantContext();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('code', code)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find discipleship pathway by code: ${error.message}`);
    }

    return data as DiscipleshipPathway | null;
  }

  async getActive(): Promise<DiscipleshipPathway[]> {
    const tenantId = await this.ensureTenantContext();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to find active discipleship pathways: ${error.message}`);
    }

    return (data || []) as unknown as DiscipleshipPathway[];
  }
}
