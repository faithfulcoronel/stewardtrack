import 'server-only';
import 'reflect-metadata';
import { injectable, inject } from 'inversify';
import { BaseAdapter, type IBaseAdapter } from '@/adapters/base.adapter';
import {
  Notebook,
  NotebookSection,
  NotebookPage,
  NotebookShare,
  NotebookAttachment,
  NotebookActivity,
  NotebookCreateInput,
  NotebookUpdateInput,
  NotebookSectionCreateInput,
  NotebookSectionUpdateInput,
  NotebookPageCreateInput,
  NotebookPageUpdateInput,
  NotebookShareCreateInput,
  NotebookShareUpdateInput,
  NotebookFilters,
  NotebookPageFilters,
  NotebookStats
} from '@/models/notebook.model';
import type { AuditService } from '@/services/AuditService';
import type { TenantService } from '@/services/TenantService';
import { TYPES } from '@/lib/types';
import { TenantContextError } from '@/utils/errorHandler';

// =====================================================
// Notebook Adapter Interface
// =====================================================

export interface INotebookAdapter extends IBaseAdapter<Notebook> {
  // Notebook operations
  getAllNotebooks(filters?: NotebookFilters): Promise<Notebook[]>;
  getNotebookById(notebookId: string): Promise<Notebook | null>;
  getNotebookWithSections(notebookId: string): Promise<Notebook | null>;
  createNotebook(input: NotebookCreateInput): Promise<Notebook>;
  updateNotebook(notebookId: string, input: NotebookUpdateInput): Promise<Notebook>;
  deleteNotebook(notebookId: string): Promise<void>;

  // Section operations
  getSectionsByNotebook(notebookId: string): Promise<NotebookSection[]>;
  getSectionById(sectionId: string): Promise<NotebookSection | null>;
  createSection(input: NotebookSectionCreateInput): Promise<NotebookSection>;
  updateSection(sectionId: string, input: NotebookSectionUpdateInput): Promise<NotebookSection>;
  deleteSection(sectionId: string): Promise<void>;

  // Page operations
  getPagesBySection(sectionId: string): Promise<NotebookPage[]>;
  getPagesByNotebook(notebookId: string, filters?: NotebookPageFilters): Promise<NotebookPage[]>;
  getPageById(pageId: string): Promise<NotebookPage | null>;
  getPageWithAttachments(pageId: string): Promise<NotebookPage | null>;
  createPage(input: NotebookPageCreateInput): Promise<NotebookPage>;
  updatePage(pageId: string, input: NotebookPageUpdateInput): Promise<NotebookPage>;
  deletePage(pageId: string): Promise<void>;
  searchPages(query: string, notebookId?: string): Promise<NotebookPage[]>;

  // Share operations
  getSharesByNotebook(notebookId: string): Promise<NotebookShare[]>;
  createShare(input: NotebookShareCreateInput): Promise<NotebookShare>;
  updateShare(shareId: string, input: NotebookShareUpdateInput): Promise<NotebookShare>;
  deleteShare(shareId: string): Promise<void>;

  // Attachment operations
  getAttachmentsByPage(pageId: string): Promise<NotebookAttachment[]>;

  // Activity operations
  getActivityByNotebook(notebookId: string, limit?: number): Promise<NotebookActivity[]>;

  // Statistics
  getNotebookStats(): Promise<NotebookStats>;
}

// =====================================================
// Notebook Adapter Implementation
// =====================================================

