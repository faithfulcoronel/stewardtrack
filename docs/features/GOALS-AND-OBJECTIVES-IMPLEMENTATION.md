# Goals & Objectives Feature - Implementation Document

## Executive Summary

The Goals & Objectives module enables churches to set strategic goals, track ministry objectives, and measure key results with progress updates. This document details the complete technical implementation including database schema, API design, service architecture, and UI components.

**Key Capabilities:**
- Church-wide strategic goal setting with customizable categories
- Ministry/department objective tracking linked to parent goals
- Key results with measurable metrics (manual and auto-linked)
- Progress tracking with historical updates and visualizations
- Full notification system (email, in-app, push)
- Calendar integration for milestone tracking

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Data Models](#3-data-models)
4. [Service Layer](#4-service-layer)
5. [API Endpoints](#5-api-endpoints)
6. [UI Components](#6-ui-components)
7. [Auto-Linked Metrics](#7-auto-linked-metrics)
8. [Notification System](#8-notification-system)
9. [Calendar Integration](#9-calendar-integration)
10. [Security & Permissions](#10-security--permissions)
11. [Implementation Phases](#11-implementation-phases)
12. [File Structure](#12-file-structure)

---

## 1. Architecture Overview

### System Context

```
┌─────────────────────────────────────────────────────────────────┐
│                        Goals & Objectives Module                 │
├─────────────────────────────────────────────────────────────────┤
│  UI Layer                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │  Dashboard   │ │  List View   │ │ Detail View  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │Create Wizard │ │Progress Dlg  │ │Category Mgr  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  API Layer (Next.js Route Handlers)                              │
│  /api/community/planning/goals/*                                 │
├─────────────────────────────────────────────────────────────────┤
│  Service Layer (InversifyJS DI)                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │GoalsService  │ │CategorySvc   │ │MetricsSvc    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
├─────────────────────────────────────────────────────────────────┤
│  Repository Layer                                                │
│  Goal | Objective | KeyResult | ProgressUpdate | Category        │
├─────────────────────────────────────────────────────────────────┤
│  Adapter Layer (Supabase Client)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Database (PostgreSQL + RLS)                                     │
│  goal_categories | goals | objectives | key_results | progress   │
└─────────────────────────────────────────────────────────────────┘
```

### Integration Points

| System | Integration |
|--------|-------------|
| Planning Calendar | Goal milestones synced as calendar events |
| Notification Bus | Update reminders, status alerts, assignments |
| Members Module | Auto-linked member count metrics |
| Finance Module | Auto-linked donation metrics |
| RBAC System | Permission-based visibility and access |

---

## 2. Database Schema

### 2.1 Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│ goal_categories │       │     tenants     │
│─────────────────│       │─────────────────│
│ id (PK)         │       │ id (PK)         │
│ tenant_id (FK)  │───────│                 │
│ name            │       └─────────────────┘
│ code            │              │
│ description     │              │
│ color           │              │
│ icon            │              │
│ sort_order      │              │
│ is_system       │              │
└────────┬────────┘              │
         │                       │
         │ category_id           │ tenant_id
         ▼                       ▼
┌─────────────────────────────────────────────┐
│                   goals                      │
│─────────────────────────────────────────────│
│ id (PK)                                      │
│ tenant_id (FK)                               │
│ category_id (FK)                             │
│ title, description                           │
│ start_date, target_date                      │
│ status, visibility                           │
│ owner_id (FK → auth.users)                   │
│ tags[], metadata                             │
└──────────────────┬──────────────────────────┘
                   │
                   │ goal_id
                   ▼
┌─────────────────────────────────────────────┐
│                objectives                    │
│─────────────────────────────────────────────│
│ id (PK)                                      │
│ tenant_id (FK)                               │
│ goal_id (FK)                                 │
│ title, description                           │
│ ministry_department                          │
│ responsible_id (FK → auth.users)             │
│ status, priority, due_date                   │
│ sort_order                                   │
└──────────────────┬──────────────────────────┘
                   │
                   │ goal_id OR objective_id
                   ▼
┌─────────────────────────────────────────────┐
│               key_results                    │
│─────────────────────────────────────────────│
│ id (PK)                                      │
│ tenant_id (FK)                               │
│ goal_id (FK, nullable)                       │
│ objective_id (FK, nullable)                  │
│ title, description                           │
│ metric_type, target_value, current_value     │
│ starting_value, unit_label                   │
│ progress_percent (computed)                  │
│ update_frequency                             │
│ metric_link_type, metric_link_config         │
│ status, sort_order                           │
└──────────────────┬──────────────────────────┘
                   │
                   │ key_result_id
                   ▼
┌─────────────────────────────────────────────┐
│       key_result_progress_updates            │
│─────────────────────────────────────────────│
│ id (PK)                                      │
│ tenant_id (FK)                               │
│ key_result_id (FK)                           │
│ previous_value, new_value                    │
│ change_value (computed)                      │
│ notes                                        │
│ recorded_at                                  │
└─────────────────────────────────────────────┘
```

### 2.2 Table Definitions

#### `goal_categories`

Tenant-customizable goal categories with defaults seeded on tenant creation.

```sql
CREATE TABLE goal_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Core fields
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,

    -- Display
    color VARCHAR(7) NOT NULL DEFAULT '#6366f1', -- Hex color
    icon VARCHAR(50) DEFAULT 'target',            -- Lucide icon name

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
    CONSTRAINT goal_categories_tenant_code_unique
        UNIQUE (tenant_id, code)
);

-- Indexes
CREATE INDEX idx_goal_categories_tenant ON goal_categories(tenant_id);
CREATE INDEX idx_goal_categories_active ON goal_categories(tenant_id, is_active)
    WHERE deleted_at IS NULL;
```

#### `goals`

Church-wide strategic goals.

```sql
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
    'private',      -- Owner only
    'leadership',   -- Leadership team
    'staff',        -- All staff
    'public'        -- Everyone including members
);

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
```

#### `objectives`

Ministry/department objectives linked to goals.

```sql
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
```

#### `key_results`

Measurable outcomes with support for auto-linked metrics.

```sql
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
    unit_label VARCHAR(50), -- e.g., "members", "%", "$", "services"

    -- Auto-link configuration
    metric_link_type metric_link_type NOT NULL DEFAULT 'none',
    metric_link_config JSONB DEFAULT '{}', -- Additional config for custom queries
    last_auto_update_at TIMESTAMPTZ,

    -- Computed progress
    progress_percent DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE
            WHEN target_value = 0 THEN 0
            WHEN metric_type = 'boolean' THEN
                CASE WHEN current_value >= 1 THEN 100 ELSE 0 END
            ELSE LEAST(100, GREATEST(0,
                ((current_value - COALESCE(starting_value, 0)) /
                 NULLIF(target_value - COALESCE(starting_value, 0), 0)) * 100
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
```

#### `key_result_progress_updates`

Historical progress tracking.

```sql
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
    is_auto_update BOOLEAN NOT NULL DEFAULT false, -- True if from auto-linked metric

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
```

### 2.3 Triggers and Functions

#### Update Timestamps

```sql
-- Reuse existing update_updated_at function or create if not exists
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
```

#### Calculate Next Update Due Date

```sql
CREATE OR REPLACE FUNCTION calculate_next_update_due()
RETURNS TRIGGER AS $$
BEGIN
    NEW.next_update_due := CASE NEW.update_frequency
        WHEN 'weekly' THEN CURRENT_DATE + INTERVAL '7 days'
        WHEN 'biweekly' THEN CURRENT_DATE + INTERVAL '14 days'
        WHEN 'monthly' THEN CURRENT_DATE + INTERVAL '1 month'
        WHEN 'quarterly' THEN CURRENT_DATE + INTERVAL '3 months'
        ELSE CURRENT_DATE + INTERVAL '7 days'
    END;
    NEW.last_updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_key_result_next_update
    BEFORE INSERT OR UPDATE OF current_value ON key_results
    FOR EACH ROW
    WHEN (NEW.status = 'active')
    EXECUTE FUNCTION calculate_next_update_due();
```

#### Update Goal/Objective Progress

```sql
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

CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_goal_id UUID;
BEGIN
    -- Determine the goal_id
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
```

### 2.4 RLS Policies

```sql
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
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:create')
    );

CREATE POLICY "goal_categories_update" ON goal_categories
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND NOT is_system
        AND user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:edit')
    );

CREATE POLICY "goal_categories_delete" ON goal_categories
    FOR DELETE TO authenticated
    USING (
        NOT is_system
        AND user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:delete')
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
            OR (visibility = 'staff' AND user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:view'))
            OR (visibility = 'leadership' AND user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:view_leadership'))
            OR (visibility = 'private' AND (
                owner_id = auth.uid()
                OR user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:view_all')
            ))
        )
    );

CREATE POLICY "goals_insert" ON goals
    FOR INSERT TO authenticated
    WITH CHECK (
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:create')
    );

CREATE POLICY "goals_update" ON goals
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND (
            owner_id = auth.uid()
            OR user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:edit')
        )
    );

CREATE POLICY "goals_delete" ON goals
    FOR DELETE TO authenticated
    USING (
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'goals:delete')
    );

-- Objectives Policies (inherit from goal visibility)
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
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'objectives:manage')
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
            OR user_has_permission_for_tenant(auth.uid(), tenant_id, 'objectives:manage')
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
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'objectives:manage')
        OR EXISTS (
            SELECT 1 FROM goals
            WHERE goals.id = objectives.goal_id
              AND goals.owner_id = auth.uid()
        )
    );

-- Key Results Policies (inherit from parent)
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
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'key_results:manage')
    );

CREATE POLICY "key_results_update" ON key_results
    FOR UPDATE TO authenticated
    USING (
        deleted_at IS NULL
        AND user_has_permission_for_tenant(auth.uid(), tenant_id, 'key_results:manage')
    );

CREATE POLICY "key_results_delete" ON key_results
    FOR DELETE TO authenticated
    USING (
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'key_results:manage')
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
        user_has_permission_for_tenant(auth.uid(), tenant_id, 'key_results:record_progress')
    );

-- Service role bypass
CREATE POLICY "service_role_all_goal_categories" ON goal_categories FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_goals" ON goals FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_objectives" ON objectives FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_key_results" ON key_results FOR ALL TO service_role USING (true);
CREATE POLICY "service_role_all_progress" ON key_result_progress_updates FOR ALL TO service_role USING (true);
```

### 2.5 Seed Data - Default Categories

```sql
-- Function to seed default categories for a tenant
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
```

### 2.6 New Permissions

```sql
-- Insert new permissions for Goals module
INSERT INTO permissions (name, description, module, is_system) VALUES
    ('goals:view', 'View staff-level goals and objectives', 'planning', true),
    ('goals:view_leadership', 'View leadership-level goals', 'planning', true),
    ('goals:view_all', 'View all goals including private', 'planning', true),
    ('goals:create', 'Create new goals', 'planning', true),
    ('goals:edit', 'Edit existing goals', 'planning', true),
    ('goals:delete', 'Delete goals', 'planning', true),
    ('objectives:manage', 'Create, edit, and delete objectives', 'planning', true),
    ('key_results:manage', 'Create, edit, and delete key results', 'planning', true),
    ('key_results:record_progress', 'Record progress updates on key results', 'planning', true)
ON CONFLICT (name) DO NOTHING;

-- Assign default permissions to roles
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.metadata_key = 'tenant_admin'
  AND p.name LIKE 'goals:%' OR p.name LIKE 'objectives:%' OR p.name LIKE 'key_results:%'
ON CONFLICT DO NOTHING;

-- Staff gets view and record progress
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.metadata_key = 'staff'
  AND p.name IN ('goals:view', 'key_results:record_progress')
ON CONFLICT DO NOTHING;
```

---

## 3. Data Models

### 3.1 TypeScript Interfaces

#### `goal.model.ts`

```typescript
// Goal Categories
export interface GoalCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description?: string | null;
  color: string;
  icon: string;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface GoalCategoryCreateInput {
  name: string;
  code?: string; // Auto-generated from name if not provided
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}

export interface GoalCategoryUpdateInput extends Partial<GoalCategoryCreateInput> {}

// Goals
export type GoalStatus =
  | 'draft'
  | 'active'
  | 'on_track'
  | 'at_risk'
  | 'behind'
  | 'completed'
  | 'cancelled';

export type GoalVisibility = 'private' | 'leadership' | 'staff' | 'public';

export interface Goal {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  category_id?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  status: GoalStatus;
  owner_id?: string | null;
  visibility: GoalVisibility;
  tags: string[];
  metadata: Record<string, unknown>;
  overall_progress: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;

  // Enriched fields
  category?: GoalCategory | null;
  owner_name?: string | null;
  owner_email?: string | null;
  objectives_count?: number;
  key_results_count?: number;
}

export interface GoalWithDetails extends Goal {
  objectives: ObjectiveWithKeyResults[];
  direct_key_results: KeyResult[];
}

export interface GoalCreateInput {
  title: string;
  description?: string;
  category_id?: string;
  start_date?: string;
  target_date?: string;
  status?: GoalStatus;
  owner_id?: string;
  visibility?: GoalVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface GoalUpdateInput extends Partial<GoalCreateInput> {}

export interface GoalFilters {
  category_id?: string;
  status?: GoalStatus | GoalStatus[];
  visibility?: GoalVisibility;
  owner_id?: string;
  search?: string;
  start_date_from?: string;
  start_date_to?: string;
  target_date_from?: string;
  target_date_to?: string;
  tags?: string[];
}

export interface GoalQueryOptions {
  limit?: number;
  offset?: number;
  sort_by?: 'title' | 'target_date' | 'overall_progress' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
  include_objectives?: boolean;
  include_key_results?: boolean;
}
```

#### `objective.model.ts`

```typescript
export type ObjectiveStatus =
  | 'pending'
  | 'in_progress'
  | 'on_track'
  | 'at_risk'
  | 'behind'
  | 'completed'
  | 'cancelled';

export type ObjectivePriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Objective {
  id: string;
  tenant_id: string;
  goal_id: string;
  title: string;
  description?: string | null;
  ministry_department?: string | null;
  responsible_id?: string | null;
  status: ObjectiveStatus;
  priority: ObjectivePriority;
  due_date?: string | null;
  sort_order: number;
  overall_progress: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;

  // Enriched fields
  responsible_name?: string | null;
  responsible_email?: string | null;
  key_results_count?: number;
}

export interface ObjectiveWithKeyResults extends Objective {
  key_results: KeyResult[];
}

export interface ObjectiveCreateInput {
  goal_id: string;
  title: string;
  description?: string;
  ministry_department?: string;
  responsible_id?: string;
  status?: ObjectiveStatus;
  priority?: ObjectivePriority;
  due_date?: string;
  sort_order?: number;
}

export interface ObjectiveUpdateInput extends Partial<Omit<ObjectiveCreateInput, 'goal_id'>> {}
```

#### `keyResult.model.ts`

```typescript
export type KeyResultMetricType = 'number' | 'percentage' | 'currency' | 'boolean';
export type KeyResultUpdateFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
export type KeyResultStatus = 'active' | 'completed' | 'cancelled';

export type MetricLinkType =
  | 'none'
  | 'members_total'
  | 'members_active'
  | 'members_new'
  | 'donations_total'
  | 'donations_count'
  | 'care_plans_active'
  | 'discipleship_enrolled'
  | 'attendance_average'
  | 'custom_query';

export interface MetricLinkConfig {
  // For members_new, donations_total, etc. - date range
  date_range_start?: string;
  date_range_end?: string;

  // For custom_query
  custom_table?: string;
  custom_column?: string;
  custom_aggregation?: 'count' | 'sum' | 'avg';
  custom_filter?: Record<string, unknown>;
}

export interface KeyResult {
  id: string;
  tenant_id: string;
  goal_id?: string | null;
  objective_id?: string | null;
  title: string;
  description?: string | null;
  metric_type: KeyResultMetricType;
  target_value: number;
  current_value: number;
  starting_value: number;
  unit_label?: string | null;
  progress_percent: number;
  metric_link_type: MetricLinkType;
  metric_link_config: MetricLinkConfig;
  last_auto_update_at?: string | null;
  update_frequency: KeyResultUpdateFrequency;
  last_updated_at?: string | null;
  next_update_due?: string | null;
  status: KeyResultStatus;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface KeyResultCreateInput {
  goal_id?: string;
  objective_id?: string;
  title: string;
  description?: string;
  metric_type: KeyResultMetricType;
  target_value: number;
  starting_value?: number;
  unit_label?: string;
  metric_link_type?: MetricLinkType;
  metric_link_config?: MetricLinkConfig;
  update_frequency?: KeyResultUpdateFrequency;
  sort_order?: number;
}

export interface KeyResultUpdateInput extends Partial<Omit<KeyResultCreateInput, 'goal_id' | 'objective_id'>> {
  current_value?: number;
  status?: KeyResultStatus;
}
```

#### `keyResultProgressUpdate.model.ts`

```typescript
export interface KeyResultProgressUpdate {
  id: string;
  tenant_id: string;
  key_result_id: string;
  previous_value?: number | null;
  new_value: number;
  change_value: number;
  notes?: string | null;
  is_auto_update: boolean;
  recorded_at: string;
  created_at: string;
  created_by?: string | null;

  // Enriched fields
  created_by_name?: string | null;
}

export interface ProgressUpdateCreateInput {
  key_result_id: string;
  new_value: number;
  notes?: string;
}
```

### 3.2 Dashboard Statistics Types

```typescript
export interface GoalsDashboardStats {
  // Goal counts by status
  total_goals: number;
  goals_by_status: {
    draft: number;
    active: number;
    on_track: number;
    at_risk: number;
    behind: number;
    completed: number;
    cancelled: number;
  };

  // Progress overview
  average_progress: number;
  goals_on_track_percent: number;

  // Key results summary
  total_key_results: number;
  key_results_completed: number;
  key_results_at_risk: number;

  // Updates
  updates_due_this_week: number;
  overdue_updates: number;

  // Recent activity
  recent_updates_count: number;
}

export interface GoalActivity {
  id: string;
  type: 'goal_created' | 'goal_updated' | 'goal_status_changed' |
        'objective_created' | 'objective_completed' |
        'key_result_created' | 'progress_recorded';
  entity_type: 'goal' | 'objective' | 'key_result' | 'progress_update';
  entity_id: string;
  entity_title: string;
  description: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

---

## 4. Service Layer

### 4.1 GoalsService

The main orchestration service for goal operations.

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IGoalRepository } from '@/repositories/goal.repository';
import type { IObjectiveRepository } from '@/repositories/objective.repository';
import type { IKeyResultRepository } from '@/repositories/keyResult.repository';
import type { IKeyResultProgressUpdateRepository } from '@/repositories/keyResultProgressUpdate.repository';
import type { PlanningService } from '@/services/PlanningService';
import type { INotificationBusService } from '@/services/notification/NotificationBusService';
import { tenantUtils } from '@/lib/tenant/tenant-utils';

@injectable()
export class GoalsService {
  constructor(
    @inject(TYPES.IGoalRepository) private goalRepo: IGoalRepository,
    @inject(TYPES.IObjectiveRepository) private objectiveRepo: IObjectiveRepository,
    @inject(TYPES.IKeyResultRepository) private keyResultRepo: IKeyResultRepository,
    @inject(TYPES.IKeyResultProgressUpdateRepository) private progressRepo: IKeyResultProgressUpdateRepository,
    @inject(TYPES.PlanningService) private planningService: PlanningService,
    @inject(TYPES.NotificationBusService) private notificationBus: INotificationBusService,
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) throw new Error('No tenant context available');
    return resolved;
  }

  // ==================== GOALS ====================

  async getGoals(
    filters?: GoalFilters,
    options?: GoalQueryOptions,
    tenantId?: string
  ): Promise<{ data: Goal[]; total: number }> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.goalRepo.findAll(filters, options, effectiveTenantId);
  }

  async getGoalById(goalId: string, tenantId?: string): Promise<GoalWithDetails | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const goal = await this.goalRepo.findById(goalId, effectiveTenantId);
    if (!goal) return null;

    const [objectives, directKeyResults] = await Promise.all([
      this.objectiveRepo.findByGoalId(goalId, effectiveTenantId),
      this.keyResultRepo.findByGoalId(goalId, effectiveTenantId),
    ]);

    // Load key results for each objective
    const objectivesWithKRs = await Promise.all(
      objectives.map(async (obj) => ({
        ...obj,
        key_results: await this.keyResultRepo.findByObjectiveId(obj.id, effectiveTenantId),
      }))
    );

    return {
      ...goal,
      objectives: objectivesWithKRs,
      direct_key_results: directKeyResults,
    };
  }

  async createGoal(data: GoalCreateInput, tenantId?: string): Promise<Goal> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const goal = await this.goalRepo.create(data, effectiveTenantId);

    // Notify owner if assigned
    if (goal.owner_id) {
      await this.notificationBus.send({
        type: 'goal_assigned',
        recipientId: goal.owner_id,
        data: { goalId: goal.id, goalTitle: goal.title },
      });
    }

    return goal;
  }

  async updateGoal(goalId: string, data: GoalUpdateInput, tenantId?: string): Promise<Goal> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const existingGoal = await this.goalRepo.findById(goalId, effectiveTenantId);
    if (!existingGoal) throw new Error('Goal not found');

    const updatedGoal = await this.goalRepo.update(goalId, data, effectiveTenantId);

    // Notify on status change to at_risk or behind
    if (data.status && ['at_risk', 'behind'].includes(data.status) &&
        data.status !== existingGoal.status && updatedGoal.owner_id) {
      await this.notificationBus.send({
        type: 'goal_status_alert',
        recipientId: updatedGoal.owner_id,
        data: {
          goalId: updatedGoal.id,
          goalTitle: updatedGoal.title,
          newStatus: data.status
        },
      });
    }

    return updatedGoal;
  }

  async deleteGoal(goalId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    await this.goalRepo.softDelete(goalId, effectiveTenantId);
  }

  // ==================== OBJECTIVES ====================

  async getObjectivesForGoal(goalId: string, tenantId?: string): Promise<ObjectiveWithKeyResults[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const objectives = await this.objectiveRepo.findByGoalId(goalId, effectiveTenantId);

    return Promise.all(
      objectives.map(async (obj) => ({
        ...obj,
        key_results: await this.keyResultRepo.findByObjectiveId(obj.id, effectiveTenantId),
      }))
    );
  }

  async createObjective(data: ObjectiveCreateInput, tenantId?: string): Promise<Objective> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const objective = await this.objectiveRepo.create(data, effectiveTenantId);

    // Notify responsible person if assigned
    if (objective.responsible_id) {
      await this.notificationBus.send({
        type: 'objective_assigned',
        recipientId: objective.responsible_id,
        data: { objectiveId: objective.id, objectiveTitle: objective.title },
      });
    }

    return objective;
  }

  async updateObjective(objectiveId: string, data: ObjectiveUpdateInput, tenantId?: string): Promise<Objective> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.objectiveRepo.update(objectiveId, data, effectiveTenantId);
  }

  async deleteObjective(objectiveId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    await this.objectiveRepo.softDelete(objectiveId, effectiveTenantId);
  }

  async reorderObjectives(goalId: string, objectiveIds: string[], tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    await this.objectiveRepo.updateSortOrder(goalId, objectiveIds, effectiveTenantId);
  }

  // ==================== KEY RESULTS ====================

  async createKeyResult(data: KeyResultCreateInput, tenantId?: string): Promise<KeyResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.keyResultRepo.create(data, effectiveTenantId);
  }

  async updateKeyResult(keyResultId: string, data: KeyResultUpdateInput, tenantId?: string): Promise<KeyResult> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.keyResultRepo.update(keyResultId, data, effectiveTenantId);
  }

  async deleteKeyResult(keyResultId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    await this.keyResultRepo.softDelete(keyResultId, effectiveTenantId);
  }

  // ==================== PROGRESS UPDATES ====================

  async recordProgress(data: ProgressUpdateCreateInput, tenantId?: string): Promise<KeyResultProgressUpdate> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Get current key result to capture previous value
    const keyResult = await this.keyResultRepo.findById(data.key_result_id, effectiveTenantId);
    if (!keyResult) throw new Error('Key result not found');

    // Create progress update
    const progressUpdate = await this.progressRepo.create({
      ...data,
      previous_value: keyResult.current_value,
    }, effectiveTenantId);

    // Update key result current value
    await this.keyResultRepo.update(data.key_result_id, {
      current_value: data.new_value,
    }, effectiveTenantId);

    return progressUpdate;
  }

  async getProgressHistory(
    keyResultId: string,
    limit?: number,
    tenantId?: string
  ): Promise<KeyResultProgressUpdate[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.progressRepo.findByKeyResultId(keyResultId, limit, effectiveTenantId);
  }

  // ==================== DASHBOARD & STATS ====================

  async getDashboardStats(tenantId?: string): Promise<GoalsDashboardStats> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.goalRepo.getDashboardStats(effectiveTenantId);
  }

  async getUpcomingUpdatesDue(days: number = 7, tenantId?: string): Promise<KeyResult[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.keyResultRepo.findUpcomingUpdatesDue(days, effectiveTenantId);
  }

  async getOverdueUpdates(tenantId?: string): Promise<KeyResult[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.keyResultRepo.findOverdueUpdates(effectiveTenantId);
  }

  async getRecentActivity(limit: number = 10, tenantId?: string): Promise<GoalActivity[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.goalRepo.getRecentActivity(limit, effectiveTenantId);
  }

  // ==================== CALENDAR INTEGRATION ====================

  async syncGoalMilestones(goalId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const goal = await this.getGoalById(goalId, effectiveTenantId);
    if (!goal) throw new Error('Goal not found');

    // Create calendar events for goal target date
    if (goal.target_date) {
      await this.planningService.createOrUpdateEvent({
        title: `Goal Due: ${goal.title}`,
        start_at: goal.target_date,
        all_day: true,
        event_type: 'goal_milestone',
        source_type: 'goals',
        source_id: goal.id,
        priority: 'high',
      }, effectiveTenantId);
    }

    // Create events for objective due dates
    for (const objective of goal.objectives) {
      if (objective.due_date) {
        await this.planningService.createOrUpdateEvent({
          title: `Objective Due: ${objective.title}`,
          start_at: objective.due_date,
          all_day: true,
          event_type: 'goal_milestone',
          source_type: 'objectives',
          source_id: objective.id,
          priority: objective.priority === 'urgent' ? 'urgent' : 'normal',
        }, effectiveTenantId);
      }
    }
  }
}
```

### 4.2 GoalCategoryService

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IGoalCategoryRepository } from '@/repositories/goalCategory.repository';
import { tenantUtils } from '@/lib/tenant/tenant-utils';

@injectable()
export class GoalCategoryService {
  constructor(
    @inject(TYPES.IGoalCategoryRepository) private categoryRepo: IGoalCategoryRepository,
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) throw new Error('No tenant context available');
    return resolved;
  }

  async getCategories(tenantId?: string): Promise<GoalCategory[]> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.categoryRepo.findAll(effectiveTenantId);
  }

  async getCategoryById(categoryId: string, tenantId?: string): Promise<GoalCategory | null> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.categoryRepo.findById(categoryId, effectiveTenantId);
  }

  async createCategory(data: GoalCategoryCreateInput, tenantId?: string): Promise<GoalCategory> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Auto-generate code from name if not provided
    const code = data.code || this.generateCode(data.name);

    return this.categoryRepo.create({ ...data, code }, effectiveTenantId);
  }

  async updateCategory(
    categoryId: string,
    data: GoalCategoryUpdateInput,
    tenantId?: string
  ): Promise<GoalCategory> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    return this.categoryRepo.update(categoryId, data, effectiveTenantId);
  }

  async deleteCategory(categoryId: string, tenantId?: string): Promise<void> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);

    // Check if category is in use
    const isInUse = await this.categoryRepo.isInUse(categoryId, effectiveTenantId);
    if (isInUse) {
      throw new Error('Cannot delete category that is in use by goals');
    }

    await this.categoryRepo.softDelete(categoryId, effectiveTenantId);
  }

  async seedDefaultCategories(tenantId: string): Promise<void> {
    await this.categoryRepo.seedDefaults(tenantId);
  }

  private generateCode(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }
}
```

