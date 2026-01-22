import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { INotebookRepository } from '@/repositories/notebook.repository';
import type {
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
  NotebookStats,
  NotebookDashboardData,
  NotebookListView,
  NotebookDetailView
} from '@/models/notebook.model';

/**
 * Notebook Service
 * Business logic layer for OneNote-style notebook management
 */
@injectable()
export class NotebookService {
  constructor(
    @inject(TYPES.INotebookRepository)
    private notebookRepo: INotebookRepository
  ) {}

  // ==================== NOTEBOOK OPERATIONS ====================

  /**
   * Get all notebooks for current tenant with optional filters
   */
  async getNotebooks(filters?: NotebookFilters): Promise<Notebook[]> {
    return this.notebookRepo.getAllNotebooks(filters);
  }

  /**
   * Get notebooks owned by current user
   */
  async getMyNotebooks(): Promise<Notebook[]> {
    // Note: owner_id filtering will be handled by RLS/repository
    return this.notebookRepo.getAllNotebooks({
      status: ['active']
    });
  }

  /**
   * Get shared notebooks (not owned by current user)
   */
  async getSharedNotebooks(): Promise<Notebook[]> {
    return this.notebookRepo.getAllNotebooks({
      visibility: ['shared', 'tenant'],
      status: ['active']
    });
  }

  /**
   * Get pinned notebooks
   */
  async getPinnedNotebooks(): Promise<Notebook[]> {
    return this.notebookRepo.getAllNotebooks({
      is_pinned: true,
      status: ['active']
    });
  }

  /**
   * Get a notebook by ID
   */
  async getNotebookById(notebookId: string): Promise<Notebook | null> {
    return this.notebookRepo.getNotebookById(notebookId);
  }

  /**
   * Get a notebook with all its sections
   */
  async getNotebookWithSections(notebookId: string): Promise<Notebook | null> {
    return this.notebookRepo.getNotebookWithSections(notebookId);
  }

  /**
   * Get notebook detail view with sections, recent pages, and activity
   */
  async getNotebookDetail(notebookId: string): Promise<NotebookDetailView | null> {
    const [notebook, sections, recentPages, activity] = await Promise.all([
      this.notebookRepo.getNotebookById(notebookId),
      this.notebookRepo.getSectionsByNotebook(notebookId),
      this.notebookRepo.getPagesByNotebook(notebookId, { /* recent pages */ }),
      this.notebookRepo.getActivityByNotebook(notebookId, 20)
    ]);

    if (!notebook) {
      return null;
    }

    // Get pages for each section
    const sectionsWithPages = await Promise.all(
      sections.map(async (section) => ({
        ...section,
        pages: await this.notebookRepo.getPagesBySection(section.id)
      }))
    );

    // Get shares
    const shares = await this.notebookRepo.getSharesByNotebook(notebookId);

    return {
      ...notebook,
      sections: sectionsWithPages,
      recent_pages: recentPages.slice(0, 10),
      recent_activity: activity,
      shares
    } as NotebookDetailView;
  }

  /**
   * Create a new notebook
   */
  async createNotebook(input: NotebookCreateInput): Promise<Notebook> {
    return this.notebookRepo.createNotebook(input);
  }

  /**
   * Update a notebook
   */
  async updateNotebook(notebookId: string, input: NotebookUpdateInput): Promise<Notebook> {
    return this.notebookRepo.updateNotebook(notebookId, input);
  }

  /**
   * Delete a notebook (soft delete)
   */
  async deleteNotebook(notebookId: string): Promise<void> {
    return this.notebookRepo.deleteNotebook(notebookId);
  }

  /**
   * Pin/unpin a notebook
   */
  async toggleNotebookPin(notebookId: string): Promise<Notebook> {
    const notebook = await this.notebookRepo.getNotebookById(notebookId);
    if (!notebook) {
      throw new Error('Notebook not found');
    }
    return this.notebookRepo.updateNotebook(notebookId, {
      is_pinned: !notebook.is_pinned
    });
  }

