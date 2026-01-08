-- ============================================================================
-- Fix Calendar Sync ON CONFLICT Constraints
-- ============================================================================
-- This migration fixes the ON CONFLICT specifications in the calendar sync
-- triggers for goals, objectives, and key results.
--
-- The issue: ON CONFLICT clauses specified conditions like
-- "WHERE source_type = 'goals'" but the unique index had a different condition
-- ("WHERE source_type IS NOT NULL AND source_id IS NOT NULL AND deleted_at IS NULL")
-- ============================================================================

-- Drop the old partial index
DROP INDEX IF EXISTS idx_calendar_events_source_unique;

-- Create separate unique indexes for each source type to support ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_source_goals
ON calendar_events(source_type, source_id)
WHERE source_type = 'goals' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_source_objectives
ON calendar_events(source_type, source_id)
WHERE source_type = 'objectives' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_source_key_results
ON calendar_events(source_type, source_id)
WHERE source_type = 'key_results' AND deleted_at IS NULL;

-- Recreate the sync functions with corrected ON CONFLICT clauses

-- ============================================================================
-- FUNCTION: Sync Goal to Calendar (Fixed)
-- ============================================================================
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
        ON CONFLICT (source_type, source_id) WHERE source_type = 'goals' AND deleted_at IS NULL
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

-- ============================================================================
-- FUNCTION: Sync Objective to Calendar (Fixed)
-- ============================================================================
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
        ON CONFLICT (source_type, source_id) WHERE source_type = 'objectives' AND deleted_at IS NULL
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

-- ============================================================================
-- FUNCTION: Sync Key Result Update Reminder to Calendar (Fixed)
-- ============================================================================
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
        ON CONFLICT (source_type, source_id) WHERE source_type = 'key_results' AND deleted_at IS NULL
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
