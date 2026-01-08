-- ============================================================================
-- Goals & Objectives System
-- ============================================================================
-- This migration creates the complete goals and objectives tracking system
-- including goal categories, goals, objectives, key results, and progress updates.
-- ============================================================================

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE goal_status AS ENUM (
    'draft',
    'active',
    'on_track',
    'at_risk',
    'behind',
    'completed',
    'cancelled'
);

CREATE TYPE goal_visibility AS ENUM (
    'private',
    'leadership',
    'staff',
    'public'
);

CREATE TYPE objective_status AS ENUM (
    'pending',
    'in_progress',
    'on_track',
    'at_risk',
    'behind',
    'completed',
    'cancelled'
);

CREATE TYPE objective_priority AS ENUM (
    'low',
    'normal',
    'high',
    'urgent'
);

CREATE TYPE key_result_metric_type AS ENUM (
    'number',
    'percentage',
    'currency',
    'boolean'
);

CREATE TYPE key_result_update_frequency AS ENUM (
    'weekly',
    'biweekly',
    'monthly',
    'quarterly'
);

CREATE TYPE key_result_status AS ENUM (
    'active',
    'completed',
    'cancelled'
);

CREATE TYPE metric_link_type AS ENUM (
    'none',
    'members_total',
    'members_active',
    'members_new',
    'donations_total',
    'donations_count',
    'care_plans_active',
    'discipleship_enrolled',
    'attendance_average',
    'custom_query'
);

-- ============================================================================
-- TABLE: goal_categories
-- ============================================================================
-- Tenant-customizable goal categories with defaults seeded on tenant creation.

CREATE TABLE goal_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Core fields
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,

    -- Display
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'target',

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- System flag (prevents deletion of defaults)
    is_system BOOLEAN NOT NULL DEFAULT false,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT goal_categories_tenant_code_unique UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_goal_categories_tenant ON goal_categories(tenant_id);
CREATE INDEX idx_goal_categories_active ON goal_categories(tenant_id, is_active)
    WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: goals
-- ============================================================================
-- Church-wide strategic goals.

CREATE TABLE goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Core fields
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES goal_categories(id) ON DELETE SET NULL,

    -- Time frame
    start_date DATE,
    target_date DATE,

    -- Status
    status goal_status NOT NULL DEFAULT 'draft',

    -- Assignment
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Visibility
    visibility goal_visibility NOT NULL DEFAULT 'leadership',

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Computed progress (updated by trigger)
    overall_progress DECIMAL(5,2) DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT goals_dates_check CHECK (
        target_date IS NULL OR start_date IS NULL OR target_date >= start_date
    )
);