### 4.3 GoalMetricsService

Service for auto-linked metrics calculation.

```typescript
import 'server-only';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/lib/types';
import type { IKeyResultRepository } from '@/repositories/keyResult.repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { tenantUtils } from '@/lib/tenant/tenant-utils';

@injectable()
export class GoalMetricsService {
  constructor(
    @inject(TYPES.IKeyResultRepository) private keyResultRepo: IKeyResultRepository,
  ) {}

  private async resolveTenantId(tenantId?: string): Promise<string> {
    const resolved = tenantId ?? (await tenantUtils.getTenantId());
    if (!resolved) throw new Error('No tenant context available');
    return resolved;
  }

  /**
   * Get available metrics that can be linked to key results
   */
  getAvailableMetrics(): AvailableMetric[] {
    return [
      {
        type: 'members_total',
        name: 'Total Members',
        description: 'Current total count of all members',
        unit: 'members',
        metric_type: 'number',
      },
      {
        type: 'members_active',
        name: 'Active Members',
        description: 'Members with active status',
        unit: 'members',
        metric_type: 'number',
      },
      {
        type: 'members_new',
        name: 'New Members',
        description: 'Members added in date range',
        unit: 'members',
        metric_type: 'number',
        requires_date_range: true,
      },
      {
        type: 'donations_total',
        name: 'Total Donations',
        description: 'Sum of donations in date range',
        unit: '$',
        metric_type: 'currency',
        requires_date_range: true,
      },
      {
        type: 'donations_count',
        name: 'Donation Count',
        description: 'Number of unique donors in date range',
        unit: 'donors',
        metric_type: 'number',
        requires_date_range: true,
      },
      {
        type: 'care_plans_active',
        name: 'Active Care Plans',
        description: 'Currently active care plans',
        unit: 'plans',
        metric_type: 'number',
      },
      {
        type: 'discipleship_enrolled',
        name: 'Discipleship Enrolled',
        description: 'Members enrolled in discipleship pathways',
        unit: 'members',
        metric_type: 'number',
      },
    ];
  }

  /**
   * Calculate the current value for a linked metric
   */
  async calculateMetricValue(
    metricType: MetricLinkType,
    config: MetricLinkConfig,
    tenantId?: string
  ): Promise<number> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const supabase = await createServerSupabaseClient();

    switch (metricType) {
      case 'members_total':
        return this.countMembers(supabase, effectiveTenantId, {});

      case 'members_active':
        return this.countMembers(supabase, effectiveTenantId, { status: 'active' });

      case 'members_new':
        return this.countMembers(supabase, effectiveTenantId, {
          created_after: config.date_range_start,
          created_before: config.date_range_end,
        });

      case 'donations_total':
        return this.sumDonations(supabase, effectiveTenantId, config);

      case 'donations_count':
        return this.countDonors(supabase, effectiveTenantId, config);

      case 'care_plans_active':
        return this.countCarePlans(supabase, effectiveTenantId, { status: 'active' });

      case 'discipleship_enrolled':
        return this.countDiscipleshipEnrolled(supabase, effectiveTenantId);

      default:
        return 0;
    }
  }

  /**
   * Update all auto-linked key results
   */
  async refreshAutoLinkedMetrics(tenantId?: string): Promise<number> {
    const effectiveTenantId = await this.resolveTenantId(tenantId);
    const linkedKeyResults = await this.keyResultRepo.findWithMetricLinks(effectiveTenantId);

    let updatedCount = 0;
    for (const kr of linkedKeyResults) {
      try {
        const newValue = await this.calculateMetricValue(
          kr.metric_link_type,
          kr.metric_link_config,
          effectiveTenantId
        );

        if (newValue !== kr.current_value) {
          await this.keyResultRepo.updateAutoValue(kr.id, newValue, effectiveTenantId);
          updatedCount++;
        }
      } catch (error) {
        console.error(`Failed to update metric for key result ${kr.id}:`, error);
      }
    }

    return updatedCount;
  }

  // Private helper methods for metric calculations
  private async countMembers(
    supabase: SupabaseClient,
    tenantId: string,
    filters: { status?: string; created_after?: string; created_before?: string }
  ): Promise<number> {
    let query = supabase
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.created_after) {
      query = query.gte('created_at', filters.created_after);
    }
    if (filters.created_before) {
      query = query.lte('created_at', filters.created_before);
    }

    const { count } = await query;
    return count || 0;
  }

  private async sumDonations(
    supabase: SupabaseClient,
    tenantId: string,
    config: MetricLinkConfig
  ): Promise<number> {
    let query = supabase
      .from('donations')
      .select('amount')
      .eq('tenant_id', tenantId);

    if (config.date_range_start) {
      query = query.gte('donation_date', config.date_range_start);
    }
    if (config.date_range_end) {
      query = query.lte('donation_date', config.date_range_end);
    }

    const { data } = await query;
    return data?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
  }

  private async countDonors(
    supabase: SupabaseClient,
    tenantId: string,
    config: MetricLinkConfig
  ): Promise<number> {
    // This would use a distinct count on donor_id
    // Implementation depends on actual donations schema
    return 0; // Placeholder
  }

  private async countCarePlans(
    supabase: SupabaseClient,
    tenantId: string,
    filters: { status?: string }
  ): Promise<number> {
    let query = supabase
      .from('member_care_plans')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { count } = await query;
    return count || 0;
  }

  private async countDiscipleshipEnrolled(
    supabase: SupabaseClient,
    tenantId: string
  ): Promise<number> {
    const { count } = await supabase
      .from('member_discipleship_plans')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .in('status', ['active', 'in_progress']);

    return count || 0;
  }
}

interface AvailableMetric {
  type: MetricLinkType;
  name: string;
  description: string;
  unit: string;
  metric_type: KeyResultMetricType;
  requires_date_range?: boolean;
}
```

