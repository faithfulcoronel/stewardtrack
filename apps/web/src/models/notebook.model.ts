/**
 * Notebook Domain Models
 * OneNote-style notebook system with visibility controls
 */

import { BaseModel } from './base.model';

// =====================================================
// Enums
// =====================================================

export type NotebookVisibility = 'private' | 'shared' | 'tenant';
export type NotebookStatus = 'active' | 'archived' | 'deleted';
export type NotebookEntryType = 'text' | 'checklist' | 'table' | 'drawing' | 'attachment';
export type ContentType = 'markdown' | 'html' | 'plain';

// =====================================================
// Notebook Model
// =====================================================

export interface Notebook extends BaseModel {
  id: string;
  tenant_id: string;

  // Basic fields
  title: string;
  description?: string | null;
  color?: string | null; // Hex color
  icon?: string | null;

  // Visibility and ownership
  visibility: NotebookVisibility;
  owner_id: string;

  // Organization
  status: NotebookStatus;
  is_pinned?: boolean;
  sort_order?: number;

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;

  // Computed/joined fields (from view or joins)
  section_count?: number;
  page_count?: number;
  attachment_count?: number;
  last_page_updated_at?: string | null;
  owner_name?: string;
  can_edit?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
}

export interface NotebookCreateInput {
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility?: NotebookVisibility;
  status?: NotebookStatus;
  is_pinned?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NotebookUpdateInput {
  title?: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility?: NotebookVisibility;
  status?: NotebookStatus;
  is_pinned?: boolean;
  sort_order?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// =====================================================
// Notebook Section Model
// =====================================================

export interface NotebookSection extends BaseModel {
  id: string;
  tenant_id: string;
  notebook_id: string;

  // Basic fields
  title: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;

  // Organization
  sort_order?: number;
  is_collapsed?: boolean;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;

  // Computed/joined fields
  page_count?: number;
}

export interface NotebookSectionCreateInput {
  notebook_id: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface NotebookSectionUpdateInput {
  title?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
  is_collapsed?: boolean;
}

// =====================================================
// Notebook Page Model
// =====================================================

export interface NotebookPage extends BaseModel {
  id: string;
  tenant_id: string;
  section_id: string;
  notebook_id: string;

  // Basic fields
  title: string;
  content?: string | null;
  content_type?: ContentType;

  // Organization
  sort_order?: number;
  is_favorite?: boolean;

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;

  // Audit fields
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;

  // Computed/joined fields
  section_title?: string;
  notebook_title?: string;
  attachment_count?: number;
  author_name?: string;
}

export interface NotebookPageCreateInput {
  section_id: string;
  notebook_id: string;
  title: string;
  content?: string;
  content_type?: ContentType;
  is_favorite?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NotebookPageUpdateInput {
  title?: string;
  content?: string;
  content_type?: ContentType;
  sort_order?: number;
  is_favorite?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// =====================================================
// Notebook Share Model
// =====================================================

export interface NotebookShare extends BaseModel {
  id: string;
  tenant_id: string;
  notebook_id: string;

  // Sharing target (one of these)
  shared_with_user_id?: string | null;
  shared_with_role_id?: string | null;
  shared_with_campus_id?: string | null;

  // Permissions
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;

  // Metadata
  shared_by: string;
  expires_at?: string | null;

  // Audit fields
  created_at: string;
  updated_at: string;

  // Computed/joined fields
  shared_with_name?: string;
  shared_by_name?: string;
  is_expired?: boolean;
}

export interface NotebookShareCreateInput {
  notebook_id: string;
  shared_with_user_id?: string;
  shared_with_role_id?: string;
  shared_with_campus_id?: string;
  can_view?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
  expires_at?: string;
}

export interface NotebookShareUpdateInput {
  can_view?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_share?: boolean;
  expires_at?: string;
}

// =====================================================
// Notebook Attachment Model
// =====================================================

export interface NotebookAttachment extends BaseModel {
  id: string;
  tenant_id: string;
  page_id: string;

  // File information
  file_name: string;
  file_type?: string | null;
  file_size?: number | null;
  storage_path: string;

  // Metadata
  metadata?: Record<string, unknown>;

  // Audit fields
  created_at: string;
  created_by?: string;
  deleted_at?: string | null;
}

export interface NotebookAttachmentCreateInput {
  page_id: string;
  file_name: string;
  file_type?: string;
  file_size?: number;
  storage_path: string;
  metadata?: Record<string, unknown>;
}

// =====================================================
// Notebook Activity Log Model
// =====================================================

export interface NotebookActivity extends BaseModel {
  id: string;
  tenant_id: string;

  // Target
  notebook_id?: string | null;
  section_id?: string | null;
  page_id?: string | null;

  // Activity details
  action: string; // 'created', 'updated', 'deleted', 'shared', 'viewed'
  actor_id: string;
  details?: Record<string, unknown>;

  // Audit
  created_at: string;

  // Computed/joined fields
  actor_name?: string;
  target_title?: string;
}

// =====================================================
// View Models for UI
// =====================================================

export interface NotebookListView {
  id: string;
  title: string;
  description?: string;
  color?: string;
  icon?: string;
  visibility: NotebookVisibility;
  status: NotebookStatus;
  is_pinned?: boolean;
  owner_id: string;
  owner_name?: string;
  section_count: number;
  page_count: number;
  last_updated: string;
  created_at: string;
  tags?: string[];
  can_edit: boolean;
  can_delete: boolean;
  can_share: boolean;
}

export interface NotebookDetailView extends Notebook {
  sections: NotebookSectionWithPages[];
  recent_pages: NotebookPage[];
  recent_activity: NotebookActivity[];
  shares: NotebookShare[];
}

export interface NotebookSectionWithPages extends NotebookSection {
  pages: NotebookPage[];
}

export interface NotebookPageWithAttachments extends NotebookPage {
  attachments: NotebookAttachment[];
}

// =====================================================
// Statistics Models
// =====================================================

export interface NotebookStats {
  total_notebooks: number;
  my_notebooks: number;
  shared_with_me: number;
  total_pages: number;
  pages_this_week: number;
  pages_this_month: number;
  favorite_pages: number;
  recent_activity_count: number;
}

export interface NotebookDashboardData {
  stats: NotebookStats;
  pinned_notebooks: NotebookListView[];
  recent_notebooks: NotebookListView[];
  recent_pages: NotebookPage[];
  recent_activity: NotebookActivity[];
}

// =====================================================
// Filter and Query Models
// =====================================================

export interface NotebookFilters {
  visibility?: NotebookVisibility[];
  status?: NotebookStatus[];
  owner_id?: string;
  tags?: string[];
  search?: string;
  is_pinned?: boolean;
}

export interface NotebookPageFilters {
  notebook_id?: string;
  section_id?: string;
  tags?: string[];
  search?: string;
  is_favorite?: boolean;
  created_after?: string;
  created_before?: string;
}

export interface NotebookSortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'sort_order';
  direction: 'asc' | 'desc';
}