-- Indexes
CREATE INDEX idx_goals_tenant ON goals(tenant_id);
CREATE INDEX idx_goals_status ON goals(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_category ON goals(category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_owner ON goals(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_target_date ON goals(tenant_id, target_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_goals_visibility ON goals(tenant_id, visibility) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: objectives
-- ============================================================================
-- Ministry/department objectives linked to goals.

CREATE TABLE objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

    -- Core fields
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Assignment
    ministry_department VARCHAR(100),
    responsible_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Status & Priority
    status objective_status NOT NULL DEFAULT 'pending',
    priority objective_priority NOT NULL DEFAULT 'normal',

    -- Due date
    due_date DATE,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Computed progress (updated by trigger)
    overall_progress DECIMAL(5,2) DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_objectives_tenant ON objectives(tenant_id);
CREATE INDEX idx_objectives_goal ON objectives(goal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_objectives_status ON objectives(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_objectives_responsible ON objectives(responsible_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_objectives_due_date ON objectives(tenant_id, due_date) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLE: key_results
-- ============================================================================
-- Measurable outcomes with support for auto-linked metrics.

CREATE TABLE key_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Parent reference (either goal or objective, not both)
    goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
    objective_id UUID REFERENCES objectives(id) ON DELETE CASCADE,

    -- Core fields
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Metric configuration
    metric_type key_result_metric_type NOT NULL DEFAULT 'number',
    target_value DECIMAL(15,2) NOT NULL,
    current_value DECIMAL(15,2) NOT NULL DEFAULT 0,
    starting_value DECIMAL(15,2) DEFAULT 0,
    unit_label VARCHAR(50),

    -- Auto-link configuration
    metric_link_type metric_link_type NOT NULL DEFAULT 'none',
    metric_link_config JSONB DEFAULT '{}',
    last_auto_update_at TIMESTAMPTZ,

    -- Computed progress
    progress_percent DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN target_value = 0 THEN 0
            WHEN metric_type = 'boolean' THEN
                CASE WHEN current_value >= 1 THEN 100 ELSE 0 END
            WHEN (target_value - COALESCE(starting_value, 0)) = 0 THEN 0
            ELSE LEAST(100, GREATEST(0,
                ((current_value - COALESCE(starting_value, 0)) /
                 (target_value - COALESCE(starting_value, 0))) * 100
            ))
        END
    ) STORED,

    -- Update schedule
    update_frequency key_result_update_frequency DEFAULT 'weekly',
    last_updated_at TIMESTAMPTZ,
    next_update_due DATE,

    -- Status
    status key_result_status NOT NULL DEFAULT 'active',

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,

    -- Constraint: must have either goal_id or objective_id, not both
    CONSTRAINT key_results_parent_check CHECK (
        (goal_id IS NOT NULL AND objective_id IS NULL) OR
        (goal_id IS NULL AND objective_id IS NOT NULL)
    )
);

-- Indexes
CREATE INDEX idx_key_results_tenant ON key_results(tenant_id);
CREATE INDEX idx_key_results_goal ON key_results(goal_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_key_results_objective ON key_results(objective_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_key_results_status ON key_results(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_key_results_next_update ON key_results(tenant_id, next_update_due)
    WHERE deleted_at IS NULL AND status = 'active';
CREATE INDEX idx_key_results_metric_link ON key_results(tenant_id, metric_link_type)
    WHERE deleted_at IS NULL AND metric_link_type != 'none';

-- ============================================================================
-- TABLE: key_result_progress_updates
-- ============================================================================
-- Historical progress tracking.

CREATE TABLE key_result_progress_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_result_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,

    -- Values
    previous_value DECIMAL(15,2),
    new_value DECIMAL(15,2) NOT NULL,
    change_value DECIMAL(15,2) GENERATED ALWAYS AS (
        new_value - COALESCE(previous_value, 0)
    ) STORED,

    -- Context
    notes TEXT,
    is_auto_update BOOLEAN NOT NULL DEFAULT false,

    -- Timing
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_progress_updates_tenant ON key_result_progress_updates(tenant_id);
CREATE INDEX idx_progress_updates_key_result ON key_result_progress_updates(key_result_id);
CREATE INDEX idx_progress_updates_recorded ON key_result_progress_updates(key_result_id, recorded_at DESC);

-- ============================================================================
-- TRIGGERS: Update Timestamps
-- ============================================================================

CREATE TRIGGER set_goal_categories_updated_at
    BEFORE UPDATE ON goal_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_goals_updated_at
    BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_objectives_updated_at
    BEFORE UPDATE ON objectives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_key_results_updated_at
    BEFORE UPDATE ON key_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- FUNCTION: Calculate Next Update Due Date
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_next_update_due()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        NEW.next_update_due := CASE NEW.update_frequency
            WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
            WHEN 'biweekly' THEN CURRENT_DATE + INTERVAL '14 days'
            WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
            WHEN 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
            ELSE CURRENT_DATE + INTERVAL '7 days'
        END;
        NEW.last_updated_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_key_result_next_update
    BEFORE INSERT OR UPDATE OF current_value, update_frequency ON key_results
    FOR EACH ROW
    EXECUTE FUNCTION calculate_next_update_due();

-- ============================================================================
-- FUNCTION: Update Objective Progress
-- ============================================================================

CREATE OR REPLACE FUNCTION update_objective_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the parent objective's overall progress
    IF NEW.objective_id IS NOT NULL THEN
        UPDATE objectives
        SET overall_progress = (
            SELECT COALESCE(AVG(progress_percent), 0)
            FROM key_results
            WHERE objective_id = NEW.objective_id
              AND deleted_at IS NULL
              AND status = 'active'
        )
        WHERE id = NEW.objective_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_objective_on_kr_change
    AFTER INSERT OR UPDATE OF current_value, status, deleted_at ON key_results
    FOR EACH ROW
    EXECUTE FUNCTION update_objective_progress();

-- ============================================================================
-- FUNCTION: Update Goal Progress
-- ============================================================================

CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_goal_id UUID;
BEGIN
    -- Determine the goal_id based on which table triggered
    IF TG_TABLE_NAME = 'key_results' THEN
        v_goal_id := NEW.goal_id;
    ELSIF TG_TABLE_NAME = 'objectives' THEN
        v_goal_id := NEW.goal_id;
    END IF;

    IF v_goal_id IS NOT NULL THEN
        UPDATE goals
        SET overall_progress = (
            SELECT COALESCE(AVG(progress), 0)
            FROM (
                -- Direct key results
                SELECT progress_percent as progress
                FROM key_results
                WHERE goal_id = v_goal_id
                  AND deleted_at IS NULL
                  AND status = 'active'
                UNION ALL
                -- Objective progress
                SELECT overall_progress as progress
                FROM objectives
                WHERE goal_id = v_goal_id
                  AND deleted_at IS NULL
                  AND status NOT IN ('cancelled')
            ) combined
            WHERE progress IS NOT NULL
        )
        WHERE id = v_goal_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_goal_on_kr_change
    AFTER INSERT OR UPDATE OF current_value, status, deleted_at, goal_id ON key_results
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_progress();

CREATE TRIGGER update_goal_on_objective_change
    AFTER INSERT OR UPDATE OF overall_progress, status, deleted_at ON objectives
    FOR EACH ROW
    EXECUTE FUNCTION update_goal_progress();

-- ============================================================================
-- FUNCTION: Seed Default Goal Categories
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_default_goal_categories(p_tenant_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO goal_categories (tenant_id, name, code, description, color, icon, sort_order, is_system)
    VALUES
        (p_tenant_id, 'Spiritual Growth', 'spiritual_growth',
         'Goals related to spiritual development, discipleship, and faith formation',
         '#8b5cf6', 'heart', 1, true),
        (p_tenant_id, 'Community Outreach', 'community_outreach',
         'Goals for serving the community, missions, and evangelism',
         '#f97316', 'users', 2, true),
        (p_tenant_id, 'Financial Stewardship', 'financial_stewardship',
         'Goals for financial health, giving, and resource management',
         '#10b981', 'dollar-sign', 3, true),
        (p_tenant_id, 'Ministry Development', 'ministry_development',
         'Goals for growing and improving ministry programs',
         '#3b82f6', 'trending-up', 4, true),
        (p_tenant_id, 'Facility & Operations', 'facility_operations',
         'Goals for building, equipment, and operational improvements',
         '#6b7280', 'building', 5, true),
        (p_tenant_id, 'Communications', 'communications',
         'Goals for marketing, communications, and engagement',
         '#ec4899', 'megaphone', 6, true)
    ON CONFLICT (tenant_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE goal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_result_progress_updates ENABLE ROW LEVEL SECURITY;

-- Goal Categories Policies
CREATE POLICY "goal_categories_select" ON goal_categories
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM tenant_users
            WHERE tenant_users.tenant_id = goal_categories.tenant_id
              AND tenant_users.user_id = auth.uid()
        )
    );

CREATE POLICY "goal_categories_insert" ON goal_categories
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_permission_for_tenant(tenant_id, 'goals:create')
    );

CREATE POLICY "goal_categories_update" ON goal_categories
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND NOT is_system
        AND user_has_permission_for_tenant(tenant_id, 'goals:edit')
    );

CREATE POLICY "goal_categories_delete" ON goal_categories
    FOR DELETE TO authenticated
    USING (
        NOT is_system
        AND user_has_permission_for_tenant(tenant_id, 'goals:delete')
    );

-- Goals Policies
CREATE POLICY "goals_select" ON goals
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM tenant_users
            WHERE tenant_users.tenant_id = goals.tenant_id
              AND tenant_users.user_id = auth.uid()
        )
        AND (
            visibility = 'public'
            OR (visibility = 'staff' AND user_has_permission_for_tenant(tenant_id, 'goals:view'))
            OR (visibility = 'leadership' AND user_has_permission_for_tenant(tenant_id, 'goals:view_leadership'))
            OR (visibility = 'private' AND (
                owner_id = auth.uid()
                OR user_has_permission_for_tenant(tenant_id, 'goals:view_all')
            ))
        )
    );

CREATE POLICY "goals_insert" ON goals
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_permission_for_tenant(tenant_id, 'goals:create')
    );

CREATE POLICY "goals_update" ON goals
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            owner_id = auth.uid()
            OR user_has_permission_for_tenant(tenant_id, 'goals:edit')
        )
    );

CREATE POLICY "goals_delete" ON goals
    FOR DELETE TO authenticated
    USING (
        user_has_permission_for_tenant(tenant_id, 'goals:delete')
    );

-- Objectives Policies
CREATE POLICY "objectives_select" ON objectives
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = objectives.goal_id
              AND goals.deleted_at IS NULL
        )
    );