---

## 5. API Endpoints

### 5.1 Goals Routes

#### `GET /api/community/planning/goals`

List goals with filtering and pagination.

**Query Parameters:**
- `category_id` - Filter by category
- `status` - Filter by status (can be comma-separated for multiple)
- `visibility` - Filter by visibility level
- `owner_id` - Filter by owner
- `search` - Search in title and description
- `start_date_from`, `start_date_to` - Filter by start date range
- `target_date_from`, `target_date_to` - Filter by target date range
- `tags` - Filter by tags (comma-separated)
- `limit`, `offset` - Pagination
- `sort_by` - Sort field (title, target_date, overall_progress, created_at)
- `sort_order` - asc or desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Increase Weekly Attendance",
      "description": "...",
      "category": { "id": "uuid", "name": "Spiritual Growth", "color": "#8b5cf6" },
      "status": "on_track",
      "visibility": "staff",
      "overall_progress": 65.5,
      "target_date": "2026-12-31",
      "owner_name": "John Smith",
      "objectives_count": 3,
      "key_results_count": 8
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}
```

#### `POST /api/community/planning/goals`

Create a new goal.

**Request Body:**
```json
{
  "title": "Increase Weekly Attendance by 20%",
  "description": "Strategic goal to grow our congregation...",
  "category_id": "uuid",
  "start_date": "2026-01-01",
  "target_date": "2026-12-31",
  "status": "active",
  "owner_id": "uuid",
  "visibility": "staff",
  "tags": ["growth", "2026"]
}
```

#### `GET /api/community/planning/goals/[goalId]`

Get goal details with objectives and key results.

#### `PUT /api/community/planning/goals/[goalId]`

Update a goal.

#### `DELETE /api/community/planning/goals/[goalId]`

Soft delete a goal.

### 5.2 Objectives Routes

#### `GET /api/community/planning/goals/[goalId]/objectives`

List objectives for a goal.

#### `POST /api/community/planning/goals/[goalId]/objectives`

Create a new objective.

**Request Body:**
```json
{
  "title": "Launch Youth Ministry Program",
  "description": "...",
  "ministry_department": "Youth",
  "responsible_id": "uuid",
  "priority": "high",
  "due_date": "2026-06-30"
}
```

#### `PUT /api/community/planning/goals/objectives/[objectiveId]`

Update an objective.

#### `DELETE /api/community/planning/goals/objectives/[objectiveId]`

Delete an objective.

### 5.3 Key Results Routes

#### `POST /api/community/planning/goals/[goalId]/key-results`

Create a key result linked to a goal.

#### `POST /api/community/planning/goals/objectives/[objectiveId]/key-results`

Create a key result linked to an objective.

**Request Body:**
```json
{
  "title": "Increase average weekly attendance",
  "description": "Track weekly service attendance numbers",
  "metric_type": "number",
  "target_value": 500,
  "starting_value": 400,
  "unit_label": "attendees",
  "metric_link_type": "attendance_average",
  "update_frequency": "weekly"
}
```

#### `PUT /api/community/planning/goals/key-results/[keyResultId]`

Update a key result.

#### `DELETE /api/community/planning/goals/key-results/[keyResultId]`

Delete a key result.

#### `POST /api/community/planning/goals/key-results/[keyResultId]/progress`

Record a progress update.

**Request Body:**
```json
{
  "new_value": 425,
  "notes": "Great turnout this week due to Easter service"
}
```

#### `GET /api/community/planning/goals/key-results/[keyResultId]/progress`

Get progress history for a key result.

### 5.4 Categories Routes

#### `GET /api/community/planning/goals/categories`

List all goal categories.

#### `POST /api/community/planning/goals/categories`

Create a new category.

#### `PUT /api/community/planning/goals/categories/[categoryId]`

Update a category.

#### `DELETE /api/community/planning/goals/categories/[categoryId]`

Delete a category (fails if in use).

### 5.5 Dashboard & Utilities Routes

#### `GET /api/community/planning/goals/dashboard`

Get dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total_goals": 15,
    "goals_by_status": {
      "draft": 2,
      "active": 5,
      "on_track": 4,
      "at_risk": 2,
      "behind": 1,
      "completed": 1,
      "cancelled": 0
    },
    "average_progress": 52.3,
    "goals_on_track_percent": 60,
    "total_key_results": 45,
    "key_results_completed": 12,
    "key_results_at_risk": 5,
    "updates_due_this_week": 8,
    "overdue_updates": 3,
    "recent_updates_count": 15
  }
}
```