@injectable()
export class NotebookAdapter
  extends BaseAdapter<Notebook>
  implements INotebookAdapter
{
  constructor(
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.TenantService) private tenantService: TenantService
  ) {
    super();
  }

  /**
   * Get current tenant ID or throw if not available
   */
  private async getTenantId(): Promise<string> {
    const tenant = await this.tenantService.getCurrentTenant();
    if (!tenant) {
      throw new TenantContextError('No tenant context available');
    }
    return tenant.id;
  }

  /**
   * Get current user ID or throw if not available
   */
  private async getCurrentUserId(): Promise<string> {
    const userId = await this.getCurrentUserId();
    if (!userId) {
      throw new Error('No authenticated user');
    }
    return userId;
  }

  protected tableName = 'notebooks';

  protected defaultSelect = `
    id,
    tenant_id,
    title,
    description,
    color,
    icon,
    visibility,
    owner_id,
    status,
    is_pinned,
    sort_order,
    tags,
    metadata,
    created_at,
    updated_at,
    created_by,
    updated_by,
    deleted_at
  `;

  // =====================================================
  // Notebook Operations
  // =====================================================

  /**
   * Get all notebooks for current tenant with optional filters
   */
  async getAllNotebooks(filters?: NotebookFilters): Promise<Notebook[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    // Apply filters
    if (filters?.visibility) {
      query = query.in('visibility', filters.visibility);
    }
    if (filters?.status) {
      query = query.in('status', filters.status);
    }
    if (filters?.owner_id) {
      query = query.eq('owner_id', filters.owner_id);
    }
    if (filters?.is_pinned !== undefined) {
      query = query.eq('is_pinned', filters.is_pinned);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    query = query.order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch notebooks: ${error.message}`);
    }

    return (data || []) as unknown as Notebook[];
  }

  /**
   * Get a notebook by ID
   */
  async getNotebookById(notebookId: string): Promise<Notebook | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(this.defaultSelect)
      .eq('id', notebookId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch notebook: ${error.message}`);
    }

    return data as unknown as Notebook | null;
  }

  /**
   * Get a notebook with its sections
   */
  async getNotebookWithSections(notebookId: string): Promise<Notebook | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from(this.tableName)
      .select(`
        ${this.defaultSelect},
        sections:notebook_sections(
          id,
          title,
          description,
          color,
          icon,
          sort_order,
          is_collapsed,
          created_at,
          updated_at
        )
      `)
      .eq('id', notebookId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch notebook with sections: ${error.message}`);
    }

    return data as unknown as Notebook | null;
  }

  /**
   * Create a new notebook
   */
  async createNotebook(input: NotebookCreateInput): Promise<Notebook> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const notebookData = {
      ...input,
      tenant_id: tenantId,
      owner_id: userId,
      created_by: userId,
      updated_by: userId
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(notebookData)
      .select(this.defaultSelect)
      .single();

    if (error || !data) {
      throw new Error(`Failed to create notebook: ${error?.message || 'No data returned'}`);
    }

    await this.auditService.logAuditEvent('create', 'notebooks', data.id, data);

    return data as unknown as Notebook;
  }

  /**
   * Update a notebook
   */
  async updateNotebook(notebookId: string, input: NotebookUpdateInput): Promise<Notebook> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const updateData = {
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', notebookId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select(this.defaultSelect)
      .single();

    if (error || !data) {
      throw new Error(`Failed to update notebook: ${error?.message || 'No data returned'}`);
    }

    await this.auditService.logAuditEvent('update', 'notebooks', notebookId, data);

    return data as unknown as Notebook;
  }

  /**
   * Soft delete a notebook
   */
  async deleteNotebook(notebookId: string): Promise<void> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from(this.tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', notebookId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete notebook: ${error.message}`);
    }

    await this.auditService.logAuditEvent('delete', 'notebooks', notebookId, { id: notebookId });
  }

  // =====================================================
  // Section Operations
  // =====================================================

  /**
   * Get sections by notebook ID
   */
  async getSectionsByNotebook(notebookId: string): Promise<NotebookSection[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_sections')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch sections: ${error.message}`);
    }

    return (data || []) as unknown as NotebookSection[];
  }

  /**
   * Get section by ID
   */
  async getSectionById(sectionId: string): Promise<NotebookSection | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_sections')
      .select('*')
      .eq('id', sectionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch section: ${error.message}`);
    }

    return data as unknown as NotebookSection | null;
  }

  /**
   * Create a new section
   */
  async createSection(input: NotebookSectionCreateInput): Promise<NotebookSection> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const sectionData = {
      ...input,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId
    };

    const { data, error } = await supabase
      .from('notebook_sections')
      .insert(sectionData)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create section: ${error?.message || 'No data returned'}`);
    }

    return data as unknown as NotebookSection;
  }

  /**
   * Update a section
   */
  async updateSection(sectionId: string, input: NotebookSectionUpdateInput): Promise<NotebookSection> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const updateData = {
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notebook_sections')
      .update(updateData)
      .eq('id', sectionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update section: ${error?.message || 'No data returned'}`);
    }

    return data as unknown as NotebookSection;
  }

  /**
   * Soft delete a section
   */
  async deleteSection(sectionId: string): Promise<void> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('notebook_sections')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', sectionId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete section: ${error.message}`);
    }
  }

  // =====================================================
  // Page Operations
  // =====================================================

  /**
   * Get pages by section ID
   */
  async getPagesBySection(sectionId: string): Promise<NotebookPage[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_pages')
      .select('*')
      .eq('section_id', sectionId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch pages: ${error.message}`);
    }

    return (data || []) as unknown as NotebookPage[];
  }

  /**
   * Get pages by notebook ID with optional filters
   */
  async getPagesByNotebook(notebookId: string, filters?: NotebookPageFilters): Promise<NotebookPage[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    let query = supabase
      .from('notebook_pages')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    // Apply filters
    if (filters?.section_id) {
      query = query.eq('section_id', filters.section_id);
    }
    if (filters?.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }
    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }
    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }
    if (filters?.created_after) {
      query = query.gte('created_at', filters.created_after);
    }
    if (filters?.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    query = query.order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch pages: ${error.message}`);
    }

    return (data || []) as unknown as NotebookPage[];
  }

  /**
   * Get page by ID
   */
  async getPageById(pageId: string): Promise<NotebookPage | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_pages')
      .select('*')
      .eq('id', pageId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch page: ${error.message}`);
    }

    return data as unknown as NotebookPage | null;
  }

  /**
   * Get page with attachments
   */
  async getPageWithAttachments(pageId: string): Promise<NotebookPage | null> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_pages')
      .select(`
        *,
        attachments:notebook_attachments(*)
      `)
      .eq('id', pageId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch page with attachments: ${error.message}`);
    }

    return data as unknown as NotebookPage | null;
  }

  /**
   * Create a new page
   */
  async createPage(input: NotebookPageCreateInput): Promise<NotebookPage> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const pageData = {
      ...input,
      tenant_id: tenantId,
      created_by: userId,
      updated_by: userId
    };

    const { data, error } = await supabase
      .from('notebook_pages')
      .insert(pageData)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create page: ${error?.message || 'No data returned'}`);
    }

    return data as unknown as NotebookPage;
  }

  /**
   * Update a page
   */
  async updatePage(pageId: string, input: NotebookPageUpdateInput): Promise<NotebookPage> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const updateData = {
      ...input,
      updated_by: userId,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('notebook_pages')
      .update(updateData)
      .eq('id', pageId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update page: ${error?.message || 'No data returned'}`);
    }

    return data as unknown as NotebookPage;
  }

  /**
   * Soft delete a page
   */
  async deletePage(pageId: string): Promise<void> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('notebook_pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', pageId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete page: ${error.message}`);
    }
  }

  /**
   * Search pages by content or title
   */
  async searchPages(query: string, notebookId?: string): Promise<NotebookPage[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    let dbQuery = supabase
      .from('notebook_pages')
      .select('*')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`);

    if (notebookId) {
      dbQuery = dbQuery.eq('notebook_id', notebookId);
    }

    dbQuery = dbQuery.order('updated_at', { ascending: false }).limit(50);

    const { data, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to search pages: ${error.message}`);
    }

    return (data || []) as unknown as NotebookPage[];
  }

  // =====================================================
  // Share Operations
  // =====================================================

  /**
   * Get shares by notebook ID
   */
  async getSharesByNotebook(notebookId: string): Promise<NotebookShare[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_shares')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch shares: ${error.message}`);
    }

    return (data || []) as unknown as NotebookShare[];
  }

  /**
   * Create a new share
   */
  async createShare(input: NotebookShareCreateInput): Promise<NotebookShare> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    const shareData = {
      ...input,
      tenant_id: tenantId,
      shared_by: userId
    };

    const { data, error } = await supabase
      .from('notebook_shares')
      .insert(shareData)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create share: ${error?.message || 'No data returned'}`);
    }

    return data as unknown as NotebookShare;
  }

  /**
   * Update a share
   */
  async updateShare(shareId: string, input: NotebookShareUpdateInput): Promise<NotebookShare> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_shares')
      .update(input)
      .eq('id', shareId)
      .eq('tenant_id', tenantId)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update share: ${error?.message || 'No data returned'}`);
    }

    return data as unknown as NotebookShare;
  }

  /**
   * Delete a share
   */
  async deleteShare(shareId: string): Promise<void> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { error } = await supabase
      .from('notebook_shares')
      .delete()
      .eq('id', shareId)
      .eq('tenant_id', tenantId);

    if (error) {
      throw new Error(`Failed to delete share: ${error.message}`);
    }
  }

  // =====================================================
  // Attachment Operations
  // =====================================================

  /**
   * Get attachments by page ID
   */
  async getAttachmentsByPage(pageId: string): Promise<NotebookAttachment[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_attachments')
      .select('*')
      .eq('page_id', pageId)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch attachments: ${error.message}`);
    }

    return (data || []) as unknown as NotebookAttachment[];
  }

  // =====================================================
  // Activity Operations
  // =====================================================

  /**
   * Get activity log by notebook ID
   */
  async getActivityByNotebook(notebookId: string, limit: number = 50): Promise<NotebookActivity[]> {
    const tenantId = await this.getTenantId();
    const supabase = await this.getSupabaseClient();

    const { data, error } = await supabase
      .from('notebook_activity_log')
      .select('*')
      .eq('notebook_id', notebookId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch activity: ${error.message}`);
    }

    return (data || []) as unknown as NotebookActivity[];
  }

  // =====================================================
  // Statistics
  // =====================================================

  /**
   * Get notebook statistics for current tenant
   */
  async getNotebookStats(): Promise<NotebookStats> {
    const tenantId = await this.getTenantId();
    const userId = await this.getCurrentUserId();
    const supabase = await this.getSupabaseClient();

    // Get notebook counts
    const { data: notebookData } = await supabase
      .from('notebooks')
      .select('id, owner_id, visibility')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const totalNotebooks = notebookData?.length || 0;
    const myNotebooks = notebookData?.filter(n => n.owner_id === userId).length || 0;

    // Shared notebooks would need to check shares table, simplified here
    const sharedWithMe = notebookData?.filter(n => n.owner_id !== userId).length || 0;

    // Get page counts
    const { data: pageData } = await supabase
      .from('notebook_pages')
      .select('id, created_at, is_favorite')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    const totalPages = pageData?.length || 0;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const pagesThisWeek = pageData?.filter(p => new Date(p.created_at) >= weekAgo).length || 0;
    const pagesThisMonth = pageData?.filter(p => new Date(p.created_at) >= monthAgo).length || 0;
    const favoritePages = pageData?.filter(p => p.is_favorite).length || 0;

    // Get recent activity count
    const { count: activityCount } = await supabase
      .from('notebook_activity_log')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', weekAgo.toISOString());

    return {
      total_notebooks: totalNotebooks,
      my_notebooks: myNotebooks,
      shared_with_me: sharedWithMe,
      total_pages: totalPages,
      pages_this_week: pagesThisWeek,
      pages_this_month: pagesThisMonth,
      favorite_pages: favoritePages,
      recent_activity_count: activityCount || 0
    };
  }
}