CREATE POLICY "objectives_insert" ON objectives
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_permission_for_tenant(tenant_id, 'objectives:manage')
        OR EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = goal_id
              AND goals.owner_id = auth.uid()
        )
    );

CREATE POLICY "objectives_update" ON objectives
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            responsible_id = auth.uid()
            OR user_has_permission_for_tenant(tenant_id, 'objectives:manage')
            OR EXISTS (
                SELECT 1 FROM goals
                WHERE goals.id = objectives.goal_id
                  AND goals.owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "objectives_delete" ON objectives
    FOR DELETE TO authenticated
    USING (
        user_has_permission_for_tenant(tenant_id, 'objectives:manage')
        OR EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = objectives.goal_id
              AND goals.owner_id = auth.uid()
        )
    );

-- Key Results Policies
CREATE POLICY "key_results_select" ON key_results
    FOR SELECT TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            (goal_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM goals WHERE goals.id = key_results.goal_id AND goals.deleted_at IS NULL
            ))
            OR
            (objective_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM objectives WHERE objectives.id = key_results.objective_id AND objectives.deleted_at IS NULL
            ))
        )
    );

CREATE POLICY "key_results_insert" ON key_results
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_permission_for_tenant(tenant_id, 'key_results:manage')
    );

CREATE POLICY "key_results_update" ON key_results
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            user_has_permission_for_tenant(tenant_id, 'key_results:manage')
            OR user_has_permission_for_tenant(tenant_id, 'key_results:record_progress')
        )
    );