#### `GET /api/community/planning/goals/available-metrics`

Get list of available metrics for auto-linking.

#### `POST /api/community/planning/goals/sync-calendar`

Sync goal milestones to the planning calendar.

**Request Body:**
```json
{
  "goal_id": "uuid"  // Optional, syncs all if not provided
}
```

---

## 6. UI Components

### 6.1 Component Hierarchy

```
GoalsModule/
├── GoalsDashboard/
│   ├── HealthOverviewCards/
│   │   ├── OnTrackCard
│   │   ├── AtRiskCard
│   │   └── BehindCard
│   ├── ProgressDonutChart/
│   ├── UpcomingUpdatesList/
│   ├── RecentActivityFeed/
│   └── QuickActions/
│
├── GoalsListView/
│   ├── GoalFilters/
│   │   ├── CategoryFilter
│   │   ├── StatusFilter
│   │   ├── OwnerFilter
│   │   └── DateRangeFilter
│   ├── GoalsTable/
│   │   └── GoalRow (expandable)
│   │       ├── ObjectivesList
│   │       └── KeyResultsList
│   └── Pagination/
│
├── GoalDetailView/
│   ├── GoalHeader/
│   │   ├── CategoryBadge
│   │   ├── StatusBadge
│   │   └── ActionButtons
│   ├── ProgressSummary/
│   │   └── ProgressRing
│   ├── ObjectivesAccordion/
│   │   └── ObjectiveCard/
│   │       └── KeyResultsList
│   ├── DirectKeyResultsList/
│   │   └── KeyResultCard/
│   └── ActivityTimeline/
│
├── GoalCreateWizard/
│   ├── Step1BasicInfo/
│   ├── Step2Timeline/
│   ├── Step3Assignment/
│   ├── Step4Objectives/
│   │   └── ObjectiveInlineForm
│   ├── Step5KeyResults/
│   │   └── KeyResultInlineForm
│   │       └── MetricLinkSelector
│   └── Step6Review/
│
├── Shared/
│   ├── GoalCard/
│   ├── GoalStatusBadge/
│   ├── ObjectiveCard/
│   ├── KeyResultCard/
│   │   ├── ProgressBar
│   │   └── MetricDisplay
│   ├── KeyResultProgressChart/
│   ├── ProgressUpdateDialog/
│   └── CategoryManager/
│       ├── CategoryList
│       └── CategoryForm
```