  /**
   * Archive a notebook
   */
  async archiveNotebook(notebookId: string): Promise<Notebook> {
    return this.notebookRepo.updateNotebook(notebookId, {
      status: 'archived'
    });
  }

  /**
   * Restore an archived notebook
   */
  async restoreNotebook(notebookId: string): Promise<Notebook> {
    return this.notebookRepo.updateNotebook(notebookId, {
      status: 'active'
    });
  }

  // ==================== SECTION OPERATIONS ====================

  /**
   * Get sections for a notebook
   */
  async getSectionsByNotebook(notebookId: string): Promise<NotebookSection[]> {
    return this.notebookRepo.getSectionsByNotebook(notebookId);
  }

  /**
   * Get a section by ID
   */
  async getSectionById(sectionId: string): Promise<NotebookSection | null> {
    return this.notebookRepo.getSectionById(sectionId);
  }

  /**
   * Create a new section in a notebook
   */
  async createSection(input: NotebookSectionCreateInput): Promise<NotebookSection> {
    return this.notebookRepo.createSection(input);
  }

  /**
   * Update a section
   */
  async updateSection(sectionId: string, input: NotebookSectionUpdateInput): Promise<NotebookSection> {
    return this.notebookRepo.updateSection(sectionId, input);
  }

  /**
   * Delete a section (soft delete, will cascade to pages)
   */
  async deleteSection(sectionId: string): Promise<void> {
    return this.notebookRepo.deleteSection(sectionId);
  }

  /**
   * Toggle section collapse state
   */
  async toggleSectionCollapse(sectionId: string): Promise<NotebookSection> {
    const section = await this.notebookRepo.getSectionById(sectionId);
    if (!section) {
      throw new Error('Section not found');
    }
    return this.notebookRepo.updateSection(sectionId, {
      is_collapsed: !section.is_collapsed
    });
  }

  /**
   * Reorder sections within a notebook
   */
  async reorderSections(sectionOrders: Array<{ id: string; sort_order: number }>): Promise<void> {
    await Promise.all(
      sectionOrders.map(({ id, sort_order }) =>
        this.notebookRepo.updateSection(id, { sort_order })
      )
    );
  }

  // ==================== PAGE OPERATIONS ====================

  /**
   * Get pages by section
   */
  async getPagesBySection(sectionId: string): Promise<NotebookPage[]> {
    return this.notebookRepo.getPagesBySection(sectionId);
  }

  /**
   * Get pages by notebook with optional filters
   */
  async getPagesByNotebook(notebookId: string, filters?: NotebookPageFilters): Promise<NotebookPage[]> {
    return this.notebookRepo.getPagesByNotebook(notebookId, filters);
  }

  /**
   * Get a page by ID
   */
  async getPageById(pageId: string): Promise<NotebookPage | null> {
    return this.notebookRepo.getPageById(pageId);
  }

  /**
   * Get a page with its attachments
   */
  async getPageWithAttachments(pageId: string): Promise<NotebookPage | null> {
    return this.notebookRepo.getPageWithAttachments(pageId);
  }

  /**
   * Create a new page in a section
   */
  async createPage(input: NotebookPageCreateInput): Promise<NotebookPage> {
    return this.notebookRepo.createPage(input);
  }

  /**
   * Update a page
   */
  async updatePage(pageId: string, input: NotebookPageUpdateInput): Promise<NotebookPage> {
    return this.notebookRepo.updatePage(pageId, input);
  }

  /**
   * Delete a page (soft delete)
   */
  async deletePage(pageId: string): Promise<void> {
    return this.notebookRepo.deletePage(pageId);
  }

  /**
   * Toggle page favorite status
   */
  async togglePageFavorite(pageId: string): Promise<NotebookPage> {
    const page = await this.notebookRepo.getPageById(pageId);
    if (!page) {
      throw new Error('Page not found');
    }
    return this.notebookRepo.updatePage(pageId, {
      is_favorite: !page.is_favorite
    });
  }

