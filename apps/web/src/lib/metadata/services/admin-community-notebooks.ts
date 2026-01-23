import type { ServiceDataSourceHandler, ServiceDataSourceRequest } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { NotebookService } from '@/services/NotebookService';
import type {
  NotebookCreateInput,
  NotebookUpdateInput,
  NotebookSectionCreateInput,
  NotebookPageCreateInput,
  NotebookPageUpdateInput
} from '@/models/notebook.model';
import { getTenantTimezone, formatDate, formatTime } from './datetime-utils';

// ==================== NOTEBOOKS LIST PAGE HANDLERS ====================

/**
 * Resolves the hero section for the notebooks list page.
 * Returns eyebrow, headline, description, and key metrics.
 */
export const resolveNotebooksHero: ServiceDataSourceHandler = async () => {
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const stats = await notebookService.getNotebookStats();

  return {
    eyebrow: 'Planning · Notes & documentation',
    headline: 'Notebooks',
    description: 'Organize your ministry notes, meeting minutes, and documentation in OneNote-style notebooks.',
    highlights: [
      { text: 'Hierarchical organization with sections', icon: '📚' },
      { text: 'Rich text editing with attachments', icon: '📝' },
      { text: 'Share with team members or make private', icon: '🔒' },
    ],
    metrics: [
      { label: 'Total Notebooks', value: String(stats.total_notebooks), caption: 'All notebooks' },
      { label: 'My Notebooks', value: String(stats.my_notebooks), caption: 'Owned by you' },
      { label: 'Shared with Me', value: String(stats.shared_with_me), caption: 'Team notebooks' },
      { label: 'Total Pages', value: String(stats.total_pages), caption: 'All pages' },
    ],
  };
};

/**
 * Resolves the metrics cards for notebooks dashboard.
 * Returns KPI metrics for notebook overview.
 */
export const resolveNotebooksMetrics: ServiceDataSourceHandler = async () => {
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const stats = await notebookService.getNotebookStats();

  return {
    items: [
      {
        id: 'total-notebooks',
        label: 'Total Notebooks',
        value: String(stats.total_notebooks),
        description: 'All accessible notebooks',
        icon: '📚',
        tone: 'informative',
      },
      {
        id: 'pages-this-week',
        label: 'Pages This Week',
        value: String(stats.pages_this_week),
        description: 'New pages created',
        icon: '📝',
        tone: stats.pages_this_week > 0 ? 'positive' : 'neutral',
      },
      {
        id: 'favorite-pages',
        label: 'Favorite Pages',
        value: String(stats.favorite_pages),
        description: 'Pages marked as favorites',
        icon: '⭐',
        tone: 'informative',
      },
      {
        id: 'recent-activity',
        label: 'Recent Activity',
        value: String(stats.recent_activity_count),
        description: 'Actions in the last 7 days',
        icon: '📊',
        tone: 'informative',
      },
    ],
  };
};

/**
 * Resolves quick links for the notebooks page.
 * Returns navigation cards for notebook actions and views.
 */
export const resolveNotebooksQuickLinks: ServiceDataSourceHandler = async () => {
  return {
    items: [
      {
        id: 'create-notebook',
        title: 'Create Notebook',
        description: 'Start a new notebook to organize your notes and documentation.',
        href: '/admin/community/planning/notebooks/manage',
        icon: '➕',
      },
      {
        id: 'my-notebooks',
        title: 'My Notebooks',
        description: 'View all notebooks that you own and manage.',
        href: '/admin/community/planning/notebooks?filter=mine',
        icon: '📔',
      },
      {
        id: 'shared-notebooks',
        title: 'Shared Notebooks',
        description: 'Access notebooks shared with you by team members.',
        href: '/admin/community/planning/notebooks?filter=shared',
        icon: '🤝',
      },
      {
        id: 'favorites',
        title: 'Favorite Pages',
        description: 'Quick access to pages you\'ve marked as favorites.',
        href: '/admin/community/planning/notebooks/favorites',
        icon: '⭐',
      },
    ],
    actions: [
      {
        id: 'create',
        label: 'Create notebook',
        variant: 'primary',
        href: '/admin/community/planning/notebooks/manage',
      },
    ],
  };
};

/**
 * Resolves the data grid for the notebooks list.
 * Returns all notebooks with their properties for table display.
 */