### 6.2 Key Component Specifications

#### GoalsDashboard

```tsx
interface GoalsDashboardProps {
  // No props - fetches data internally
}

// Features:
// - 4 stat cards showing goal health metrics
// - Donut chart showing key results completion
// - List of key results with updates due this week
// - Activity feed showing recent changes
// - Quick action buttons: Create Goal, Record Progress
// - Auto-refresh every 5 minutes
```

#### GoalsListView

```tsx
interface GoalsListViewProps {
  initialFilters?: GoalFilters;
}

// Features:
// - Filterable by category, status, owner, date range
// - Full-text search
// - Sortable columns
// - Expandable rows showing objectives and key results
// - Bulk actions (archive, change status)
// - Export to CSV
// - Responsive: cards on mobile, table on desktop
```

#### GoalDetailView

```tsx
interface GoalDetailViewProps {
  goalId: string;
}

// Features:
// - Hero header with category color
// - Progress ring showing overall completion
// - Objectives accordion with inline key results
// - Direct key results section
// - Activity timeline
// - Edit, archive, delete actions
// - Sync to calendar button
```

#### GoalCreateWizard

```tsx
interface GoalCreateWizardProps {
  onComplete: (goal: Goal) => void;
  onCancel: () => void;
}

// 6-step wizard:
// Step 1: Title, description, category selection
// Step 2: Start date, target date
// Step 3: Owner selection, visibility level
// Step 4: Add objectives (can skip)
// Step 5: Add key results with metric configuration (can skip)
// Step 6: Review all details, submit
```

#### KeyResultCard

```tsx
interface KeyResultCardProps {
  keyResult: KeyResult;
  onRecordProgress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showProgressHistory?: boolean;
}

// Features:
// - Progress bar with percentage
// - Current vs target display
// - Unit label and metric type indicator
// - Auto-link badge if connected to system metric
// - Update due date indicator
// - Quick record progress button
```

#### ProgressUpdateDialog

```tsx
interface ProgressUpdateDialogProps {
  keyResult: KeyResult;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProgressUpdateCreateInput) => Promise<void>;
}

// Features:
// - Shows current value and progress
// - Number input with +/- quick adjust buttons
// - Notes textarea
// - Visual indicator of progress change
// - Loading state during submission
```

#### MetricLinkSelector

```tsx
interface MetricLinkSelectorProps {
  value: { type: MetricLinkType; config: MetricLinkConfig };
  onChange: (value: { type: MetricLinkType; config: MetricLinkConfig }) => void;
}

// Features:
// - Dropdown of available system metrics
// - Shows description of each metric
// - Date range picker for time-bound metrics
// - Preview of current metric value
// - "None" option for manual tracking
```

### 6.3 Dynamic UI Components (Phase 5b)

The following mobile-first, theme-aware components were implemented as part of the metadata-driven architecture. They are registered in `admin.tsx` and can be used in XML blueprints.

#### GoalProgressRing

```tsx
interface GoalProgressRingProps {
  progress: number;              // 0-100
  size?: number;                 // Default: 120px
  strokeWidth?: number;          // Default: 8px
  status?: ProgressRingStatus;   // Determines color
  showLabel?: boolean;           // Show percentage
  label?: string;                // Custom label
  animationDuration?: number;    // Default: 1000ms
}

type ProgressRingStatus = "draft" | "active" | "on_track" | "at_risk" | "behind" | "completed" | "cancelled";

// Features:
// - SVG-based circular progress indicator
// - Status-aware colors (emerald/sky/amber/destructive)
// - Smooth CSS animations
// - Touch feedback with scale transform
// - ARIA progressbar role for accessibility
```

#### GoalCard

```tsx
interface GoalCardProps {
  goal?: GoalCardData;           // Single goal
  goals?: GoalCardData[];        // List mode
  variant?: "default" | "compact" | "featured";
  showProgress?: boolean;
  showActions?: boolean;
  baseUrl?: string;
  onViewDetails?: (goalId: string) => void;
  onRecordProgress?: (goalId: string) => void;
}

// Features:
// - Responsive grid (1-col mobile → 3-col desktop)
// - Embedded GoalProgressRing
// - Category color indicator strip
// - Status badges with semantic colors
// - Tag display with overflow handling
// - Quick action buttons
// - Empty state with call-to-action
```

