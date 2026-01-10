-- ============================================================================
-- SCHEDULER SYSTEM TABLES
-- ============================================================================
-- This migration creates tables for the ministry scheduler feature that manages
-- ministry schedules, team assignments, registrations, and attendance tracking.
--
-- Features:
-- - Ministries as first-class entities with team management
-- - Recurring schedule definitions with iCal RRULE support
-- - Schedule occurrences (specific event instances)
-- - Team assignments (ministry teams + ad-hoc volunteers)
-- - Registration with custom forms and waitlist support
-- - QR code-based attendance (staff scan + self-check-in)
-- - Integration with existing calendar_events via polymorphic linking
-- ============================================================================

BEGIN;

-- ============================================================================
-- MINISTRIES TABLE
-- ============================================================================
-- First-class ministry entities that can have teams and schedules
CREATE TABLE IF NOT EXISTS public.ministries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Basic Information
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general', -- worship, education, outreach, fellowship, support, general

    -- Leadership
    leader_id UUID REFERENCES public.members(id) ON DELETE SET NULL,

    -- Appearance
    color TEXT DEFAULT '#3B82F6', -- Tailwind blue-500
    icon TEXT DEFAULT 'users',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,

    UNIQUE(tenant_id, code)
);

-- ============================================================================
-- MINISTRY TEAMS TABLE
-- ============================================================================
-- Team assignments with roles for ministries
CREATE TABLE IF NOT EXISTS public.ministry_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,

    -- Role in Ministry
    role TEXT NOT NULL DEFAULT 'member', -- leader, volunteer, member
    position TEXT, -- e.g., "Worship Leader", "Sound Tech", "Greeter"

    -- Status
    status TEXT DEFAULT 'active', -- active, inactive, on_leave
    joined_at TIMESTAMPTZ DEFAULT NOW(),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ministry_id, member_id)
);

-- ============================================================================
-- MINISTRY SCHEDULES TABLE
-- ============================================================================
-- Recurring schedule definitions for ministry events
CREATE TABLE IF NOT EXISTS public.ministry_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    ministry_id UUID NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,

    -- Schedule Information
    name TEXT NOT NULL,
    description TEXT,
    schedule_type TEXT NOT NULL DEFAULT 'service', -- service, bible_study, rehearsal, conference, seminar, meeting, other

    -- Timing
    start_time TIME NOT NULL,
    end_time TIME,
    duration_minutes INTEGER,
    timezone TEXT DEFAULT 'UTC',

    -- Recurrence (iCal RRULE format)
    recurrence_rule TEXT, -- e.g., 'FREQ=WEEKLY;BYDAY=SU'
    recurrence_start_date DATE NOT NULL,
    recurrence_end_date DATE,

    -- Location
    location TEXT,
    location_type TEXT DEFAULT 'physical', -- physical, virtual, hybrid
    virtual_meeting_url TEXT,

    -- Capacity & Registration
    capacity INTEGER,
    waitlist_enabled BOOLEAN DEFAULT FALSE,
    registration_required BOOLEAN DEFAULT FALSE,
    registration_opens_days_before INTEGER DEFAULT 7,
    registration_closes_hours_before INTEGER DEFAULT 1,
    registration_form_schema JSONB DEFAULT '[]', -- Custom form fields definition

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- SCHEDULE OCCURRENCES TABLE
-- ============================================================================
-- Specific instances of scheduled events
CREATE TABLE IF NOT EXISTS public.schedule_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    schedule_id UUID NOT NULL REFERENCES public.ministry_schedules(id) ON DELETE CASCADE,

    -- Occurrence Details
    occurrence_date DATE NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,

    -- Override Information (nulls inherit from schedule)
    override_name TEXT,
    override_description TEXT,
    override_location TEXT,
    override_capacity INTEGER,

    -- Status
    status TEXT DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    cancellation_reason TEXT,

    -- Registration Stats (denormalized for performance)
    registered_count INTEGER DEFAULT 0,
    waitlist_count INTEGER DEFAULT 0,
    checked_in_count INTEGER DEFAULT 0,

    -- QR Code for self-check-in
    qr_token TEXT UNIQUE,
    qr_expires_at TIMESTAMPTZ,

    -- Calendar Integration (polymorphic link)
    calendar_event_id UUID REFERENCES public.calendar_events(id) ON DELETE SET NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(schedule_id, occurrence_date)
);