CREATE POLICY "key_results_delete" ON key_results
    FOR DELETE TO authenticated
    USING (
        user_has_permission_for_tenant(tenant_id, 'key_results:manage')
    );

-- Progress Updates Policies
CREATE POLICY "progress_updates_select" ON key_result_progress_updates
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM key_results
            WHERE key_results.id = key_result_progress_updates.key_result_id
              AND key_results.deleted_at IS NULL
        )
    );

CREATE POLICY "progress_updates_insert" ON key_result_progress_updates
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_permission_for_tenant(tenant_id, 'key_results:record_progress')
    );

-- Service role bypass
CREATE POLICY "service_role_all_goal_categories" ON goal_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_goals" ON goals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_objectives" ON objectives FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_key_results" ON key_results FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_progress" ON key_result_progress_updates FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
-- Insert system-wide permissions (tenant_id = NULL means global/system permission)
-- These will be propagated to tenants by the existing propagate_permissions function

INSERT INTO permissions (tenant_id, code, name, description, module, action, scope) VALUES
    (NULL, 'goals:view', 'View Goals', 'View staff-level goals and objectives', 'planning', 'view', 'tenant'),
    (NULL, 'goals:view_leadership', 'View Leadership Goals', 'View leadership-level goals', 'planning', 'view', 'tenant'),
    (NULL, 'goals:view_all', 'View All Goals', 'View all goals including private', 'planning', 'view', 'tenant'),
    (NULL, 'goals:create', 'Create Goals', 'Create new goals', 'planning', 'create', 'tenant'),
    (NULL, 'goals:edit', 'Edit Goals', 'Edit existing goals', 'planning', 'edit', 'tenant'),
    (NULL, 'goals:delete', 'Delete Goals', 'Delete goals', 'planning', 'delete', 'tenant'),
    (NULL, 'objectives:manage', 'Manage Objectives', 'Create, edit, and delete objectives', 'planning', 'manage', 'tenant'),
    (NULL, 'key_results:manage', 'Manage Key Results', 'Create, edit, and delete key results', 'planning', 'manage', 'tenant'),
    (NULL, 'key_results:record_progress', 'Record Progress', 'Record progress updates on key results', 'planning', 'update', 'tenant')