  /**
   * Get favorite pages across all notebooks
   */
  async getFavoritePages(): Promise<NotebookPage[]> {
    // This would need to be implemented in the adapter/repository
    // For now, we can filter after fetching
    const notebooks = await this.notebookRepo.getAllNotebooks();
    const allPages: NotebookPage[] = [];

    for (const notebook of notebooks) {
      const pages = await this.notebookRepo.getPagesByNotebook(notebook.id, {
        is_favorite: true
      });
      allPages.push(...pages);
    }

    return allPages;
  }

  /**
   * Search pages by content or title
   */
  async searchPages(query: string, notebookId?: string): Promise<NotebookPage[]> {
    return this.notebookRepo.searchPages(query, notebookId);
  }

  /**
   * Reorder pages within a section
   */
  async reorderPages(pageOrders: Array<{ id: string; sort_order: number }>): Promise<void> {
    await Promise.all(
      pageOrders.map(({ id, sort_order }) =>
        this.notebookRepo.updatePage(id, { sort_order })
      )
    );
  }

  /**
   * Get recent pages (across all accessible notebooks)
   */
  async getRecentPages(limit: number = 10): Promise<NotebookPage[]> {
    const notebooks = await this.notebookRepo.getAllNotebooks();
    const allPages: NotebookPage[] = [];

    for (const notebook of notebooks) {
      const pages = await this.notebookRepo.getPagesByNotebook(notebook.id);
      allPages.push(...pages);
    }

    // Sort by updated_at and limit
    return allPages
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit);
  }

  // ==================== SHARE OPERATIONS ====================

  /**
   * Get shares for a notebook
   */
  async getSharesByNotebook(notebookId: string): Promise<NotebookShare[]> {
    return this.notebookRepo.getSharesByNotebook(notebookId);
  }

  /**
   * Share a notebook with a user
   */
  async shareWithUser(
    notebookId: string,
    userId: string,
    permissions: Partial<Pick<NotebookShare, 'can_view' | 'can_edit' | 'can_delete' | 'can_share'>>
  ): Promise<NotebookShare> {
    return this.notebookRepo.createShare({
      notebook_id: notebookId,
      shared_with_user_id: userId,
      can_view: permissions.can_view ?? true,
      can_edit: permissions.can_edit ?? false,
      can_delete: permissions.can_delete ?? false,
      can_share: permissions.can_share ?? false
    });
  }

  /**
   * Share a notebook with a role
   */
  async shareWithRole(
    notebookId: string,
    roleId: string,
    permissions: Partial<Pick<NotebookShare, 'can_view' | 'can_edit' | 'can_delete' | 'can_share'>>
  ): Promise<NotebookShare> {
    return this.notebookRepo.createShare({
      notebook_id: notebookId,
      shared_with_role_id: roleId,
      can_view: permissions.can_view ?? true,
      can_edit: permissions.can_edit ?? false,
      can_delete: permissions.can_delete ?? false,
      can_share: permissions.can_share ?? false
    });
  }

  /**
   * Share a notebook with a campus
   */
  async shareWithCampus(
    notebookId: string,
    campusId: string,
    permissions: Partial<Pick<NotebookShare, 'can_view' | 'can_edit' | 'can_delete' | 'can_share'>>
  ): Promise<NotebookShare> {
    return this.notebookRepo.createShare({
      notebook_id: notebookId,
      shared_with_campus_id: campusId,
      can_view: permissions.can_view ?? true,
      can_edit: permissions.can_edit ?? false,
      can_delete: permissions.can_delete ?? false,
      can_share: permissions.can_share ?? false
    });
  }

  /**
   * Update share permissions
   */
  async updateShare(shareId: string, permissions: NotebookShareUpdateInput): Promise<NotebookShare> {
    return this.notebookRepo.updateShare(shareId, permissions);
  }

  /**
   * Remove a share
   */
  async removeShare(shareId: string): Promise<void> {
    return this.notebookRepo.deleteShare(shareId);
  }

  /**
   * Make notebook private (remove all shares)
   */
  async makeNotebookPrivate(notebookId: string): Promise<void> {
    const shares = await this.notebookRepo.getSharesByNotebook(notebookId);
    await Promise.all(
      shares.map(share => this.notebookRepo.deleteShare(share.id))
    );
    await this.notebookRepo.updateNotebook(notebookId, {
      visibility: 'private'
    });
  }

  /**
   * Make notebook tenant-wide
   */
  async makeNotebookTenantWide(notebookId: string): Promise<Notebook> {
    return this.notebookRepo.updateNotebook(notebookId, {
      visibility: 'tenant'
    });
  }

  // ==================== ATTACHMENT OPERATIONS ====================

  /**
   * Get attachments for a page
   */
  async getAttachmentsByPage(pageId: string): Promise<NotebookAttachment[]> {
    return this.notebookRepo.getAttachmentsByPage(pageId);
  }

  // ==================== ACTIVITY OPERATIONS ====================

  /**
   * Get activity log for a notebook
   */
  async getActivityByNotebook(notebookId: string, limit?: number): Promise<NotebookActivity[]> {
    return this.notebookRepo.getActivityByNotebook(notebookId, limit);
  }

  // ==================== STATISTICS & DASHBOARD ====================

  /**
   * Get notebook statistics for dashboard
   */
  async getNotebookStats(): Promise<NotebookStats> {
    return this.notebookRepo.getNotebookStats();
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(): Promise<NotebookDashboardData> {
    const [stats, pinnedNotebooks, recentNotebooks, recentPages, recentActivity] = await Promise.all([
      this.getNotebookStats(),
      this.getPinnedNotebooks(),
      this.getNotebooks({ status: ['active'] }),
      this.getRecentPages(10),
      this.getRecentActivity(20)
    ]);

    // Transform to list views
    const pinnedListViews: NotebookListView[] = pinnedNotebooks.map(nb => this.toListView(nb));
    const recentListViews: NotebookListView[] = recentNotebooks
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10)
      .map(nb => this.toListView(nb));

    return {
      stats,
      pinned_notebooks: pinnedListViews,
      recent_notebooks: recentListViews,
      recent_pages: recentPages,
      recent_activity: recentActivity
    };
  }

  /**
   * Get recent activity across all notebooks
   */
  async getRecentActivity(limit: number = 50): Promise<NotebookActivity[]> {
    // This would ideally be a single query in the repository
    // For now, we fetch from multiple notebooks
    const notebooks = await this.notebookRepo.getAllNotebooks();
    const allActivity: NotebookActivity[] = [];

    for (const notebook of notebooks.slice(0, 10)) { // Limit to first 10 notebooks for performance
      const activity = await this.notebookRepo.getActivityByNotebook(notebook.id, 10);
      allActivity.push(...activity);
    }

    // Sort by created_at and limit
    return allActivity
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Transform Notebook to NotebookListView
   */
  private toListView(notebook: Notebook): NotebookListView {
    return {
      id: notebook.id,
      title: notebook.title,
      description: notebook.description ?? undefined,
      color: notebook.color ?? undefined,
      icon: notebook.icon ?? undefined,
      visibility: notebook.visibility,
      status: notebook.status,
      is_pinned: notebook.is_pinned,
      owner_id: notebook.owner_id,
      owner_name: notebook.owner_name,
      section_count: notebook.section_count ?? 0,
      page_count: notebook.page_count ?? 0,
      last_updated: notebook.updated_at,
      created_at: notebook.created_at,
      tags: notebook.tags,
      can_edit: notebook.can_edit ?? false,
      can_delete: notebook.can_delete ?? false,
      can_share: notebook.can_share ?? false
    };
  }
}
