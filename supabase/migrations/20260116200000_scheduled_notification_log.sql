-- ============================================================================
-- SCHEDULED NOTIFICATION LOG TABLE
-- ============================================================================
-- Tracks sent scheduled notifications (birthdays, anniversaries, reminders)
-- to prevent duplicate notifications being sent.
--
-- Key features:
-- - Prevents double-sending via unique constraints
-- - Tracks notification type and target date
-- - Supports tenant isolation via RLS
-- - Logs processing results for debugging
-- ============================================================================

-- ============================================================================
-- SCHEDULED NOTIFICATION LOG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scheduled_notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- Notification type
    notification_type TEXT NOT NULL, -- 'birthday', 'anniversary', 'calendar_reminder'

    -- Target entity
    target_entity_type TEXT NOT NULL, -- 'member', 'calendar_event', 'calendar_reminder'
    target_entity_id UUID NOT NULL, -- ID of the member, event, or reminder

    -- The date this notification was for (e.g., birthday date, event date)
    target_date DATE NOT NULL,

    -- Processing info
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'skipped'
    error_message TEXT,
    channels_used TEXT[] DEFAULT '{}', -- ['email', 'in_app', etc.]

    -- Recipient info (denormalized for logging)
    recipient_user_id UUID,
    recipient_email TEXT,
    recipient_name TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate sends for same entity/date/type
    UNIQUE(tenant_id, notification_type, target_entity_type, target_entity_id, target_date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- Main query patterns
CREATE INDEX IF NOT EXISTS idx_scheduled_notification_log_tenant
    ON public.scheduled_notification_log(tenant_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_notification_log_type_date
    ON public.scheduled_notification_log(tenant_id, notification_type, target_date);

CREATE INDEX IF NOT EXISTS idx_scheduled_notification_log_entity
    ON public.scheduled_notification_log(target_entity_type, target_entity_id);

-- For cleanup of old records
CREATE INDEX IF NOT EXISTS idx_scheduled_notification_log_sent_at
    ON public.scheduled_notification_log(sent_at);

-- For finding failed notifications to retry
CREATE INDEX IF NOT EXISTS idx_scheduled_notification_log_failed
    ON public.scheduled_notification_log(status, sent_at)
    WHERE status = 'failed';

-- ============================================================================
-- SCHEDULED JOB RUN LOG TABLE
-- ============================================================================
-- Tracks each execution of the scheduled job for monitoring
CREATE TABLE IF NOT EXISTS public.scheduled_job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Job identification
    job_type TEXT NOT NULL, -- 'daily_notifications', 'queue_processor', etc.

    -- Execution timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Results summary
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'partial'
    tenants_processed INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    notifications_skipped INTEGER DEFAULT 0,
    notifications_failed INTEGER DEFAULT 0,

    -- Details
    error_message TEXT,
    details JSONB DEFAULT '{}',

    -- Source tracking
    triggered_by TEXT, -- 'cron', 'manual', 'api'
    source_ip TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR JOB RUNS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_type
    ON public.scheduled_job_runs(job_type);

CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_started
    ON public.scheduled_job_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_status
    ON public.scheduled_job_runs(status, started_at)
    WHERE status IN ('running', 'failed');

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.scheduled_notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_job_runs ENABLE ROW LEVEL SECURITY;

-- Scheduled notification log policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_notification_log' AND policyname = 'scheduled_notification_log_tenant_isolation') THEN
        CREATE POLICY "scheduled_notification_log_tenant_isolation" ON public.scheduled_notification_log
            FOR SELECT USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_notification_log' AND policyname = 'scheduled_notification_log_service_role') THEN
        CREATE POLICY "scheduled_notification_log_service_role" ON public.scheduled_notification_log
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Job runs policies (system table - service role only for writes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_job_runs' AND policyname = 'scheduled_job_runs_read_all') THEN
        CREATE POLICY "scheduled_job_runs_read_all" ON public.scheduled_job_runs
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scheduled_job_runs' AND policyname = 'scheduled_job_runs_service_role') THEN
        CREATE POLICY "scheduled_job_runs_service_role" ON public.scheduled_job_runs
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTION: Check if notification was already sent
-- ============================================================================
CREATE OR REPLACE FUNCTION public.was_notification_sent(
    p_tenant_id UUID,
    p_notification_type TEXT,
    p_target_entity_type TEXT,
    p_target_entity_id UUID,
    p_target_date DATE
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.scheduled_notification_log
        WHERE tenant_id = p_tenant_id
          AND notification_type = p_notification_type
          AND target_entity_type = p_target_entity_type
          AND target_entity_id = p_target_entity_id
          AND target_date = p_target_date
          AND status = 'sent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get members with birthdays today
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_members_with_birthday_today(p_tenant_id UUID)
RETURNS TABLE(
    member_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    contact_number TEXT,
    user_id UUID,
    birthday DATE,
    profile_picture_url TEXT,
    age INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS member_id,
        m.first_name,
        m.last_name,
        m.email,
        m.contact_number,
        m.user_id,
        m.birthday::DATE,
        m.profile_picture_url,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - EXTRACT(YEAR FROM m.birthday)::INTEGER AS age
    FROM public.members m
    WHERE m.tenant_id = p_tenant_id
      AND m.deleted_at IS NULL
      AND m.birthday IS NOT NULL
      AND EXTRACT(MONTH FROM m.birthday) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM m.birthday) = EXTRACT(DAY FROM CURRENT_DATE)
      AND NOT public.was_notification_sent(
          p_tenant_id,
          'birthday',
          'member',
          m.id,
          CURRENT_DATE
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get members with anniversaries today
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_members_with_anniversary_today(p_tenant_id UUID)
RETURNS TABLE(
    member_id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    contact_number TEXT,
    user_id UUID,
    anniversary DATE,
    years INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS member_id,
        m.first_name,
        m.last_name,
        m.email,
        m.contact_number,
        m.user_id,
        m.anniversary::DATE,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - EXTRACT(YEAR FROM m.anniversary)::INTEGER AS years
    FROM public.members m
    WHERE m.tenant_id = p_tenant_id
      AND m.deleted_at IS NULL
      AND m.anniversary IS NOT NULL
      AND EXTRACT(MONTH FROM m.anniversary) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(DAY FROM m.anniversary) = EXTRACT(DAY FROM CURRENT_DATE)
      AND NOT public.was_notification_sent(
          p_tenant_id,
          'anniversary',
          'member',
          m.id,
          CURRENT_DATE
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get pending calendar reminders
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_pending_calendar_reminders(p_tenant_id UUID)
RETURNS TABLE(
    reminder_id UUID,
    event_id UUID,
    event_title TEXT,
    event_start_at TIMESTAMPTZ,
    remind_at TIMESTAMPTZ,
    recipient_id UUID,
    notification_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id AS reminder_id,
        r.event_id,
        e.title AS event_title,
        e.start_at AS event_start_at,
        r.remind_at,
        r.recipient_id,
        r.notification_type
    FROM public.calendar_event_reminders r
    JOIN public.calendar_events e ON r.event_id = e.id
    WHERE r.tenant_id = p_tenant_id
      AND r.is_sent = FALSE
      AND r.remind_at <= NOW()
      AND e.is_active = TRUE
      AND e.deleted_at IS NULL
      AND e.status NOT IN ('cancelled', 'completed');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CLEANUP FUNCTION: Remove old notification logs (keep 90 days)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    WITH deleted AS (
        DELETE FROM public.scheduled_notification_log
        WHERE sent_at < NOW() - INTERVAL '90 days'
        RETURNING id
    )
    SELECT COUNT(*) INTO deleted_count FROM deleted;

    -- Also clean up old job runs (keep 30 days)
    DELETE FROM public.scheduled_job_runs
    WHERE created_at < NOW() - INTERVAL '30 days';

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.scheduled_notification_log IS 'Tracks sent scheduled notifications to prevent duplicates';
COMMENT ON TABLE public.scheduled_job_runs IS 'Tracks execution history of scheduled jobs';
COMMENT ON FUNCTION public.was_notification_sent IS 'Check if a notification was already sent for given entity/date';
COMMENT ON FUNCTION public.get_members_with_birthday_today IS 'Get members with birthdays today who have not yet received notification';
COMMENT ON FUNCTION public.get_members_with_anniversary_today IS 'Get members with anniversaries today who have not yet received notification';
COMMENT ON FUNCTION public.get_pending_calendar_reminders IS 'Get calendar reminders that are due and not yet sent';
COMMENT ON FUNCTION public.cleanup_old_notification_logs IS 'Remove notification logs older than 90 days';

-- ============================================================================
-- SUCCESS CONFIRMATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Scheduled notification log tables and helper functions created successfully';
END $$;