-- ============================================================================
-- SCHEDULE TEAM ASSIGNMENTS TABLE
-- ============================================================================
-- Team assignments per occurrence (both ministry team members and ad-hoc volunteers)
CREATE TABLE IF NOT EXISTS public.schedule_team_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    occurrence_id UUID NOT NULL REFERENCES public.schedule_occurrences(id) ON DELETE CASCADE,

    -- Assignment (member_id for team members, null for ad-hoc)
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    assigned_role TEXT NOT NULL, -- e.g., "Worship Leader", "Greeter", "Sound Tech"

    -- Ad-hoc Volunteer (when not a team member)
    is_adhoc BOOLEAN DEFAULT FALSE,
    volunteer_name TEXT, -- For non-member volunteers
    volunteer_contact TEXT,

    -- Confirmation Status
    status TEXT DEFAULT 'pending', -- pending, confirmed, declined, no_show
    confirmed_at TIMESTAMPTZ,
    declined_reason TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SCHEDULE REGISTRATIONS TABLE
-- ============================================================================
-- Event registrations with custom form data
CREATE TABLE IF NOT EXISTS public.schedule_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    occurrence_id UUID NOT NULL REFERENCES public.schedule_occurrences(id) ON DELETE CASCADE,

    -- Registrant (member or guest)
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    guest_name TEXT, -- For non-member registrations
    guest_email TEXT,
    guest_phone TEXT,

    -- Registration Details
    registration_date TIMESTAMPTZ DEFAULT NOW(),
    party_size INTEGER DEFAULT 1, -- For group registrations

    -- Status
    status TEXT DEFAULT 'registered', -- registered, waitlisted, cancelled, checked_in, no_show
    waitlist_position INTEGER,

    -- Custom Form Responses (stores responses to registration_form_schema)
    form_responses JSONB DEFAULT '{}',

    -- Notes
    special_requests TEXT,
    admin_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_member_registration UNIQUE (occurrence_id, member_id),
    CONSTRAINT registrant_required CHECK (member_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- ============================================================================
-- SCHEDULE ATTENDANCE TABLE
-- ============================================================================
-- Check-in records with QR tracking
CREATE TABLE IF NOT EXISTS public.schedule_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    occurrence_id UUID NOT NULL REFERENCES public.schedule_occurrences(id) ON DELETE CASCADE,

    -- Attendee
    member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
    registration_id UUID REFERENCES public.schedule_registrations(id) ON DELETE SET NULL,
    guest_name TEXT, -- For walk-in guests

    -- Check-in Details
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    checked_in_by UUID REFERENCES auth.users(id),

    -- Check-in Method
    checkin_method TEXT NOT NULL DEFAULT 'manual', -- staff_scan, self_checkin, manual
    qr_token_used TEXT, -- Which QR was scanned (member token or event token)

    -- Location/Device Info (for audit purposes)
    device_info JSONB DEFAULT '{}',

    -- Checkout (optional, for duration tracking)
    checked_out_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint: unique attendance per member per occurrence
    CONSTRAINT unique_member_attendance UNIQUE (occurrence_id, member_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Ministries indexes
CREATE INDEX IF NOT EXISTS idx_ministries_tenant ON public.ministries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ministries_code ON public.ministries(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_ministries_active ON public.ministries(tenant_id, is_active) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ministries_category ON public.ministries(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_ministries_leader ON public.ministries(leader_id) WHERE leader_id IS NOT NULL;

-- Ministry teams indexes
CREATE INDEX IF NOT EXISTS idx_ministry_teams_ministry ON public.ministry_teams(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_teams_member ON public.ministry_teams(member_id);
CREATE INDEX IF NOT EXISTS idx_ministry_teams_role ON public.ministry_teams(ministry_id, role);
CREATE INDEX IF NOT EXISTS idx_ministry_teams_tenant ON public.ministry_teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ministry_teams_active ON public.ministry_teams(ministry_id, status) WHERE status = 'active';

-- Ministry schedules indexes
CREATE INDEX IF NOT EXISTS idx_ministry_schedules_ministry ON public.ministry_schedules(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_schedules_tenant ON public.ministry_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ministry_schedules_type ON public.ministry_schedules(tenant_id, schedule_type);
CREATE INDEX IF NOT EXISTS idx_ministry_schedules_active ON public.ministry_schedules(tenant_id, is_active) WHERE is_active = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ministry_schedules_dates ON public.ministry_schedules(tenant_id, recurrence_start_date, recurrence_end_date);

-- Schedule occurrences indexes
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_schedule ON public.schedule_occurrences(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_tenant ON public.schedule_occurrences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_date ON public.schedule_occurrences(tenant_id, occurrence_date);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_dates ON public.schedule_occurrences(tenant_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_status ON public.schedule_occurrences(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_qr ON public.schedule_occurrences(qr_token) WHERE qr_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_occurrences_calendar ON public.schedule_occurrences(calendar_event_id) WHERE calendar_event_id IS NOT NULL;

-- Schedule team assignments indexes
CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_occurrence ON public.schedule_team_assignments(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_member ON public.schedule_team_assignments(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_tenant ON public.schedule_team_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_team_assignments_status ON public.schedule_team_assignments(occurrence_id, status);

-- Schedule registrations indexes
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_occurrence ON public.schedule_registrations(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_member ON public.schedule_registrations(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_tenant ON public.schedule_registrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_status ON public.schedule_registrations(occurrence_id, status);
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_waitlist ON public.schedule_registrations(occurrence_id, waitlist_position) WHERE status = 'waitlisted';
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_guest_email ON public.schedule_registrations(guest_email) WHERE guest_email IS NOT NULL;

-- Schedule attendance indexes
CREATE INDEX IF NOT EXISTS idx_schedule_attendance_occurrence ON public.schedule_attendance(occurrence_id);
CREATE INDEX IF NOT EXISTS idx_schedule_attendance_member ON public.schedule_attendance(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_schedule_attendance_tenant ON public.schedule_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedule_attendance_date ON public.schedule_attendance(tenant_id, checked_in_at);
CREATE INDEX IF NOT EXISTS idx_schedule_attendance_method ON public.schedule_attendance(occurrence_id, checkin_method);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ministry_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_team_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_attendance ENABLE ROW LEVEL SECURITY;

-- Ministries policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministries' AND policyname = 'ministries_tenant_isolation') THEN
        CREATE POLICY "ministries_tenant_isolation" ON public.ministries
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministries' AND policyname = 'ministries_service_role') THEN
        CREATE POLICY "ministries_service_role" ON public.ministries
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Ministry teams policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministry_teams' AND policyname = 'ministry_teams_tenant_isolation') THEN
        CREATE POLICY "ministry_teams_tenant_isolation" ON public.ministry_teams
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministry_teams' AND policyname = 'ministry_teams_service_role') THEN
        CREATE POLICY "ministry_teams_service_role" ON public.ministry_teams
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Ministry schedules policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministry_schedules' AND policyname = 'ministry_schedules_tenant_isolation') THEN
        CREATE POLICY "ministry_schedules_tenant_isolation" ON public.ministry_schedules
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ministry_schedules' AND policyname = 'ministry_schedules_service_role') THEN
        CREATE POLICY "ministry_schedules_service_role" ON public.ministry_schedules
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Schedule occurrences policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_occurrences' AND policyname = 'schedule_occurrences_tenant_isolation') THEN
        CREATE POLICY "schedule_occurrences_tenant_isolation" ON public.schedule_occurrences
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_occurrences' AND policyname = 'schedule_occurrences_service_role') THEN
        CREATE POLICY "schedule_occurrences_service_role" ON public.schedule_occurrences
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Schedule team assignments policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_team_assignments' AND policyname = 'schedule_team_assignments_tenant_isolation') THEN
        CREATE POLICY "schedule_team_assignments_tenant_isolation" ON public.schedule_team_assignments
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_team_assignments' AND policyname = 'schedule_team_assignments_service_role') THEN
        CREATE POLICY "schedule_team_assignments_service_role" ON public.schedule_team_assignments
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Schedule registrations policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_registrations' AND policyname = 'schedule_registrations_tenant_isolation') THEN
        CREATE POLICY "schedule_registrations_tenant_isolation" ON public.schedule_registrations
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_registrations' AND policyname = 'schedule_registrations_service_role') THEN
        CREATE POLICY "schedule_registrations_service_role" ON public.schedule_registrations
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Schedule attendance policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_attendance' AND policyname = 'schedule_attendance_tenant_isolation') THEN
        CREATE POLICY "schedule_attendance_tenant_isolation" ON public.schedule_attendance
            FOR ALL USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'schedule_attendance' AND policyname = 'schedule_attendance_service_role') THEN
        CREATE POLICY "schedule_attendance_service_role" ON public.schedule_attendance
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
DO $$
BEGIN
    -- Update timestamp trigger for ministries
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ministries_updated_at') THEN
        CREATE TRIGGER set_ministries_updated_at
            BEFORE UPDATE ON public.ministries
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Update timestamp trigger for ministry_teams
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ministry_teams_updated_at') THEN
        CREATE TRIGGER set_ministry_teams_updated_at
            BEFORE UPDATE ON public.ministry_teams
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Update timestamp trigger for ministry_schedules
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_ministry_schedules_updated_at') THEN
        CREATE TRIGGER set_ministry_schedules_updated_at
            BEFORE UPDATE ON public.ministry_schedules
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Update timestamp trigger for schedule_occurrences
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_schedule_occurrences_updated_at') THEN
        CREATE TRIGGER set_schedule_occurrences_updated_at
            BEFORE UPDATE ON public.schedule_occurrences
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Update timestamp trigger for schedule_team_assignments
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_schedule_team_assignments_updated_at') THEN
        CREATE TRIGGER set_schedule_team_assignments_updated_at
            BEFORE UPDATE ON public.schedule_team_assignments
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;

    -- Update timestamp trigger for schedule_registrations
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_schedule_registrations_updated_at') THEN
        CREATE TRIGGER set_schedule_registrations_updated_at
            BEFORE UPDATE ON public.schedule_registrations
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update registration counts on schedule_occurrences
CREATE OR REPLACE FUNCTION public.update_occurrence_registration_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.schedule_occurrences
        SET
            registered_count = (
                SELECT COUNT(*) FROM public.schedule_registrations
                WHERE occurrence_id = NEW.occurrence_id AND status = 'registered'
            ),
            waitlist_count = (
                SELECT COUNT(*) FROM public.schedule_registrations
                WHERE occurrence_id = NEW.occurrence_id AND status = 'waitlisted'
            )
        WHERE id = NEW.occurrence_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.schedule_occurrences
        SET
            registered_count = (
                SELECT COUNT(*) FROM public.schedule_registrations
                WHERE occurrence_id = OLD.occurrence_id AND status = 'registered'
            ),
            waitlist_count = (
                SELECT COUNT(*) FROM public.schedule_registrations
                WHERE occurrence_id = OLD.occurrence_id AND status = 'waitlisted'
            )
        WHERE id = OLD.occurrence_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update attendance counts on schedule_occurrences
CREATE OR REPLACE FUNCTION public.update_occurrence_attendance_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.schedule_occurrences
        SET checked_in_count = (
            SELECT COUNT(*) FROM public.schedule_attendance
            WHERE occurrence_id = NEW.occurrence_id
        )
        WHERE id = NEW.occurrence_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.schedule_occurrences
        SET checked_in_count = (
            SELECT COUNT(*) FROM public.schedule_attendance
            WHERE occurrence_id = OLD.occurrence_id
        )
        WHERE id = OLD.occurrence_id;
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for count updates
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_registration_counts') THEN
        CREATE TRIGGER trigger_update_registration_counts
            AFTER INSERT OR UPDATE OR DELETE ON public.schedule_registrations
            FOR EACH ROW
            EXECUTE FUNCTION public.update_occurrence_registration_counts();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_attendance_counts') THEN
        CREATE TRIGGER trigger_update_attendance_counts
            AFTER INSERT OR DELETE ON public.schedule_attendance
            FOR EACH ROW
            EXECUTE FUNCTION public.update_occurrence_attendance_counts();
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.ministries IS 'First-class ministry entities that can have teams and schedules';
COMMENT ON TABLE public.ministry_teams IS 'Team members assigned to ministries with roles';
COMMENT ON TABLE public.ministry_schedules IS 'Recurring schedule definitions for ministry events';
COMMENT ON TABLE public.schedule_occurrences IS 'Specific instances of scheduled events';
COMMENT ON TABLE public.schedule_team_assignments IS 'Team assignments per schedule occurrence';
COMMENT ON TABLE public.schedule_registrations IS 'Event registrations with custom form data';
COMMENT ON TABLE public.schedule_attendance IS 'Check-in records with QR tracking';

COMMENT ON COLUMN public.ministries.category IS 'Ministry category: worship, education, outreach, fellowship, support, general';
COMMENT ON COLUMN public.ministry_teams.role IS 'Team member role: leader, volunteer, member';
COMMENT ON COLUMN public.ministry_schedules.recurrence_rule IS 'iCal RRULE format for recurring events (e.g., FREQ=WEEKLY;BYDAY=SU)';
COMMENT ON COLUMN public.ministry_schedules.registration_form_schema IS 'JSON schema for custom registration form fields';
COMMENT ON COLUMN public.schedule_occurrences.qr_token IS 'Unique token for self-check-in QR codes';
COMMENT ON COLUMN public.schedule_attendance.checkin_method IS 'Check-in method: staff_scan (staff scans member QR), self_checkin (member scans event QR), manual';

COMMIT;

-- ============================================================================
-- FEATURE AND PERMISSIONS SETUP
-- ============================================================================
-- This section adds the scheduler feature to the feature catalog and sets up permissions

BEGIN;

-- =============================================================================
-- STEP 1: Add scheduler features to feature_catalog
-- =============================================================================
INSERT INTO feature_catalog (code, name, category, description, tier, is_active, phase)
VALUES
    ('scheduler.core', 'Ministry Scheduler', 'community', 'Manage ministry schedules, registrations, and attendance', 'essential', true, 'ga'),
    ('ministries.core', 'Ministry Management', 'community', 'Manage ministries and ministry teams', 'essential', true, 'ga')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    tier = EXCLUDED.tier,
    is_active = EXCLUDED.is_active,
    deleted_at = NULL,
    updated_at = now();

-- =============================================================================
-- STEP 2: Add permissions to feature_permissions
-- =============================================================================

-- Helper function for inserting scheduler permissions
CREATE OR REPLACE FUNCTION insert_scheduler_permission(
    p_feature_code text,
    p_permission_code text,
    p_display_name text,
    p_description text,
    p_is_required boolean DEFAULT true,
    p_display_order integer DEFAULT 0
)
RETURNS void AS $$
DECLARE
    v_feature_id uuid;
    v_category text;
    v_action text;
BEGIN
    SELECT id INTO v_feature_id
    FROM feature_catalog
    WHERE code = p_feature_code AND deleted_at IS NULL;

    IF v_feature_id IS NULL THEN
        RAISE NOTICE 'Feature not found: %', p_feature_code;
        RETURN;
    END IF;

    v_category := split_part(p_permission_code, ':', 1);
    v_action := split_part(p_permission_code, ':', 2);

    INSERT INTO feature_permissions (
        feature_id, permission_code, display_name, description,
        category, action, is_required, display_order
    )
    VALUES (
        v_feature_id, p_permission_code, p_display_name, p_description,
        v_category, v_action, p_is_required, p_display_order
    )
    ON CONFLICT (feature_id, permission_code) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        action = EXCLUDED.action,
        is_required = EXCLUDED.is_required,
        display_order = EXCLUDED.display_order,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Scheduler permissions (scheduler.core feature)
SELECT insert_scheduler_permission('scheduler.core', 'scheduler:view', 'View Scheduler', 'View scheduler dashboard and schedules', true, 1);
SELECT insert_scheduler_permission('scheduler.core', 'scheduler:manage', 'Manage Schedules', 'Create, edit, and delete schedules and occurrences', true, 2);
SELECT insert_scheduler_permission('scheduler.core', 'scheduler:attendance', 'Manage Attendance', 'Mark attendance and view attendance reports', true, 3);
SELECT insert_scheduler_permission('scheduler.core', 'registrations:view', 'View Registrations', 'View event registrations', true, 4);
SELECT insert_scheduler_permission('scheduler.core', 'registrations:manage', 'Manage Registrations', 'Approve, cancel, and manage event registrations', true, 5);

-- Ministry permissions (ministries.core feature)
SELECT insert_scheduler_permission('ministries.core', 'ministries:view', 'View Ministries', 'View ministries and ministry teams', true, 1);
SELECT insert_scheduler_permission('ministries.core', 'ministries:manage', 'Manage Ministries', 'Create, edit, and delete ministries and manage teams', true, 2);

-- Clean up helper function
DROP FUNCTION IF EXISTS insert_scheduler_permission(text, text, text, text, boolean, integer);

-- =============================================================================
-- STEP 3: Link features to product offerings (all tiers)
-- =============================================================================

-- Essential tier
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'essential'
    AND fc.code IN ('scheduler.core', 'ministries.core')
    AND fc.deleted_at IS NULL
    AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Premium tier
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'premium'
    AND fc.code IN ('scheduler.core', 'ministries.core')
    AND fc.deleted_at IS NULL
    AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Professional tier
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'professional'
    AND fc.code IN ('scheduler.core', 'ministries.core')
    AND fc.deleted_at IS NULL
    AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- Enterprise tier
INSERT INTO product_offering_features (offering_id, feature_id, is_required)
SELECT po.id, fc.id, true
FROM product_offerings po
CROSS JOIN feature_catalog fc
WHERE po.tier = 'enterprise'
    AND fc.code IN ('scheduler.core', 'ministries.core')
    AND fc.deleted_at IS NULL
    AND fc.is_active = true
ON CONFLICT DO NOTHING;

-- =============================================================================
-- STEP 4: Add permission role templates
-- =============================================================================
INSERT INTO permission_role_templates (feature_permission_id, role_key, is_recommended, reason)
SELECT
    fp.id,
    r.role_key,
    true,
    r.reason
FROM feature_permissions fp
JOIN feature_catalog fc ON fp.feature_id = fc.id
CROSS JOIN (
    VALUES
        -- Scheduler permissions
        ('scheduler:view', 'member', 'Members can view schedules'),
        ('scheduler:view', 'volunteer', 'Volunteers can view schedules'),
        ('scheduler:view', 'staff', 'Staff can view schedules'),
        ('scheduler:view', 'tenant_admin', 'Admins can view schedules'),
        ('scheduler:manage', 'staff', 'Staff can manage schedules'),
        ('scheduler:manage', 'tenant_admin', 'Admins can manage schedules'),
        ('scheduler:attendance', 'volunteer', 'Volunteers can mark attendance'),
        ('scheduler:attendance', 'staff', 'Staff can mark attendance'),
        ('scheduler:attendance', 'tenant_admin', 'Admins can mark attendance'),
        ('registrations:view', 'volunteer', 'Volunteers can view registrations'),
        ('registrations:view', 'staff', 'Staff can view registrations'),
        ('registrations:view', 'tenant_admin', 'Admins can view registrations'),
        ('registrations:manage', 'staff', 'Staff can manage registrations'),
        ('registrations:manage', 'tenant_admin', 'Admins can manage registrations'),
        -- Ministry permissions
        ('ministries:view', 'member', 'Members can view ministries'),
        ('ministries:view', 'volunteer', 'Volunteers can view ministries'),
        ('ministries:view', 'staff', 'Staff can view ministries'),
        ('ministries:view', 'tenant_admin', 'Admins can view ministries'),
        ('ministries:manage', 'staff', 'Staff can manage ministries'),
        ('ministries:manage', 'tenant_admin', 'Admins can manage ministries')
) AS r(permission_code, role_key, reason)
WHERE fp.permission_code = r.permission_code
    AND fc.deleted_at IS NULL
ON CONFLICT (feature_permission_id, role_key) DO UPDATE SET
    is_recommended = EXCLUDED.is_recommended,
    reason = EXCLUDED.reason,
    updated_at = now();

-- =============================================================================
-- STEP 5: Grant features to existing tenants
-- =============================================================================
INSERT INTO tenant_feature_grants (tenant_id, feature_id, grant_source, starts_at)
SELECT DISTINCT
    t.id,
    fc.id,
    'direct',
    CURRENT_DATE
FROM tenants t
CROSS JOIN feature_catalog fc
WHERE fc.code IN ('scheduler.core', 'ministries.core')
    AND fc.deleted_at IS NULL
    AND t.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT 1 FROM tenant_feature_grants tfg
        WHERE tfg.tenant_id = t.id
            AND tfg.feature_id = fc.id
    )
ON CONFLICT DO NOTHING;

COMMIT;

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE 'Scheduler system tables created successfully';
    RAISE NOTICE 'Features and permissions configured successfully';
END $$;
