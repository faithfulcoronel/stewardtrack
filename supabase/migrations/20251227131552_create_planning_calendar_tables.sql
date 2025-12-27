-- ============================================================================
-- PLANNING CALENDAR FEATURE TABLES
-- ============================================================================
-- This migration creates tables for the planning calendar feature that aggregates
-- events from care plans, discipleship plans, and other church activities.
--
-- Features:
-- - Calendar events table for unified event view
-- - Event sources linking to care plans, discipleship plans, etc.
-- - Calendar categories for color-coding and filtering
-- - Recurring event support
-- - Event reminders and notifications
-- ============================================================================

-- ============================================================================
-- CALENDAR CATEGORIES TABLE
-- ============================================================================
-- Defines categories for calendar events with colors and icons
CREATE TABLE IF NOT EXISTS public.calendar_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#3B82F6', -- Tailwind blue-500
    icon TEXT DEFAULT 'calendar',
    sort_order INTEGER DEFAULT 0,
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    UNIQUE(tenant_id, code)
);

-- ============================================================================
-- CALENDAR EVENTS TABLE
-- ============================================================================
-- Main events table for the planning calendar
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Event details
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,

    -- Timing
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT FALSE,
    timezone TEXT DEFAULT 'UTC',

    -- Category and type
    category_id UUID REFERENCES public.calendar_categories(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL DEFAULT 'general', -- care_plan, discipleship, meeting, service, event, reminder

    -- Status
    status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled, postponed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent

    -- Source linking (polymorphic)
    source_type TEXT, -- member_care_plans, member_discipleship_plans, etc.
    source_id UUID, -- ID of the linked record

    -- Member assignment
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- iCal RRULE format
    recurrence_end_at TIMESTAMPTZ,
    parent_event_id UUID REFERENCES public.calendar_events(id) ON DELETE CASCADE,

    -- Visibility
    is_private BOOLEAN DEFAULT FALSE,
    visibility TEXT DEFAULT 'team', -- private, team, public

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Audit
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- EVENT REMINDERS TABLE
-- ============================================================================
-- Reminders for calendar events
CREATE TABLE IF NOT EXISTS public.calendar_event_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

    -- Reminder timing
    remind_at TIMESTAMPTZ NOT NULL,
    minutes_before INTEGER NOT NULL DEFAULT 30,

    -- Notification settings
    notification_type TEXT DEFAULT 'in_app', -- in_app, email, sms
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Status
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EVENT ATTENDEES TABLE
-- ============================================================================
-- Tracks attendees for calendar events
CREATE TABLE IF NOT EXISTS public.calendar_event_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,

    -- Attendee
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,

    -- Response
    response_status TEXT DEFAULT 'pending', -- pending, accepted, declined, tentative
    responded_at TIMESTAMPTZ,

    -- Role
    role TEXT DEFAULT 'attendee', -- organizer, attendee, optional

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT attendee_user_or_member CHECK (user_id IS NOT NULL OR member_id IS NOT NULL)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Calendar categories indexes
CREATE INDEX IF NOT EXISTS idx_calendar_categories_tenant ON public.calendar_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_categories_code ON public.calendar_categories(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_calendar_categories_active ON public.calendar_categories(tenant_id, is_active) WHERE is_active = TRUE;

-- Calendar events indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON public.calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON public.calendar_events(tenant_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_category ON public.calendar_events(category_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON public.calendar_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_source ON public.calendar_events(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_member ON public.calendar_events(member_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_assigned ON public.calendar_events(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calendar_events_active ON public.calendar_events(tenant_id, is_active, deleted_at)
    WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_calendar_events_recurring ON public.calendar_events(parent_event_id)
    WHERE parent_event_id IS NOT NULL;

-- Event reminders indexes
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_event ON public.calendar_event_reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_pending ON public.calendar_event_reminders(remind_at, is_sent)
    WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_calendar_reminders_recipient ON public.calendar_event_reminders(recipient_id);

-- Event attendees indexes
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_event ON public.calendar_event_attendees(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_user ON public.calendar_event_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_attendees_member ON public.calendar_event_attendees(member_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.calendar_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_attendees ENABLE ROW LEVEL SECURITY;

-- Calendar categories policies
CREATE POLICY "calendar_categories_tenant_isolation" ON public.calendar_categories
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "calendar_categories_service_role" ON public.calendar_categories
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Calendar events policies
CREATE POLICY "calendar_events_tenant_isolation" ON public.calendar_events
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "calendar_events_service_role" ON public.calendar_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Event reminders policies
CREATE POLICY "calendar_reminders_tenant_isolation" ON public.calendar_event_reminders
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "calendar_reminders_service_role" ON public.calendar_event_reminders
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Event attendees policies
CREATE POLICY "calendar_attendees_tenant_isolation" ON public.calendar_event_attendees
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "calendar_attendees_service_role" ON public.calendar_event_attendees
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- TRIGGERS
-- ============================================================================
-- Update timestamp trigger for calendar_categories
CREATE TRIGGER set_calendar_categories_updated_at
    BEFORE UPDATE ON public.calendar_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for calendar_events
CREATE TRIGGER set_calendar_events_updated_at
    BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for calendar_event_reminders
CREATE TRIGGER set_calendar_reminders_updated_at
    BEFORE UPDATE ON public.calendar_event_reminders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for calendar_event_attendees
CREATE TRIGGER set_calendar_attendees_updated_at
    BEFORE UPDATE ON public.calendar_event_attendees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT CALENDAR CATEGORIES
-- ============================================================================
-- Note: These will be created per tenant during onboarding
-- The INSERT uses a CTE to check if system categories exist

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.calendar_categories IS 'Calendar event categories with colors and icons';
COMMENT ON TABLE public.calendar_events IS 'Unified calendar events aggregating care plans, discipleship, and activities';
COMMENT ON TABLE public.calendar_event_reminders IS 'Reminders for calendar events';
COMMENT ON TABLE public.calendar_event_attendees IS 'Attendees for calendar events';

COMMENT ON COLUMN public.calendar_events.source_type IS 'Type of source record: member_care_plans, member_discipleship_plans, etc.';
COMMENT ON COLUMN public.calendar_events.source_id IS 'UUID of the linked source record';
COMMENT ON COLUMN public.calendar_events.recurrence_rule IS 'iCal RRULE format for recurring events';
COMMENT ON COLUMN public.calendar_events.event_type IS 'Event type: care_plan, discipleship, meeting, service, event, reminder, general';