#### KeyResultProgressCard

```tsx
interface KeyResultProgressCardProps {
  keyResult?: KeyResultData;     // Single KR
  keyResults?: KeyResultData[];  // List mode
  variant?: "default" | "compact" | "inline";
  showUpdateButton?: boolean;
  showParent?: boolean;
  onUpdateProgress?: (keyResultId: string) => void;
}

// Features:
// - Progress bar with color coding by percentage
// - Current vs target value display with formatting
// - Metric type support (number, percentage, currency, boolean)
// - Update frequency and due date indicators
// - Auto-linked badge for system-connected metrics
// - Inline variant for compact displays
```

#### OKRTreeView

```tsx
interface OKRTreeViewProps {
  goal?: GoalNode;               // Single goal hierarchy
  goals?: GoalNode[];            // Multiple goals
  defaultExpanded?: boolean;
  showActions?: boolean;
  baseUrl?: string;
  onAddObjective?: (goalId: string) => void;
  onAddKeyResult?: (parentId: string, parentType: "goal" | "objective") => void;
  onRecordProgress?: (keyResultId: string) => void;
}

// Features:
// - Hierarchical tree: Goal → Objectives → Key Results
// - Collapsible/expandable sections
// - Progress indicators at each level
// - Inline key result mini-progress rings
// - Quick actions for adding items
// - Status dots with semantic colors
// - Keyboard navigation support
```

#### GoalStatusTimeline

```tsx
interface GoalStatusTimelineProps {
  title?: string;
  description?: string;
  events?: TimelineEvent[];
  maxEvents?: number;            // Default: 10
  showLoadMore?: boolean;
  showRelativeTime?: boolean;    // "2h ago" vs full date
  variant?: "default" | "compact" | "minimal";
  onLoadMore?: () => void;
}

type TimelineEventType =
  | "goal_created" | "goal_updated" | "status_changed"
  | "progress_recorded" | "objective_added" | "key_result_added"
  | "milestone_reached" | "comment_added" | "assignment_changed";

// Features:
// - Visual timeline with connecting lines
// - Event type icons and colors
// - Before/after badges for status changes
// - Progress percentage badges
// - User attribution
// - Relative timestamps with full date tooltip
// - Load more pagination
```

#### XML Blueprint Usage Example

```xml
<!-- In planning-goals-detail.xml -->
<Component id="goal-okr-tree" type="OKRTreeView">
  <Props>
    <Prop name="goal" kind="binding" contract="goalOkrTree.goal"/>
    <Prop name="defaultExpanded" kind="static">true</Prop>
    <Prop name="showActions" kind="static">true</Prop>
    <Prop name="baseUrl" kind="static">/admin/community/planning/goals</Prop>
  </Props>
</Component>

<Component id="goal-activity" type="GoalStatusTimeline">
  <Props>
    <Prop name="events" kind="binding" contract="goalTimeline.events"/>
    <Prop name="maxEvents" kind="static">10</Prop>
    <Prop name="showLoadMore" kind="static">true</Prop>
  </Props>
</Component>
```

---

## 7. Auto-Linked Metrics

### 7.1 Supported Metrics

| Metric Type | Description | Unit | Requires Date Range |
|-------------|-------------|------|---------------------|
| `members_total` | Total member count | members | No |
| `members_active` | Active members only | members | No |
| `members_new` | New members added | members | Yes |
| `donations_total` | Sum of donations | $ | Yes |
| `donations_count` | Number of donors | donors | Yes |
| `care_plans_active` | Active care plans | plans | No |
| `discipleship_enrolled` | Enrolled in discipleship | members | No |
| `attendance_average` | Average attendance | attendees | Yes |

### 7.2 Auto-Update Mechanism

```
┌──────────────────┐
│   Key Result     │
│  metric_link=    │
│  members_total   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐     ┌──────────────────┐
│ GoalMetricsService│────▶│  members table   │
│ calculateMetric() │     │  COUNT(*)        │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
┌──────────────────┐
│  Update KR       │
│  current_value   │
│  last_auto_update│
└──────────────────┘
```

### 7.3 Refresh Schedule

- **On-demand**: Users can click "Refresh" to update linked metrics
- **Scheduled**: Background job runs daily to update all linked metrics
- **On access**: Dashboard calculates fresh values when loaded

---

## 8. Notification System

### 8.1 Notification Types

| Type | Trigger | Recipients | Channels |
|------|---------|------------|----------|
| `goal_assigned` | User assigned as goal owner | Assignee | Email, In-app, Push |
| `objective_assigned` | User assigned as responsible | Assignee | Email, In-app, Push |
| `goal_status_alert` | Goal moves to at_risk/behind | Owner | Email, In-app, Push |
| `update_due_reminder` | Key result update coming due | Responsible | Email, In-app |
| `update_overdue` | Key result update is overdue | Responsible, Owner | Email, In-app, Push |
| `goal_completed` | Goal marked complete | Team | In-app |
| `milestone_approaching` | Target date within 7 days | Owner | Email, In-app |

### 8.2 Notification Templates

```typescript
// Goal assigned notification
{
  type: 'goal_assigned',
  subject: 'You\'ve been assigned a new goal',
  body: 'You have been assigned as the owner of "{{goalTitle}}". Target date: {{targetDate}}.',
  action_url: '/admin/community/planning/goals/{{goalId}}',
  action_label: 'View Goal'
}

// Update due reminder
{
  type: 'update_due_reminder',
  subject: 'Key result update due',
  body: 'The key result "{{keyResultTitle}}" is due for an update. Current progress: {{progressPercent}}%.',
  action_url: '/admin/community/planning/goals/{{goalId}}?kr={{keyResultId}}',
  action_label: 'Record Progress'
}
```

### 8.3 User Preferences

Users can configure notification preferences:
- Per notification type: Email, In-app, Push, None
- Quiet hours: Suppress notifications during specified times
- Digest mode: Receive daily/weekly summary instead of individual notifications

---

## 9. Calendar Integration

### 9.1 Calendar Event Types

| Source | Event Type | Sync Trigger |
|--------|------------|--------------|
| Goal target_date | `goal_milestone` | On goal create/update |
| Objective due_date | `goal_milestone` | On objective create/update |
| Key result update_due | `goal_reminder` | On key result create/update |

### 9.2 Sync Behavior

- **Automatic**: Events created/updated when goals/objectives change
- **Manual**: Users can trigger full sync via dashboard
- **One-way**: Calendar events are read-only references to goals
- **Cleanup**: Events removed when goals are deleted/archived

### 9.3 Event Display

Goals appear in the Planning Calendar with:
- Category color as event color
- "Goal" or "Objective" badge
- Click-through to goal detail page
- Priority indicator for urgent items

---

## 10. Security & Permissions

### 10.1 Permission Matrix

| Action | Required Permission |
|--------|---------------------|
| View public goals | (any authenticated user) |
| View staff goals | `goals:view` |
| View leadership goals | `goals:view_leadership` |
| View private goals | `goals:view_all` or be owner |
| Create goals | `goals:create` |
| Edit own goals | (owner) |
| Edit any goal | `goals:edit` |
| Delete goals | `goals:delete` |
| Manage objectives | `objectives:manage` or be goal owner |
| Manage key results | `key_results:manage` |
| Record progress | `key_results:record_progress` |

### 10.2 Default Role Assignments

| Role | Permissions |
|------|-------------|
| Tenant Admin | All goals permissions |
| Staff | `goals:view`, `key_results:record_progress` |
| Ministry Leader | `goals:view`, `goals:create`, `objectives:manage`, `key_results:manage`, `key_results:record_progress` |
| Member | View public goals only |

### 10.3 Data Isolation

- All queries filtered by `tenant_id`
- RLS policies enforce tenant isolation at database level
- Visibility rules applied in addition to tenant isolation
- Service role bypasses RLS for system operations

---

## 11. Implementation Phases

### Phase 1: Database & Core Infrastructure ✅ COMPLETED

**Deliverables:**
- [x] Database migration with all tables (`20260108000000_create_goals_objectives_system.sql`)
- [x] RLS policies
- [x] Default permissions
- [x] All model files (goal, goalCategory, objective, keyResult, keyResultProgressUpdate)
- [x] All adapter files (5 adapters with tenant resolution at adapter level)
- [x] All repository files (5 repositories)
- [x] GoalsService, GoalCategoryService, GoalMetricsService
- [x] DI container registration (TYPES and container bindings)

**Dependencies:** None

### Phase 2: API Routes ✅ COMPLETED