ON CONFLICT (tenant_id, code) DO NOTHING;

-- Propagate these permissions to all existing tenants
INSERT INTO permissions (tenant_id, code, name, description, module, action, scope, created_by, updated_by)
SELECT
    t.id,
    p.code,
    p.name,
    p.description,
    p.module,
    p.action,
    p.scope,
    (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1),
    (SELECT user_id FROM tenant_users tu WHERE tu.tenant_id = t.id LIMIT 1)
FROM tenants t
CROSS JOIN permissions p
WHERE p.tenant_id IS NULL
  AND p.code IN (
    'goals:view', 'goals:view_leadership', 'goals:view_all',
    'goals:create', 'goals:edit', 'goals:delete',
    'objectives:manage', 'key_results:manage', 'key_results:record_progress'
  )
ON CONFLICT (tenant_id, code) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE goal_categories IS 'Tenant-customizable goal categories';
COMMENT ON TABLE goals IS 'Church-wide strategic goals';
COMMENT ON TABLE objectives IS 'Ministry/department objectives linked to goals';
COMMENT ON TABLE key_results IS 'Measurable outcomes with optional auto-linked metrics';
COMMENT ON TABLE key_result_progress_updates IS 'Historical progress tracking for key results';

COMMENT ON COLUMN key_results.metric_link_type IS 'Type of system metric to auto-link (none for manual tracking)';
COMMENT ON COLUMN key_results.metric_link_config IS 'Configuration for auto-linked metrics (date ranges, custom queries)';
COMMENT ON COLUMN key_results.progress_percent IS 'Computed progress percentage based on current/target values';

-- ============================================================================
-- CALENDAR INTEGRATION
-- ============================================================================
-- Goals and objectives can be synced to the planning calendar as milestones.
-- The calendar_events table already supports source_type and source_id for linking.
--
-- Integration pattern:
-- - Goals with target_date create calendar events with:
--   - source_type = 'goals'
--   - source_id = goal.id
--   - event_type = 'goal_milestone'
--
-- - Objectives with due_date create calendar events with:
--   - source_type = 'objectives'
--   - source_id = objective.id
--   - event_type = 'goal_milestone'
--
-- - Key results with next_update_due can create reminder events with:
--   - source_type = 'key_results'
--   - source_id = key_result.id
--   - event_type = 'goal_reminder'

-- Add goal_milestone and goal_reminder to the allowed event types comment
COMMENT ON COLUMN public.calendar_events.event_type IS 'Event type: care_plan, discipleship, meeting, service, event, reminder, general, goal_milestone, goal_reminder';

-- ============================================================================
-- FUNCTION: Sync Goal to Calendar
-- ============================================================================
-- Creates or updates calendar events for a goal's target date