export const resolveNotebooksTable: ServiceDataSourceHandler = async (request) => {
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);

  // Get filter from request if provided
  const filter = request?.params?.filter as string | undefined;

  let notebooks;
  if (filter === 'mine') {
    notebooks = await notebookService.getMyNotebooks();
  } else if (filter === 'shared') {
    notebooks = await notebookService.getSharedNotebooks();
  } else {
    notebooks = await notebookService.getNotebooks({ status: ['active'] });
  }

  // Get timezone for date formatting
  const timezone = await getTenantTimezone();

  const rows = notebooks.map((notebook) => ({
    id: notebook.id,
    title: notebook.title,
    description: notebook.description || '',
    visibility: notebook.visibility,
    visibilityLabel: notebook.visibility === 'private' ? 'Private' :
                     notebook.visibility === 'shared' ? 'Shared' : 'Tenant-wide',
    status: notebook.status,
    statusLabel: notebook.status === 'active' ? 'Active' :
                 notebook.status === 'archived' ? 'Archived' : 'Deleted',
    isPinned: notebook.is_pinned,
    sectionCount: notebook.section_count ?? 0,
    pageCount: notebook.page_count ?? 0,
    color: notebook.color || '#4F46E5',
    icon: notebook.icon || 'book',
    tags: notebook.tags ?? [],
    createdAt: formatDate(new Date(notebook.created_at), timezone, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    updatedAt: formatDate(new Date(notebook.updated_at), timezone, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  }));

  const columns = [
    {
      field: 'title',
      headerName: 'Title',
      type: 'text',
      sortable: true,
      flex: 1.5,
    },
    {
      field: 'description',
      headerName: 'Description',
      type: 'text',
      sortable: false,
      flex: 1,
      hideOnMobile: true,
    },
    {
      field: 'visibilityLabel',
      headerName: 'Visibility',
      type: 'badge',
      sortable: true,
      flex: 0.6,
    },
    {
      field: 'sectionCount',
      headerName: 'Sections',
      type: 'text',
      sortable: true,
      flex: 0.5,
      hideOnMobile: true,
    },
    {
      field: 'pageCount',
      headerName: 'Pages',
      type: 'text',
      sortable: true,
      flex: 0.5,
      hideOnMobile: true,
    },
    {
      field: 'updatedAt',
      headerName: 'Last Updated',
      type: 'text',
      sortable: true,
      flex: 0.8,
    },
    {
      field: 'actions',
      headerName: 'Actions',
      type: 'actions',
      sortable: false,
      flex: 0.6,
      actions: [
        {
          id: 'view-record',
          label: 'View',
          intent: 'view',
          urlTemplate: '/admin/community/planning/notebooks/{{id}}',
        },
        {
          id: 'edit-record',
          label: 'Edit',
          intent: 'edit',
          urlTemplate: '/admin/community/planning/notebooks/manage?notebookId={{id}}',
          variant: 'secondary',
        },
      ],
    },
  ];

  return {
    rows,
    columns,
    totalCount: rows.length,
    emptyState: {
      title: 'No notebooks yet',
      description: 'Create your first notebook to start organizing your notes and documentation.',
      actionLabel: 'Create notebook',
      actionHref: '/admin/community/planning/notebooks/create',
    },
  };
};

/**
 * Resolves cards view for notebooks (alternative to table).
 * Returns notebooks as cards for visual display.
 */
export const resolveNotebooksCards: ServiceDataSourceHandler = async () => {
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const notebooks = await notebookService.getNotebooks({ status: ['active'] });

  // Get timezone for date formatting
  const timezone = await getTenantTimezone();

  const items = notebooks.map((notebook) => ({
    id: notebook.id,
    title: notebook.title,
    description: notebook.description || 'No description',
    color: notebook.color || '#4F46E5',
    icon: notebook.icon || 'book',
    isPinned: notebook.is_pinned,
    visibility: notebook.visibility,
    sectionCount: notebook.section_count ?? 0,
    pageCount: notebook.page_count ?? 0,
    tags: notebook.tags ?? [],
    href: `/admin/community/planning/notebooks/${notebook.id}`,
    lastUpdated: formatDate(new Date(notebook.updated_at), timezone, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
    actions: [
      {
        id: 'view',
        label: 'Open',
        href: `/admin/community/planning/notebooks/${notebook.id}`,
      },
      {
        id: 'edit',
        label: 'Edit',
        href: `/admin/community/planning/notebooks/${notebook.id}/edit`,
      },
    ],
  }));

  return {
    items,
    layout: 'grid',
    columns: 3,
  };
};

// ==================== NOTEBOOK DETAIL PAGE HANDLERS ====================

/**
 * Resolves the hero section for a specific notebook detail page.
 * Returns notebook title, description, and key details.
 */
export const resolveNotebookDetailHero: ServiceDataSourceHandler = async (request) => {
  const notebookId = request?.params?.notebookId as string;
  if (!notebookId) {
    throw new Error('Notebook ID is required');
  }

  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const notebook = await notebookService.getNotebookById(notebookId);

  if (!notebook) {
    throw new Error('Notebook not found');
  }

  const timezone = await getTenantTimezone();

  return {
    eyebrow: 'Notebooks · Detail',
    headline: notebook.title,
    description: notebook.description || 'No description available',
    metadata: [
      { label: 'Visibility', value: notebook.visibility },
      { label: 'Status', value: notebook.status },
      { label: 'Sections', value: String(notebook.section_count ?? 0) },
      { label: 'Pages', value: String(notebook.page_count ?? 0) },
      {
        label: 'Last Updated',
        value: formatDate(new Date(notebook.updated_at), timezone, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      },
    ],
    actions: [
      {
        id: 'edit',
        label: 'Edit notebook',
        variant: 'secondary',
        href: `/admin/community/planning/notebooks/${notebookId}/edit`,
      },
      {
        id: 'add-section',
        label: 'Add section',
        variant: 'primary',
        href: `/admin/community/planning/notebooks/${notebookId}/sections/create`,
      },
    ],
  };
};

/**
 * Resolves sections and pages for a notebook.
 * Returns hierarchical structure of sections with their pages.
 */
export const resolveNotebookSections: ServiceDataSourceHandler = async (request) => {
  const notebookId = request?.params?.notebookId as string;
  if (!notebookId) {
    throw new Error('Notebook ID is required');
  }

  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const sections = await notebookService.getSectionsByNotebook(notebookId);

  const timezone = await getTenantTimezone();

  const items = await Promise.all(
    sections.map(async (section) => {
      const pages = await notebookService.getPagesBySection(section.id);

      return {
        id: section.id,
        title: section.title,
        description: section.description,
        color: section.color,
        icon: section.icon,
        isCollapsed: section.is_collapsed,
        sortOrder: section.sort_order,
        pageCount: pages.length,
        pages: pages.map((page) => ({
          id: page.id,
          title: page.title,
          isFavorite: page.is_favorite,
          tags: page.tags ?? [],
          updatedAt: formatDate(new Date(page.updated_at), timezone, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
          href: `/admin/community/planning/notebooks/${notebookId}/pages/${page.id}`,
        })),
      };
    })
  );

  return {
    items,
    emptyState: {
      title: 'No sections yet',
      description: 'Create your first section to organize pages in this notebook.',
      actionLabel: 'Create section',
      actionHref: `/admin/community/planning/notebooks/${notebookId}/sections/create`,
    },
  };
};

/**
 * Resolves recent activity for a notebook.
 * Returns recent changes and actions performed on the notebook.
 */
export const resolveNotebookActivity: ServiceDataSourceHandler = async (request) => {
  const notebookId = request?.params?.notebookId as string;
  if (!notebookId) {
    throw new Error('Notebook ID is required');
  }

  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const activities = await notebookService.getActivityByNotebook(notebookId, 20);

  const timezone = await getTenantTimezone();

  const items = activities.map((activity) => {
    let icon = '📝';
    if (activity.action === 'created') icon = '➕';
    else if (activity.action === 'updated') icon = '✏️';
    else if (activity.action === 'deleted') icon = '🗑️';
    else if (activity.action === 'shared') icon = '🤝';
    else if (activity.action === 'viewed') icon = '👁️';

    return {
      id: activity.id,
      action: activity.action,
      details: activity.details,
      icon,
      timestamp: formatDate(new Date(activity.created_at), timezone, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  });

  return {
    items,
  };
};

// ==================== NOTEBOOK PAGE DETAIL HANDLERS ====================

/**
 * Resolves a specific page within a notebook.
 * Returns page content, metadata, and attachments.
 */
export const resolveNotebookPage: ServiceDataSourceHandler = async (request) => {
  const notebookId = request?.params?.notebookId as string;
  const pageId = request?.params?.pageId as string;

  if (!notebookId || !pageId) {
    throw new Error('Notebook ID and Page ID are required');
  }

  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const page = await notebookService.getPageWithAttachments(pageId);

  if (!page) {
    throw new Error('Page not found');
  }

  const timezone = await getTenantTimezone();

  return {
    id: page.id,
    title: page.title,
    content: page.content || '',
    contentType: page.content_type || 'markdown',
    isFavorite: page.is_favorite,
    tags: page.tags ?? [],
    metadata: [
      { label: 'Section', value: page.section_title || 'Unknown' },
      {
        label: 'Created',
        value: formatDate(new Date(page.created_at), timezone, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      },
      {
        label: 'Last Modified',
        value: formatDate(new Date(page.updated_at), timezone, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      },
    ],
    attachments: (page as any).attachments || [],
    actions: [
      {
        id: 'edit',
        label: 'Edit page',
        variant: 'primary',
        href: `/admin/community/planning/notebooks/${notebookId}/pages/${pageId}/edit`,
      },
      {
        id: 'favorite',
        label: page.is_favorite ? 'Remove from favorites' : 'Add to favorites',
        variant: 'secondary',
        action: 'toggle-favorite',
      },
    ],
  };
};

// ==================== NOTEBOOK MANAGE PAGE HANDLERS ====================

/**
 * Resolves notebook form data for the manage page.
 * Returns field definitions and initial values for create or edit mode.
 */
export const resolveNotebookManageForm: ServiceDataSourceHandler = async (request) => {
  const notebookId = request?.params?.notebookId as string | undefined;

  // Define form fields
  const fields = [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      placeholder: 'e.g., Ministry Planning, Meeting Notes',
      helperText: 'A clear, descriptive name for this notebook',
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: false,
      placeholder: 'What will this notebook be used for?',
      rows: 3,
    },
    {
      name: 'visibility',
      label: 'Visibility',
      type: 'select',
      required: true,
      options: [
        { value: 'private', label: 'Private - Only me' },
        { value: 'shared', label: 'Shared - Specific users' },
        { value: 'tenant', label: 'Tenant-wide - All staff' },
      ],
      helperText: 'Who can access this notebook',
    },
    {
      name: 'color',
      label: 'Color',
      type: 'color',
      required: false,
      helperText: 'Visual identifier for this notebook',
    },
    {
      name: 'icon',
      label: 'Icon',
      type: 'select',
      required: false,
      options: [
        { value: 'book', label: '📚 Book' },
        { value: 'notebook', label: '📓 Notebook' },
        { value: 'clipboard', label: '📋 Clipboard' },
        { value: 'folder', label: '📁 Folder' },
        { value: 'briefcase', label: '💼 Briefcase' },
      ],
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'tags',
      required: false,
      placeholder: 'Add tags...',
      helperText: 'Categorize with keywords (optional)',
    },
  ];

  // Create mode - return empty initial values
  if (!notebookId) {
    return {
      fields,
      values: {
        title: '',
        description: '',
        visibility: 'private',
        color: '#4F46E5',
        icon: 'book',
        tags: [],
      },
    };
  }

  // Edit mode - fetch existing notebook and populate values
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const notebook = await notebookService.getNotebookById(notebookId);

  if (!notebook) {
    throw new Error('Notebook not found');
  }

  return {
    fields,
    values: {
      title: notebook.title || '',
      description: notebook.description || '',
      visibility: notebook.visibility || 'private',
      color: notebook.color || '#4F46E5',
      icon: notebook.icon || 'book',
      tags: notebook.tags || [],
    },
  };
};

/**
 * Handles saving a notebook (create or update).
 */
export const resolveNotebookManageSave: ServiceDataSourceHandler = async (request) => {
  const notebookService = container.get<NotebookService>(TYPES.NotebookService);
  const formData = request?.params?.formData as any;
  const notebookId = request?.params?.notebookId as string | undefined;

  if (!formData) {
    throw new Error('Form data is required');
  }

  if (notebookId) {
    // Update existing notebook
    await notebookService.updateNotebook(notebookId, {
      title: formData.title,
      description: formData.description,
      visibility: formData.visibility,
      color: formData.color,
      icon: formData.icon,
      tags: formData.tags,
    });

    return {
      success: true,
      message: 'Notebook updated successfully',
      notebookId,
    };
  } else {
    // Create new notebook
    const newNotebook = await notebookService.createNotebook({
      title: formData.title,
      description: formData.description,
      visibility: formData.visibility || 'private',
      color: formData.color || '#4F46E5',
      icon: formData.icon || 'book',
      tags: formData.tags || [],
    });

    return {
      success: true,
      message: 'Notebook created successfully',
      notebookId: newNotebook.id,
    };
  }
};

// ==================== HANDLER REGISTRY ====================

/**
 * Registry of all notebook-related metadata service handlers.
 * These handlers are imported into the main admin-community handlers.
 */
export const adminCommunityNotebooksHandlers: Record<string, ServiceDataSourceHandler> = {
  // List page handlers
  'admin-community.planning.notebooks.hero': resolveNotebooksHero,
  'admin-community.planning.notebooks.metrics': resolveNotebooksMetrics,
  'admin-community.planning.notebooks.quicklinks': resolveNotebooksQuickLinks,
  'admin-community.planning.notebooks.table': resolveNotebooksTable,
  'admin-community.planning.notebooks.cards': resolveNotebooksCards,

  // Manage page handlers (create/edit)
  'admin-community.planning.notebooks.manage.form': resolveNotebookManageForm,

  // Detail page handlers
  'admin-community.planning.notebooks.detail.hero': resolveNotebookDetailHero,
  'admin-community.planning.notebooks.detail.sections': resolveNotebookSections,
  'admin-community.planning.notebooks.detail.activity': resolveNotebookActivity,

  // Page detail handlers
  'admin-community.planning.notebooks.page.detail': resolveNotebookPage,
};