**Deliverables:**
- [x] Goals CRUD endpoints (`/api/community/planning/goals`, `/api/community/planning/goals/[goalId]`)
- [x] Objectives CRUD endpoints (`/api/community/planning/goals/[goalId]/objectives`, `/api/community/planning/goals/objectives/[objectiveId]`)
- [x] Key Results CRUD endpoints (`/api/community/planning/goals/objectives/[objectiveId]/key-results`, `/api/community/planning/goals/key-results/[keyResultId]`)
- [x] Progress update endpoints (`/api/community/planning/goals/key-results/[keyResultId]/progress`)
- [x] Categories endpoints (`/api/community/planning/goals/categories`, `/api/community/planning/goals/categories/[categoryId]`)
- [x] Dashboard endpoint (`/api/community/planning/goals/dashboard`)
- [x] Available metrics endpoint (`/api/community/planning/goals/available-metrics`) (completed in Phase 5)

**Dependencies:** Phase 1

### Phase 3: UI - Dashboard & List ✅ COMPLETED

**Deliverables:**
- [x] Goals dashboard page (`apps/web/src/app/admin/community/planning/goals/page.tsx`)
- [x] Goals page content component (`GoalsPageContent.tsx`)
- [x] XML metadata blueprint (`planning-goals.xml`)
- [x] Service handlers for metadata data sources (`admin-community-goals.ts`)
- [x] Stat cards and status badges
- [x] Goals table with filters (status, category, search)
- [x] Quick links navigation
- [x] Enable Goals card in Planning dashboard (removed "Coming Soon" flag)

**Dependencies:** Phase 2

### Phase 4: UI - Detail & Create ✅ COMPLETED

**Deliverables:**
- [x] Goal detail page (`apps/web/src/app/admin/community/planning/goals/[goalId]/page.tsx`)
- [x] Goal create/edit page (`apps/web/src/app/admin/community/planning/goals/create/page.tsx`)
- [x] XML metadata blueprint for detail (`planning-goals-detail.xml`)
- [x] XML metadata blueprint for create/edit (`planning-goals-manage.xml`)
- [x] Service handlers for detail data sources (hero, summary, objectives, keyResults, activity)
- [x] Service handlers for manage actions (form, save)
- [x] Delete goal action handler
- [x] Progress visualization in key results grid

**Dependencies:** Phase 3

### Phase 5: Auto-Metrics & Categories ✅ COMPLETED

**Deliverables:**
- [x] Category management pages (`apps/web/src/app/admin/community/planning/goals/categories/page.tsx`, `categories/create/page.tsx`)
- [x] XML metadata blueprint for category list (`planning-goals-categories.xml`)
- [x] XML metadata blueprint for category create/edit (`planning-goals-categories-manage.xml`)
- [x] Service handlers for category management (list, form, save, delete, manage.hero, manage.form, manage.save)
- [x] Available metrics API endpoint (`/api/community/planning/goals/available-metrics/route.ts`)
- [x] 20+ system metrics defined across 8 categories (Membership, Households, Attendance, Financial, Care, Discipleship, Events, Volunteers)
- [x] Color and icon selection options for categories (10 colors, 12 icons)

**Dependencies:** Phase 4

### Phase 5b: Dynamic UI Components ✅ COMPLETED

**Deliverables:**
- [x] `GoalProgressRing` - Circular SVG progress indicator with status-aware colors
- [x] `GoalCard` - Goal card with progress ring, status badges, category indicators, and quick actions
- [x] `KeyResultProgressCard` - Key result display with progress bars, current/target values, and update buttons
- [x] `OKRTreeView` - Hierarchical tree view of goals → objectives → key results with expand/collapse
- [x] `GoalStatusTimeline` - Visual timeline of goal activity with event type icons and metadata
- [x] Component registration in `admin.tsx` (namespace: admin, version: 1.0.0)
- [x] Updated XML blueprints to use new components (`planning-goals.xml`, `planning-goals-detail.xml`)

**Component Features:**
| Component | Mobile-First | Theme-Aware | Touch Optimized | Accessibility |
|-----------|-------------|-------------|-----------------|---------------|
| GoalProgressRing | ✅ | ✅ Status colors | ✅ Scale feedback | ✅ ARIA progressbar |
| GoalCard | ✅ 1-3 col grid | ✅ CSS variables | ✅ 44px targets | ✅ Semantic HTML |
| KeyResultProgressCard | ✅ Stack/inline | ✅ Progress colors | ✅ Touch actions | ✅ Labels |
| OKRTreeView | ✅ Collapsible | ✅ Border colors | ✅ Expandable | ✅ Keyboard nav |
| GoalStatusTimeline | ✅ Compact variant | ✅ Event colors | ✅ Load more | ✅ Time elements |

**Dependencies:** Phase 5

### Phase 5c: Service Handler Integration ✅ COMPLETED

**Deliverables:**
- [x] `resolveGoalsCards` - Service handler for GoalCard component (goals list page)
- [x] `resolveGoalOkrTree` - Service handler for OKRTreeView component (goal detail page)
- [x] `resolveGoalKeyResultsCards` - Service handler for KeyResultProgressCard component
- [x] `resolveGoalTimeline` - Service handler for GoalStatusTimeline component
- [x] All handlers registered in `adminCommunityGoalsHandlers` export

**Handler Registrations:**
| Handler Key | Component | Page |
|------------|-----------|------|
| `admin-community.planning.goals.cards` | GoalCard | Goals list |
| `admin-community.planning.goals.detail.okrTree` | OKRTreeView | Goal detail |
| `admin-community.planning.goals.detail.keyResultsCards` | KeyResultProgressCard | Goal detail |
| `admin-community.planning.goals.detail.timeline` | GoalStatusTimeline | Goal detail |

**Data Transformations:**
- `resolveGoalsCards`: Transforms Goal[] → GoalCardData[] with category, status, progress, counts
- `resolveGoalOkrTree`: Builds full hierarchy with objectives and nested key results
- `resolveGoalKeyResultsCards`: Maps KeyResult[] → KeyResultData[] with metric formatting
- `resolveGoalTimeline`: Aggregates progress updates into TimelineEvent[] with user attribution

**Dependencies:** Phase 5b

### Phase 6: Notifications & Calendar

**Deliverables:**
- [ ] Notification templates
- [ ] Notification triggers in services
- [ ] Calendar sync functionality
- [ ] User notification preferences

**Dependencies:** Phase 5c

### Phase 7: Testing & Polish (Est. 2-3 days)

**Deliverables:**
- [ ] E2E tests with Playwright
- [ ] Unit tests for services
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation updates

**Dependencies:** Phase 6

---

## 12. File Structure

### Complete File List

```
apps/web/
├── src/
│   ├── app/
│   │   ├── admin/community/planning/goals/
│   │   │   ├── page.tsx                    # ✅ Goals dashboard
│   │   │   ├── metadata.ts                 # ✅ Metadata renderer
│   │   │   ├── [goalId]/
│   │   │   │   └── page.tsx                # ✅ Goal detail view
│   │   │   ├── create/
│   │   │   │   └── page.tsx                # ✅ Goal create/edit
│   │   │   └── categories/
│   │   │       ├── page.tsx                # ✅ Categories list
│   │   │       └── create/
│   │   │           └── page.tsx            # ✅ Category create/edit
│   │   │
│   │   └── api/community/planning/goals/
│   │       ├── route.ts                    # ✅ Goals list/create
│   │       ├── [goalId]/
│   │       │   ├── route.ts                # ✅ Goal CRUD
│   │       │   └── objectives/
│   │       │       └── route.ts            # ✅ Objectives list/create
│   │       ├── objectives/
│   │       │   └── [objectiveId]/
│   │       │       ├── route.ts            # ✅ Objective CRUD
│   │       │       └── key-results/
│   │       │           └── route.ts        # ✅ Key results list/create
│   │       ├── key-results/
│   │       │   └── [keyResultId]/
│   │       │       ├── route.ts            # ✅ Key result CRUD
│   │       │       └── progress/
│   │       │           └── route.ts        # ✅ Progress updates
│   │       ├── categories/
│   │       │   ├── route.ts                # ✅ Categories list/create
│   │       │   └── [categoryId]/
│   │       │       └── route.ts            # ✅ Category CRUD
│   │       ├── dashboard/
│   │       │   └── route.ts                # ✅ Dashboard stats
│   │       ├── available-metrics/
│   │       │   └── route.ts                # ✅ System metrics for auto-linking
│   │       └── sync-calendar/
│   │           └── route.ts                # 🔲 Phase 6
│   │
│   ├── models/goals/
│   │   └── index.ts                        # ✅ All goal models (combined file)
│   │
│   ├── adapters/goals/
│   │   ├── goal.adapter.ts                 # ✅
│   │   ├── goalCategory.adapter.ts         # ✅
│   │   ├── objective.adapter.ts            # ✅
│   │   ├── keyResult.adapter.ts            # ✅
│   │   └── keyResultProgressUpdate.adapter.ts # ✅
│   │
│   ├── repositories/goals/
│   │   ├── goal.repository.ts              # ✅
│   │   ├── goalCategory.repository.ts      # ✅
│   │   ├── objective.repository.ts         # ✅
│   │   ├── keyResult.repository.ts         # ✅
│   │   └── keyResultProgressUpdate.repository.ts # ✅
│   │
│   ├── services/goals/
│   │   └── GoalsService.ts                 # ✅ Includes category and metrics methods
│   │
│   ├── components/dynamic/admin/goals/     # ✅ Phase 5b - Dynamic UI Components
│   │   ├── index.ts                        # ✅ Barrel exports
│   │   ├── GoalProgressRing.tsx            # ✅ Circular progress indicator
│   │   ├── GoalCard.tsx                    # ✅ Goal card with actions
│   │   ├── KeyResultProgressCard.tsx       # ✅ Key result progress display
│   │   ├── OKRTreeView.tsx                 # ✅ Hierarchical tree view
│   │   └── GoalStatusTimeline.tsx          # ✅ Activity timeline
│   │
│   └── lib/
│       ├── types.ts                        # ✅ Goal type symbols added
│       ├── container.ts                    # ✅ Services registered
│       ├── metadata/services/
│       │   └── admin-community-goals.ts    # ✅ Service handlers for metadata
│       └── metadata/components/
│           └── admin.tsx                   # ✅ Component registration (5 goal components)
│
├── metadata/authoring/blueprints/admin-community/
│   ├── planning-goals.xml                  # ✅ Dashboard/list page
│   ├── planning-goals-detail.xml           # ✅ Goal detail page
│   ├── planning-goals-manage.xml           # ✅ Goal create/edit page
│   ├── planning-goals-categories.xml       # ✅ Categories list page
│   └── planning-goals-categories-manage.xml # ✅ Category create/edit page
│
└── supabase/
    └── migrations/
        └── 20260108000000_create_goals_objectives_system.sql # ✅

e2e/
└── goals/                                  # 🔲 Phase 7
    ├── goals-crud.spec.ts
    ├── goals-progress.spec.ts
    └── goals-dashboard.spec.ts
```