CREATE OR REPLACE FUNCTION sync_goal_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
BEGIN
    -- Only process if target_date is set and goal is active
    IF NEW.target_date IS NOT NULL AND NEW.status NOT IN ('cancelled', 'completed') AND NEW.deleted_at IS NULL THEN
        -- Get or create a goals category for calendar
        SELECT id INTO v_category_id
        FROM calendar_categories
        WHERE tenant_id = NEW.tenant_id AND code = 'goals'
        LIMIT 1;

        -- If no goals category exists, create one
        IF v_category_id IS NULL THEN
            INSERT INTO calendar_categories (tenant_id, name, code, description, color, icon, is_system)
            VALUES (NEW.tenant_id, 'Goals & Objectives', 'goals', 'Goal milestones and deadlines', '#8b5cf6', 'target', true)
            RETURNING id INTO v_category_id;
        END IF;

        -- Upsert calendar event for the goal
        INSERT INTO calendar_events (
            tenant_id,
            title,
            description,
            start_at,
            all_day,
            category_id,
            event_type,
            status,
            priority,
            source_type,
            source_id,
            visibility,
            created_by
        )
        VALUES (
            NEW.tenant_id,
            'Goal Due: ' || NEW.title,
            NEW.description,
            NEW.target_date::timestamptz,
            true,
            v_category_id,
            'goal_milestone',
            CASE WHEN NEW.status IN ('at_risk', 'behind') THEN 'scheduled' ELSE 'scheduled' END,
            CASE WHEN NEW.status = 'behind' THEN 'urgent' WHEN NEW.status = 'at_risk' THEN 'high' ELSE 'normal' END,
            'goals',
            NEW.id,
            CASE NEW.visibility
                WHEN 'public' THEN 'public'
                WHEN 'staff' THEN 'team'
                ELSE 'private'
            END,
            NEW.created_by
        )
        ON CONFLICT (source_type, source_id) WHERE source_type = 'goals'
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            start_at = EXCLUDED.start_at,
            priority = EXCLUDED.priority,
            visibility = EXCLUDED.visibility,
            updated_at = now();
    ELSIF NEW.deleted_at IS NOT NULL OR NEW.status IN ('cancelled', 'completed') THEN
        -- Remove calendar event if goal is deleted, cancelled or completed
        UPDATE calendar_events
        SET deleted_at = now(), is_active = false
        WHERE source_type = 'goals' AND source_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create unique partial index for calendar event source linking
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_source_unique
ON calendar_events(source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER sync_goal_calendar_event
    AFTER INSERT OR UPDATE OF target_date, title, description, status, visibility, deleted_at ON goals
    FOR EACH ROW
    EXECUTE FUNCTION sync_goal_to_calendar();

-- ============================================================================
-- FUNCTION: Sync Objective to Calendar
-- ============================================================================
-- Creates or updates calendar events for an objective's due date

CREATE OR REPLACE FUNCTION sync_objective_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
    v_goal_title TEXT;
BEGIN
    -- Only process if due_date is set and objective is active
    IF NEW.due_date IS NOT NULL AND NEW.status NOT IN ('cancelled', 'completed') AND NEW.deleted_at IS NULL THEN
        -- Get goal title for context
        SELECT title INTO v_goal_title FROM goals WHERE id = NEW.goal_id;

        -- Get or create a goals category for calendar
        SELECT id INTO v_category_id
        FROM calendar_categories
        WHERE tenant_id = NEW.tenant_id AND code = 'goals'
        LIMIT 1;

        -- If no goals category exists, create one
        IF v_category_id IS NULL THEN
            INSERT INTO calendar_categories (tenant_id, name, code, description, color, icon, is_system)
            VALUES (NEW.tenant_id, 'Goals & Objectives', 'goals', 'Goal milestones and deadlines', '#8b5cf6', 'target', true)
            RETURNING id INTO v_category_id;
        END IF;

        -- Upsert calendar event for the objective
        INSERT INTO calendar_events (
            tenant_id,
            title,
            description,
            start_at,
            all_day,
            category_id,
            event_type,
            status,
            priority,
            source_type,
            source_id,
            assigned_to,
            visibility,
            created_by
        )
        VALUES (
            NEW.tenant_id,
            'Objective Due: ' || NEW.title,
            COALESCE(NEW.description, '') || E'\n\nGoal: ' || COALESCE(v_goal_title, 'Unknown'),
            NEW.due_date::timestamptz,
            true,
            v_category_id,
            'goal_milestone',
            'scheduled',
            CASE NEW.priority
                WHEN 'urgent' THEN 'urgent'
                WHEN 'high' THEN 'high'
                ELSE 'normal'
            END,
            'objectives',
            NEW.id,
            NEW.responsible_id,
            'team',
            NEW.created_by
        )
        ON CONFLICT (source_type, source_id) WHERE source_type = 'objectives'
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            start_at = EXCLUDED.start_at,
            priority = EXCLUDED.priority,
            assigned_to = EXCLUDED.assigned_to,
            updated_at = now();
    ELSIF NEW.deleted_at IS NOT NULL OR NEW.status IN ('cancelled', 'completed') THEN
        -- Remove calendar event if objective is deleted, cancelled or completed
        UPDATE calendar_events
        SET deleted_at = now(), is_active = false
        WHERE source_type = 'objectives' AND source_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_objective_calendar_event
    AFTER INSERT OR UPDATE OF due_date, title, description, status, priority, responsible_id, deleted_at ON objectives
    FOR EACH ROW
    EXECUTE FUNCTION sync_objective_to_calendar();

-- ============================================================================
-- FUNCTION: Sync Key Result Update Reminder to Calendar
-- ============================================================================
-- Creates calendar reminder events for key result updates that are due

CREATE OR REPLACE FUNCTION sync_key_result_reminder_to_calendar()
RETURNS TRIGGER AS $$
DECLARE
    v_category_id UUID;
    v_parent_title TEXT;
BEGIN
    -- Only process if next_update_due is set and key result is active
    IF NEW.next_update_due IS NOT NULL AND NEW.status = 'active' AND NEW.deleted_at IS NULL THEN
        -- Get parent title (goal or objective)
        IF NEW.goal_id IS NOT NULL THEN
            SELECT 'Goal: ' || title INTO v_parent_title FROM goals WHERE id = NEW.goal_id;
        ELSE
            SELECT 'Objective: ' || title INTO v_parent_title FROM objectives WHERE id = NEW.objective_id;
        END IF;

        -- Get or create a goals category for calendar
        SELECT id INTO v_category_id
        FROM calendar_categories
        WHERE tenant_id = NEW.tenant_id AND code = 'goals'
        LIMIT 1;

        -- If no goals category exists, create one
        IF v_category_id IS NULL THEN
            INSERT INTO calendar_categories (tenant_id, name, code, description, color, icon, is_system)
            VALUES (NEW.tenant_id, 'Goals & Objectives', 'goals', 'Goal milestones and deadlines', '#8b5cf6', 'target', true)
            RETURNING id INTO v_category_id;
        END IF;

        -- Upsert calendar event for the key result reminder
        INSERT INTO calendar_events (
            tenant_id,
            title,
            description,
            start_at,
            all_day,
            category_id,
            event_type,
            status,
            priority,
            source_type,
            source_id,
            visibility,
            created_by
        )
        VALUES (
            NEW.tenant_id,
            'Update Due: ' || NEW.title,
            'Progress update needed for key result.' || E'\n\n' || COALESCE(v_parent_title, '') ||
            E'\n\nCurrent: ' || NEW.current_value || ' / Target: ' || NEW.target_value ||
            CASE WHEN NEW.unit_label IS NOT NULL THEN ' ' || NEW.unit_label ELSE '' END,
            NEW.next_update_due::timestamptz,
            true,
            v_category_id,
            'goal_reminder',
            'scheduled',
            'normal',
            'key_results',
            NEW.id,
            'team',
            NEW.created_by
        )
        ON CONFLICT (source_type, source_id) WHERE source_type = 'key_results'
        DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            start_at = EXCLUDED.start_at,
            updated_at = now();
    ELSIF NEW.deleted_at IS NOT NULL OR NEW.status IN ('cancelled', 'completed') THEN
        -- Remove calendar event if key result is deleted, cancelled or completed
        UPDATE calendar_events
        SET deleted_at = now(), is_active = false
        WHERE source_type = 'key_results' AND source_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_key_result_calendar_reminder
    AFTER INSERT OR UPDATE OF next_update_due, title, status, current_value, target_value, deleted_at ON key_results
    FOR EACH ROW
    EXECUTE FUNCTION sync_key_result_reminder_to_calendar();
