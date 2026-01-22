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
        href: '/admin/community/planning/notebooks/create',
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
        href: '/admin/community/planning/notebooks/create',
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
    actions: [
      {
        id: 'view',
        label: 'View',
        href: `/admin/community/planning/notebooks/${notebook.id}`,
        icon: '👁️',
      },
      {
        id: 'edit',
        label: 'Edit',
        href: `/admin/community/planning/notebooks/${notebook.id}/edit`,
        icon: '✏️',
      },
    ],
  }));

  const columns = [
    {
      id: 'title',
      label: 'Title',
      type: 'text',
      sortable: true,
      width: 'flexible',
    },
    {
      id: 'description',
      label: 'Description',
      type: 'text',
      sortable: false,
      width: 'flexible',
    },
    {
      id: 'visibilityLabel',
      label: 'Visibility',
      type: 'badge',
      sortable: true,
      width: '120px',
    },
    {
      id: 'sectionCount',
      label: 'Sections',
      type: 'number',
      sortable: true,
      width: '100px',
    },
    {
      id: 'pageCount',
      label: 'Pages',
      type: 'number',
      sortable: true,
      width: '100px',
    },
    {
      id: 'updatedAt',
      label: 'Last Updated',
      type: 'date',
      sortable: true,
      width: '150px',
    },
    {
      id: 'actions',
      label: 'Actions',
      type: 'actions',
      sortable: false,
      width: '100px',
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

  // Detail page handlers
  'admin-community.planning.notebooks.detail.hero': resolveNotebookDetailHero,
  'admin-community.planning.notebooks.detail.sections': resolveNotebookSections,
  'admin-community.planning.notebooks.detail.activity': resolveNotebookActivity,

  // Page detail handlers
  'admin-community.planning.notebooks.page.detail': resolveNotebookPage,
};
