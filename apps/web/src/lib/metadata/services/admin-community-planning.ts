import type { ServiceDataSourceHandler } from './types';
import { container } from '@/lib/container';
import { TYPES } from '@/lib/types';
import type { TenantService } from '@/services/TenantService';
import type { PlanningService } from '@/services/PlanningService';
import type {
  CalendarEvent,
  CalendarEventCreateInput,
  CalendarEventUpdateInput,
  CalendarEventType,
  CalendarEventStatus,
  CalendarEventPriority,
} from '@/models/calendarEvent.model';

// ==================== EVENT MANAGE PAGE HANDLERS ====================

const resolveEventManageHero: ServiceDataSourceHandler = async (request) => {
  const eventId = (request.params?.id || request.params?.eventId) as string | undefined;

  if (!eventId) {
    return {
      hero: {
        eyebrow: 'Add new event · Planning module',
        headline: 'Create a new calendar event',
        description: 'Schedule events, follow-ups, and milestones for your church community.',
        metrics: [
          { label: 'Mode', value: 'Create new event', caption: 'Event ID assigned after save' },
          { label: 'Status', value: 'Draft', caption: 'Default status' },
          { label: 'Priority', value: 'Normal', caption: 'Default priority' },
        ],
      },
    };
  }

  // Get tenant context for secure query
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  const planningService = container.get<PlanningService>(TYPES.PlanningService);
  const event = await planningService.getEventById(eventId);

  if (!event) {
    throw new Error('Event not found');
  }

  return {
    hero: {
      eyebrow: 'Edit event · Planning module',
      headline: `Update ${event.title || 'event'}`,
      description: 'Modify event details, timing, and assignments.',
      metrics: [
        { label: 'Mode', value: 'Edit existing event', caption: `Event ID ${event.id.substring(0, 8)}...` },
        { label: 'Status', value: event.status || 'Scheduled', caption: 'Current status' },
        { label: 'Priority', value: event.priority || 'Normal', caption: 'Current priority' },
      ],
    },
  };
};

const resolveEventManageForm: ServiceDataSourceHandler = async (request) => {
  const eventId = (request.params?.id || request.params?.eventId) as string | undefined;
  const isCreate = !eventId;

  // Get tenant context
  const tenantService = container.get<TenantService>(TYPES.TenantService);
  const tenant = await tenantService.getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  let event: Partial<CalendarEvent> = {};

  if (eventId) {
    const planningService = container.get<PlanningService>(TYPES.PlanningService);
    const existingEvent = await planningService.getEventById(eventId);
    if (existingEvent) {
      event = existingEvent;
    }
  }

  // Get categories for the dropdown
  const planningService = container.get<PlanningService>(TYPES.PlanningService);
  const categories = await planningService.getCategories();
  const categoryOptions = categories.map(cat => ({
    label: cat.name,
    value: cat.id,
  }));

  // Format date for input (ISO string for datetime picker)
  const formatDateTimeForInput = (date: Date | string | null | undefined): string => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString();
  };

  return {
    form: {
      title: isCreate ? 'Event details' : 'Update event details',
      description: 'Enter the event information, timing, and assignments.',
      mode: isCreate ? 'create' : 'edit',
      submitLabel: isCreate ? 'Create event' : 'Update event',
      contextParams: {
        eventId: event.id,
        tenantId: tenant?.id,
      },
      initialValues: {
        ...(eventId ? { eventId: event.id } : {}),
        title: event.title || '',
        description: event.description || '',
        categoryId: event.category_id || '',
        eventType: event.event_type || 'general',
        startDate: formatDateTimeForInput(event.start_at),
        endDate: formatDateTimeForInput(event.end_at),
        allDay: event.all_day || false,
        location: event.location || '',
        priority: event.priority || 'normal',
        status: event.status || 'scheduled',
        tags: event.tags?.join(', ') || '',
      },
      fields: [
        // Hidden field for event ID
        ...(eventId ? [{
          name: 'eventId',
          type: 'hidden' as const,
        }] : []),

        // Title
        {
          name: 'title',
          label: 'Event title',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., Youth Group Meeting, Care Plan Follow-up',
          helperText: 'A clear, descriptive title for the event',
          required: true,
        },

        // Category
        {
          name: 'categoryId',
          label: 'Category',
          type: 'select',
          colSpan: 'half',
          placeholder: 'Select a category',
          helperText: 'Categorize this event',
          options: categoryOptions,
        },

        // Event Type
        {
          name: 'eventType',
          label: 'Event type',
          type: 'select',
          colSpan: 'half',
          helperText: 'The type of event',
          options: [
            { label: 'General', value: 'general' },
            { label: 'Care Plan', value: 'care_plan' },
            { label: 'Discipleship', value: 'discipleship' },
            { label: 'Meeting', value: 'meeting' },
            { label: 'Service', value: 'service' },
            { label: 'Outreach', value: 'outreach' },
            { label: 'Training', value: 'training' },
            { label: 'Fellowship', value: 'fellowship' },
          ],
        },

        // All Day Toggle
        {
          name: 'allDay',
          label: 'All day event',
          type: 'toggle',
          colSpan: 'full',
          helperText: 'Toggle on for events without specific start/end times',
        },

        // Start Date/Time
        {
          name: 'startDate',
          label: 'Start date & time',
          type: 'datetime',
          colSpan: 'half',
          placeholder: 'Select start date & time',
          helperText: 'When the event starts',
          required: true,
        },

        // End Date/Time
        {
          name: 'endDate',
          label: 'End date & time',
          type: 'datetime',
          colSpan: 'half',
          placeholder: 'Select end date & time (optional)',
          helperText: 'When the event ends',
        },

        // Location
        {
          name: 'location',
          label: 'Location',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., Main Sanctuary, Room 101, Online',
          helperText: 'Where the event takes place',
        },

        // Priority
        {
          name: 'priority',
          label: 'Priority',
          type: 'select',
          colSpan: 'half',
          helperText: 'Set the priority level',
          options: [
            { label: 'Low', value: 'low' },
            { label: 'Normal', value: 'normal' },
            { label: 'High', value: 'high' },
            { label: 'Urgent', value: 'urgent' },
          ],
        },

        // Status
        {
          name: 'status',
          label: 'Status',
          type: 'select',
          colSpan: 'half',
          helperText: 'Current status of the event',
          options: [
            { label: 'Scheduled', value: 'scheduled' },
            { label: 'Confirmed', value: 'confirmed' },
            { label: 'Tentative', value: 'tentative' },
            { label: 'Cancelled', value: 'cancelled' },
            { label: 'Completed', value: 'completed' },
          ],
        },

        // Description
        {
          name: 'description',
          label: 'Description',
          type: 'richtext',
          colSpan: 'full',
          placeholder: 'Add any additional details about this event...',
          helperText: 'Use formatting to highlight key information, add lists, or structure your notes',
        },

        // Tags
        {
          name: 'tags',
          label: 'Tags',
          type: 'text',
          colSpan: 'full',
          placeholder: 'e.g., youth, worship, outreach (comma separated)',
          helperText: 'Add tags to help organize and filter events',
        },
      ],
    },
  };
};

