-- ============================================================================
-- Migration: Create tenant_media table for Media Gallery
-- ============================================================================
-- Description: Adds a centralized media tracking table for tenant-uploaded files
-- This enables the Media Gallery feature in admin settings to:
-- - View all uploaded media files in a centralized gallery
-- - See storage usage (bytes used, file count)
-- - Delete media with dependency warnings
-- - Maintain proper tenant isolation for all media
--
-- Tables affected:
-- - tenant_media (new): Tracks all uploaded media files
--
-- Functions added:
-- - get_tenant_storage_usage(): Returns storage stats by tenant
-- - get_media_dependencies(): Finds entities using a media URL
-- ============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Create media category enum
-- =============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_category') THEN
        CREATE TYPE media_category AS ENUM (
            'church_logos',
            'church_images',
            'member_photos',
            'editor_images',
            'schedule_covers',
            'other'
        );
    END IF;
END $$;

-- =============================================================================
-- STEP 2: Create tenant_media table
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

    -- File identification
    bucket_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,

    -- Metadata
    original_filename TEXT,
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    category media_category NOT NULL DEFAULT 'other',

    -- Entity references (dependency tracking)
    entity_type TEXT,  -- 'member', 'tenant', 'schedule', etc.
    entity_id UUID,
    entity_field TEXT, -- 'photo_url', 'logo_url', 'cover_photo_url', etc.

    -- Audit
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT unique_tenant_media_path UNIQUE (tenant_id, bucket_name, file_path)
);

-- =============================================================================
-- STEP 3: Create indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_tenant_media_tenant_id ON public.tenant_media(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_media_category ON public.tenant_media(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_tenant_media_not_deleted ON public.tenant_media(tenant_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_media_entity ON public.tenant_media(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_media_public_url ON public.tenant_media(public_url);

-- =============================================================================
-- STEP 4: Enable RLS
-- =============================================================================
ALTER TABLE public.tenant_media ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_media' AND policyname = 'tenant_media_select') THEN
        CREATE POLICY "tenant_media_select" ON public.tenant_media
            FOR SELECT USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_media' AND policyname = 'tenant_media_insert') THEN
        CREATE POLICY "tenant_media_insert" ON public.tenant_media
            FOR INSERT WITH CHECK (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_media' AND policyname = 'tenant_media_update') THEN
        CREATE POLICY "tenant_media_update" ON public.tenant_media
            FOR UPDATE USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_media' AND policyname = 'tenant_media_delete') THEN
        CREATE POLICY "tenant_media_delete" ON public.tenant_media
            FOR DELETE USING (
                tenant_id IN (
                    SELECT tenant_id FROM public.tenant_users
                    WHERE user_id = auth.uid()
                )
            );
    END IF;

    -- Service role policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tenant_media' AND policyname = 'tenant_media_service_role') THEN
        CREATE POLICY "tenant_media_service_role" ON public.tenant_media
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Create helper functions
-- =============================================================================

-- Function: Get storage usage for a tenant
CREATE OR REPLACE FUNCTION public.get_tenant_storage_usage(p_tenant_id UUID)
RETURNS TABLE(
    total_files BIGINT,
    total_bytes BIGINT,
    by_category JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT AS total_files,
        COALESCE(SUM(file_size_bytes), 0)::BIGINT AS total_bytes,
        COALESCE(
            (
                SELECT jsonb_object_agg(
                    category_stats.cat::TEXT,
                    jsonb_build_object(
                        'count', category_stats.cnt,
                        'bytes', category_stats.bytes
                    )
                )
                FROM (
                    SELECT
                        tm.category AS cat,
                        COUNT(*)::BIGINT AS cnt,
                        COALESCE(SUM(tm.file_size_bytes), 0)::BIGINT AS bytes
                    FROM public.tenant_media tm
                    WHERE tm.tenant_id = p_tenant_id AND tm.deleted_at IS NULL
                    GROUP BY tm.category
                ) category_stats
            ),
            '{}'::JSONB
        ) AS by_category
    FROM public.tenant_media
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get media dependencies (entities using a media URL)
CREATE OR REPLACE FUNCTION public.get_media_dependencies(p_public_url TEXT, p_tenant_id UUID)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    entity_name TEXT,
    entity_field TEXT
) AS $$
BEGIN
    -- Check tenants table for logo_url
    RETURN QUERY
    SELECT
        'tenant'::TEXT AS entity_type,
        t.id AS entity_id,
        t.name AS entity_name,
        'logo_url'::TEXT AS entity_field
    FROM public.tenants t
    WHERE t.id = p_tenant_id AND t.logo_url = p_public_url;

    -- Check tenants table for church_image_url
    RETURN QUERY
    SELECT
        'tenant'::TEXT AS entity_type,
        t.id AS entity_id,
        t.name AS entity_name,
        'church_image_url'::TEXT AS entity_field
    FROM public.tenants t
    WHERE t.id = p_tenant_id AND t.church_image_url = p_public_url;

    -- Check members table for photo_url
    RETURN QUERY
    SELECT
        'member'::TEXT AS entity_type,
        m.id AS entity_id,
        (COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, ''))::TEXT AS entity_name,
        'photo_url'::TEXT AS entity_field
    FROM public.members m
    WHERE m.tenant_id = p_tenant_id AND m.photo_url = p_public_url;

    -- Check ministry_schedules table for cover_photo_url
    RETURN QUERY
    SELECT
        'schedule'::TEXT AS entity_type,
        ms.id AS entity_id,
        ms.name AS entity_name,
        'cover_photo_url'::TEXT AS entity_field
    FROM public.ministry_schedules ms
    WHERE ms.tenant_id = p_tenant_id AND ms.cover_photo_url = p_public_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- STEP 6: Create triggers
-- =============================================================================

-- Trigger to update updated_at (uses existing function)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenant_media_updated_at') THEN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
            CREATE TRIGGER set_tenant_media_updated_at
                BEFORE UPDATE ON public.tenant_media
                FOR EACH ROW
                EXECUTE FUNCTION public.update_updated_at_column();
        END IF;
    END IF;
END $$;

-- =============================================================================
-- STEP 7: Add comments
-- =============================================================================
COMMENT ON TABLE public.tenant_media IS 'Centralized tracking table for all tenant-uploaded media files';
COMMENT ON COLUMN public.tenant_media.bucket_name IS 'Supabase Storage bucket name (profiles, schedule-covers)';
COMMENT ON COLUMN public.tenant_media.file_path IS 'Path within the bucket (e.g., church-logos/{tenantId}/logo.png)';
COMMENT ON COLUMN public.tenant_media.public_url IS 'Full public URL to access the file';
COMMENT ON COLUMN public.tenant_media.category IS 'Media category for filtering and organization';
COMMENT ON COLUMN public.tenant_media.entity_type IS 'Type of entity this media is attached to (tenant, member, schedule)';
COMMENT ON COLUMN public.tenant_media.entity_id IS 'ID of the entity this media is attached to';
COMMENT ON COLUMN public.tenant_media.entity_field IS 'Field name on the entity that stores this media URL';
COMMENT ON COLUMN public.tenant_media.deleted_at IS 'Soft delete timestamp - media is hidden but not removed from storage';

COMMENT ON FUNCTION public.get_tenant_storage_usage(UUID) IS 'Returns storage usage statistics for a tenant including total files, bytes, and breakdown by category';
COMMENT ON FUNCTION public.get_media_dependencies(TEXT, UUID) IS 'Returns list of entities that reference a given media URL';

COMMIT;

-- Success confirmation
DO $$
BEGIN
    RAISE NOTICE 'Created tenant_media table and helper functions successfully';
END $$;
