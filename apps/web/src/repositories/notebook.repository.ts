import 'server-only';
import { injectable, inject } from 'inversify';
import { BaseRepository } from '@/repositories/base.repository';
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
  NotebookStats
} from '@/models/notebook.model';
import { TYPES } from '@/lib/types';
import type { INotebookAdapter } from '@/adapters/notebook.adapter';

/**
 * Notebook Repository Interface
 * Provides business logic layer for notebook operations
 */
export interface INotebookRepository extends BaseRepository<Notebook> {
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

/**
 * Notebook Repository Implementation
 * Delegates to NotebookAdapter for data access
 */
@injectable()
export class NotebookRepository
  extends BaseRepository<Notebook>
  implements INotebookRepository
{
  constructor(
    @inject(TYPES.INotebookAdapter) private notebookAdapter: INotebookAdapter
  ) {
    super(notebookAdapter);
  }

  // =====================================================
  // Notebook Operations
  // =====================================================

  async getAllNotebooks(filters?: NotebookFilters): Promise<Notebook[]> {
    return this.notebookAdapter.getAllNotebooks(filters);
  }

  async getNotebookById(notebookId: string): Promise<Notebook | null> {
    return this.notebookAdapter.getNotebookById(notebookId);
  }

  async getNotebookWithSections(notebookId: string): Promise<Notebook | null> {
    return this.notebookAdapter.getNotebookWithSections(notebookId);
  }

  async createNotebook(input: NotebookCreateInput): Promise<Notebook> {
    return this.notebookAdapter.createNotebook(input);
  }

  async updateNotebook(notebookId: string, input: NotebookUpdateInput): Promise<Notebook> {
    return this.notebookAdapter.updateNotebook(notebookId, input);
  }

  async deleteNotebook(notebookId: string): Promise<void> {
    return this.notebookAdapter.deleteNotebook(notebookId);
  }

  // =====================================================
  // Section Operations
  // =====================================================

  async getSectionsByNotebook(notebookId: string): Promise<NotebookSection[]> {
    return this.notebookAdapter.getSectionsByNotebook(notebookId);
  }

  async getSectionById(sectionId: string): Promise<NotebookSection | null> {
    return this.notebookAdapter.getSectionById(sectionId);
  }

  async createSection(input: NotebookSectionCreateInput): Promise<NotebookSection> {
    return this.notebookAdapter.createSection(input);
  }

  async updateSection(sectionId: string, input: NotebookSectionUpdateInput): Promise<NotebookSection> {
    return this.notebookAdapter.updateSection(sectionId, input);
  }

  async deleteSection(sectionId: string): Promise<void> {
    return this.notebookAdapter.deleteSection(sectionId);
  }

  // =====================================================
  // Page Operations
  // =====================================================

  async getPagesBySection(sectionId: string): Promise<NotebookPage[]> {
    return this.notebookAdapter.getPagesBySection(sectionId);
  }

  async getPagesByNotebook(notebookId: string, filters?: NotebookPageFilters): Promise<NotebookPage[]> {
    return this.notebookAdapter.getPagesByNotebook(notebookId, filters);
  }

  async getPageById(pageId: string): Promise<NotebookPage | null> {
    return this.notebookAdapter.getPageById(pageId);
  }

  async getPageWithAttachments(pageId: string): Promise<NotebookPage | null> {
    return this.notebookAdapter.getPageWithAttachments(pageId);
  }

  async createPage(input: NotebookPageCreateInput): Promise<NotebookPage> {
    return this.notebookAdapter.createPage(input);
  }

  async updatePage(pageId: string, input: NotebookPageUpdateInput): Promise<NotebookPage> {
    return this.notebookAdapter.updatePage(pageId, input);
  }

  async deletePage(pageId: string): Promise<void> {
    return this.notebookAdapter.deletePage(pageId);
  }

  async searchPages(query: string, notebookId?: string): Promise<NotebookPage[]> {
    return this.notebookAdapter.searchPages(query, notebookId);
  }

  // =====================================================
  // Share Operations
  // =====================================================

  async getSharesByNotebook(notebookId: string): Promise<NotebookShare[]> {
    return this.notebookAdapter.getSharesByNotebook(notebookId);
  }

  async createShare(input: NotebookShareCreateInput): Promise<NotebookShare> {
    return this.notebookAdapter.createShare(input);
  }

  async updateShare(shareId: string, input: NotebookShareUpdateInput): Promise<NotebookShare> {
    return this.notebookAdapter.updateShare(shareId, input);
  }

  async deleteShare(shareId: string): Promise<void> {
    return this.notebookAdapter.deleteShare(shareId);
  }

  // =====================================================
  // Attachment Operations
  // =====================================================

  async getAttachmentsByPage(pageId: string): Promise<NotebookAttachment[]> {
    return this.notebookAdapter.getAttachmentsByPage(pageId);
  }

  // =====================================================
  // Activity Operations
  // =====================================================

  async getActivityByNotebook(notebookId: string, limit?: number): Promise<NotebookActivity[]> {
    return this.notebookAdapter.getActivityByNotebook(notebookId, limit);
  }

  // =====================================================
  // Statistics
  // =====================================================

  async getNotebookStats(): Promise<NotebookStats> {
    return this.notebookAdapter.getNotebookStats();
  }
}