const saveEvent: ServiceDataSourceHandler = async (request) => {
  const params = request.params as Record<string, unknown>;

  console.log('[saveEvent] Full request object:', JSON.stringify({
    params: params,
    config: request.config,
    id: request.id,
  }, null, 2));

  const eventId = (params.eventId || params.id || request.config?.eventId) as string | undefined;

  console.log('[saveEvent] Attempting to save event. ID:', eventId, 'Mode:', eventId ? 'update' : 'create');

  try {
    const tenantService = container.get<TenantService>(TYPES.TenantService);
    const tenant = await tenantService.getCurrentTenant();
    if (!tenant) {
      throw new Error('No tenant context available');
    }

    const planningService = container.get<PlanningService>(TYPES.PlanningService);

    // Parse tags from comma-separated string
    const tagsString = params.tags as string || '';
    const tags = tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // Parse dates
    const startDate = params.startDate as string;
    const endDate = params.endDate as string | undefined;
    const allDay = params.allDay === true || params.allDay === 'true';

    // Validate required fields
    const title = params.title as string;
    if (!title || !startDate) {
      throw new Error('Title and start date are required');
    }

    // Build event data with proper snake_case properties matching CalendarEventCreateInput
    const eventData: CalendarEventCreateInput = {
      title,
      description: (params.description as string) || null,
      category_id: (params.categoryId as string) || null,
      event_type: (params.eventType as CalendarEventType) || 'general',
      start_at: new Date(startDate).toISOString(),
      end_at: endDate ? new Date(endDate).toISOString() : null,
      all_day: allDay,
      location: (params.location as string) || null,
      priority: (params.priority as CalendarEventPriority) || 'normal',
      status: (params.status as CalendarEventStatus) || 'scheduled',
      tags,
    };

    console.log('[saveEvent] Event data to save:', JSON.stringify(eventData, null, 2));

    let savedEvent: CalendarEvent;

    if (eventId) {
      console.log('[saveEvent] Updating event:', eventId);
      const updateData: CalendarEventUpdateInput = {
        title: eventData.title,
        description: eventData.description,
        category_id: eventData.category_id,
        event_type: eventData.event_type,
        start_at: eventData.start_at,
        end_at: eventData.end_at,
        all_day: eventData.all_day,
        location: eventData.location,
        priority: eventData.priority,
        status: eventData.status,
        tags: eventData.tags,
      };
      savedEvent = await planningService.updateEvent(eventId, updateData);
    } else {
      console.log('[saveEvent] Creating new event');
      savedEvent = await planningService.createEvent(eventData);
    }

    console.log('[saveEvent] Event saved successfully:', savedEvent.id, 'Title:', savedEvent.title);

    return {
      success: true,
      message: eventId ? 'Event updated successfully' : 'Event created successfully',
      eventId: savedEvent.id,
    };
  } catch (error: unknown) {
    console.error('[saveEvent] Failed to save event:', error);

    const errorMessage = error instanceof Error ? error.message.trim() : '';
    let userMessage = 'Something went wrong while saving the event. Please try again.';

    if (errorMessage.includes('null value in column') && errorMessage.includes('violates not-null constraint')) {
      const columnMatch = errorMessage.match(/column "([^"]+)"/);
      const columnName = columnMatch ? columnMatch[1] : 'a required field';
      userMessage = `The ${columnName} field is required but was not provided. Please ensure all required fields are filled in.`;
    } else if (errorMessage.includes('duplicate key value violates unique constraint')) {
      userMessage = 'An event with this information already exists. Please check for duplicates.';
    } else if (errorMessage && !errorMessage.includes('SupabaseClient') && !errorMessage.includes('undefined') && errorMessage.length < 200) {
      userMessage = errorMessage;
    }

    return {
      success: false,
      message: userMessage,
      errors: {
        formErrors: [userMessage],
      },
    };
  }
};

// Export all handlers
export const adminCommunityPlanningHandlers: Record<string, ServiceDataSourceHandler> = {
  'admin-community.planning.event.manage.hero': resolveEventManageHero,
  'admin-community.planning.event.manage.form': resolveEventManageForm,
  'admin-community.planning.event.manage.save': saveEvent,
};