---

## Appendix A: API Response Examples

### Goal List Response

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Increase Weekly Attendance by 20%",
      "description": "Strategic initiative to grow our congregation through improved outreach and engagement.",
      "category": {
        "id": "550e8400-e29b-41d4-a716-446655440010",
        "name": "Spiritual Growth",
        "code": "spiritual_growth",
        "color": "#8b5cf6",
        "icon": "heart"
      },
      "start_date": "2026-01-01",
      "target_date": "2026-12-31",
      "status": "on_track",
      "visibility": "staff",
      "overall_progress": 35.5,
      "owner_id": "550e8400-e29b-41d4-a716-446655440020",
      "owner_name": "Pastor John Smith",
      "tags": ["growth", "2026", "strategic"],
      "objectives_count": 4,
      "key_results_count": 12,
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-20T14:45:00Z"
    }
  ],
  "total": 15,
  "limit": 10,
  "offset": 0
}
```

### Goal Detail Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "Increase Weekly Attendance by 20%",
    "description": "Strategic initiative to grow our congregation...",
    "category": { "...": "..." },
    "start_date": "2026-01-01",
    "target_date": "2026-12-31",
    "status": "on_track",
    "visibility": "staff",
    "overall_progress": 35.5,
    "owner_id": "550e8400-e29b-41d4-a716-446655440020",
    "owner_name": "Pastor John Smith",
    "owner_email": "john@church.org",
    "tags": ["growth", "2026"],
    "objectives": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440030",
        "title": "Launch Guest Welcome Program",
        "description": "Implement a comprehensive welcome experience...",
        "ministry_department": "Guest Services",
        "responsible_id": "550e8400-e29b-41d4-a716-446655440021",
        "responsible_name": "Mary Johnson",
        "status": "in_progress",
        "priority": "high",
        "due_date": "2026-03-31",
        "overall_progress": 50.0,
        "sort_order": 1,
        "key_results": [
          {
            "id": "550e8400-e29b-41d4-a716-446655440040",
            "title": "Train 20 greeters",
            "metric_type": "number",
            "target_value": 20,
            "current_value": 12,
            "starting_value": 5,
            "unit_label": "greeters",
            "progress_percent": 46.67,
            "metric_link_type": "none",
            "update_frequency": "weekly",
            "next_update_due": "2026-01-27",
            "status": "active"
          }
        ]
      }
    ],
    "direct_key_results": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440050",
        "title": "Average weekly attendance",
        "metric_type": "number",
        "target_value": 600,
        "current_value": 520,
        "starting_value": 500,
        "unit_label": "attendees",
        "progress_percent": 20.0,
        "metric_link_type": "attendance_average",
        "update_frequency": "weekly",
        "last_auto_update_at": "2026-01-20T06:00:00Z",
        "status": "active"
      }
    ],
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-20T14:45:00Z"
  }
}
```

---

## Appendix B: UI Mockup Descriptions

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Goals & Objectives                           [+ Create Goal]    │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │ On Track │ │ At Risk  │ │ Behind   │ │ Complete │            │
│ │    8     │ │    3     │ │    2     │ │    5     │            │
│ │   53%    │ │   20%    │ │   13%    │ │   33%    │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ Progress Overview       │ │ Updates Due This Week           │ │
│ │                         │ │                                 │ │
│ │     [Donut Chart]       │ │ ○ Train 20 greeters    Due Tue │ │
│ │      45% Complete       │ │ ○ Increase giving      Due Thu │ │
│ │                         │ │ ○ Youth attendance     Due Sat │ │
│ │                         │ │                                 │ │
│ │ 23/51 Key Results Done  │ │ [View All →]                   │ │
│ └─────────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ Recent Activity                                                  │
│ ─────────────────────────────────────────────────────────────── │
│ ● John recorded progress on "Weekly attendance" (+25)  2h ago  │
│ ● Mary completed objective "Launch welcome program"    4h ago  │
│ ● New goal "2026 Building Fund" created by Admin       1d ago  │
│ [View All Activity →]                                           │
└─────────────────────────────────────────────────────────────────┘
```

### List View Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Goals                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search goals...                        [Filters ▼]       │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│ │ Title            │ Category │ Status   │ Progress │ Due    │ │
│ ├──────────────────┼──────────┼──────────┼──────────┼────────┤ │
│ │ ▶ Increase       │ 🟣 Spirit│ On Track │ ████░ 68%│ Dec 31 │ │
│ │   Attendance     │          │          │          │        │ │
│ │ ──────────────────────────────────────────────────────────── │
│ │   └─ Objectives (3)                                         │ │
│ │      └─ Launch Welcome Program    ████░ 50%    Mar 31     │ │
│ │      └─ Improve Online Presence   ██░░░ 30%    Jun 30     │ │
│ │      └─ Community Events          █░░░░ 15%    Sep 30     │ │
│ ├──────────────────┼──────────┼──────────┼──────────┼────────┤ │
│ │ ▷ 2026 Building  │ 🟢 Finan.│ At Risk  │ ██░░░ 25%│ Jun 30 │ │
│ │   Fund           │          │          │          │        │ │
│ ├──────────────────┼──────────┼──────────┼──────────┼────────┤ │
│ │ ▷ Youth Ministry │ 🔵 Minist│ On Track │ █████ 90%│ Mar 15 │ │
│ │   Growth         │          │          │          │        │ │
└─────────────────────────────────────────────────────────────────┘
```

### Goal Detail Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Back to Goals                              [Edit] [Archive]   │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 🟣 Spiritual Growth                           ON TRACK    │   │
│ │                                                           │   │
│ │ Increase Weekly Attendance by 20%                         │   │
│ │                                                           │   │
│ │ Strategic initiative to grow our congregation through     │   │
│ │ improved outreach and engagement programs.                │   │
│ │                                                           │   │
│ │ 📅 Jan 1 - Dec 31, 2026    👤 Pastor John Smith          │   │
│ │                                                           │   │
│ │         ┌─────────┐                                       │   │
│ │         │   68%   │ Overall Progress                      │   │
│ │         │  ████░  │                                       │   │
│ │         └─────────┘                                       │   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ Direct Key Results                              [+ Add]         │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📊 Average weekly attendance                              │   │
│ │    520 / 600 attendees              ████████░░ 87%       │   │
│ │    🔗 Auto-linked: attendance_average    [Record Progress]│   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ Objectives (3)                                  [+ Add]         │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ▼ Launch Guest Welcome Program              IN PROGRESS   │   │
│ │   Due: Mar 31  •  Mary Johnson  •  Guest Services         │   │
│ │   ████░░░░░░ 50%                                         │   │
│ │                                                           │   │
│ │   Key Results:                                            │   │
│ │   ├─ Train 20 greeters         12/20    ████░░ 60%      │   │
│ │   ├─ Create welcome packets    ✓ Done   █████ 100%      │   │
│ │   └─ First impressions survey  45/100   ███░░░ 45%      │   │
│ └───────────────────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ▷ Improve Online Presence                   PENDING       │   │
│ │   Due: Jun 30  •  Tech Team                               │   │
│ │   ██░░░░░░░░ 30%                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│ Activity                                                        │
│ ─────────────────────────────────────────────────────────────── │
│ ● Progress recorded: Weekly attendance +25 (John)    Today     │
│ ● Objective completed: Welcome packets (Mary)        Yesterday │
│ ● Status changed to On Track                         Jan 18    │
└─────────────────────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*
*Last Updated: January 2026*
*Author: Claude Code*
