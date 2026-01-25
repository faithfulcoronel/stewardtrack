-- ============================================================================
-- Migration: Backfill tenant_media table with existing media
-- ============================================================================
-- Description: Populates tenant_media with existing media from domain tables
-- This migration extracts media URLs from:
-- - tenants.logo_url (church logos)
-- - tenants.church_image_url (church images)
-- - members.cover_photo_url (member photos)
-- - ministry_schedules.cover_photo_url (schedule covers)
--
-- Note: File size will be 0 for backfilled records since we can't determine
-- the actual file size from the URL alone. The media service will update
-- these values when files are re-uploaded or when an admin triggers a sync.
-- ============================================================================

BEGIN;

-- =============================================================================
-- STEP 1: Backfill church logos from tenants.logo_url
-- =============================================================================
INSERT INTO public.tenant_media (
    tenant_id,
    bucket_name,
    file_path,
    public_url,
    original_filename,
    mime_type,
    file_size_bytes,
    category,
    entity_type,
    entity_id,
    entity_field,
    uploaded_at
)
SELECT
    t.id AS tenant_id,
    'profiles' AS bucket_name,
    -- Extract path from URL (after /storage/v1/object/public/profiles/)
    CASE
        WHEN t.logo_url LIKE '%/storage/v1/object/public/profiles/%' THEN
            substring(t.logo_url from '/storage/v1/object/public/profiles/(.+)$')
        ELSE
            'church-logos/' || t.id::TEXT || '/logo'
    END AS file_path,
    t.logo_url AS public_url,
    'logo' AS original_filename,
    'image/png' AS mime_type, -- Default, actual type unknown
    0 AS file_size_bytes,
    'church_logos'::media_category AS category,
    'tenant' AS entity_type,
    t.id AS entity_id,
    'logo_url' AS entity_field,
    COALESCE(t.updated_at, t.created_at, now()) AS uploaded_at
FROM public.tenants t
WHERE t.logo_url IS NOT NULL
    AND t.logo_url != ''
    AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, bucket_name, file_path) DO NOTHING;

-- =============================================================================
-- STEP 2: Backfill church images from tenants.church_image_url
-- =============================================================================
INSERT INTO public.tenant_media (
    tenant_id,
    bucket_name,
    file_path,
    public_url,
    original_filename,
    mime_type,
    file_size_bytes,
    category,
    entity_type,
    entity_id,
    entity_field,
    uploaded_at
)
SELECT
    t.id AS tenant_id,
    'profiles' AS bucket_name,
    CASE
        WHEN t.church_image_url LIKE '%/storage/v1/object/public/profiles/%' THEN
            substring(t.church_image_url from '/storage/v1/object/public/profiles/(.+)$')
        ELSE
            'church-images/' || t.id::TEXT || '/image'
    END AS file_path,
    t.church_image_url AS public_url,
    'church_image' AS original_filename,
    'image/jpeg' AS mime_type, -- Default, actual type unknown
    0 AS file_size_bytes,
    'church_images'::media_category AS category,
    'tenant' AS entity_type,
    t.id AS entity_id,
    'church_image_url' AS entity_field,
    COALESCE(t.updated_at, t.created_at, now()) AS uploaded_at
FROM public.tenants t
WHERE t.church_image_url IS NOT NULL
    AND t.church_image_url != ''
    AND t.deleted_at IS NULL
ON CONFLICT (tenant_id, bucket_name, file_path) DO NOTHING;

-- =============================================================================
-- STEP 3: Backfill member photos from members.cover_photo_url
-- =============================================================================
INSERT INTO public.tenant_media (
    tenant_id,
    bucket_name,
    file_path,
    public_url,
    original_filename,
    mime_type,
    file_size_bytes,
    category,
    entity_type,
    entity_id,
    entity_field,
    uploaded_at
)
SELECT
    m.tenant_id AS tenant_id,
    'profiles' AS bucket_name,
    CASE
        WHEN m.cover_photo_url LIKE '%/storage/v1/object/public/profiles/%' THEN
            substring(m.cover_photo_url from '/storage/v1/object/public/profiles/(.+)$')
        ELSE
            'member-photos/' || m.tenant_id::TEXT || '/' || m.id::TEXT
    END AS file_path,
    m.cover_photo_url AS public_url,
    'profile_photo' AS original_filename,
    'image/jpeg' AS mime_type, -- Default, actual type unknown
    0 AS file_size_bytes,
    'member_photos'::media_category AS category,
    'member' AS entity_type,
    m.id AS entity_id,
    'cover_photo_url' AS entity_field,
    COALESCE(m.updated_at, m.created_at, now()) AS uploaded_at
FROM public.members m
WHERE m.cover_photo_url IS NOT NULL
    AND m.cover_photo_url != ''
    AND m.tenant_id IS NOT NULL
ON CONFLICT (tenant_id, bucket_name, file_path) DO NOTHING;

-- =============================================================================
-- STEP 4: Backfill schedule covers from ministry_schedules.cover_photo_url
-- =============================================================================
INSERT INTO public.tenant_media (
    tenant_id,
    bucket_name,
    file_path,
    public_url,
    original_filename,
    mime_type,
    file_size_bytes,
    category,
    entity_type,
    entity_id,
    entity_field,
    uploaded_at
)
SELECT
    ms.tenant_id AS tenant_id,
    'schedule-covers' AS bucket_name,
    CASE
        WHEN ms.cover_photo_url LIKE '%/storage/v1/object/public/schedule-covers/%' THEN
            substring(ms.cover_photo_url from '/storage/v1/object/public/schedule-covers/(.+)$')
        ELSE
            ms.tenant_id::TEXT || '/' || ms.id::TEXT
    END AS file_path,
    ms.cover_photo_url AS public_url,
    'cover_photo' AS original_filename,
    'image/jpeg' AS mime_type, -- Default, actual type unknown
    0 AS file_size_bytes,
    'schedule_covers'::media_category AS category,
    'schedule' AS entity_type,
    ms.id AS entity_id,
    'cover_photo_url' AS entity_field,
    COALESCE(ms.updated_at, ms.created_at, now()) AS uploaded_at
FROM public.ministry_schedules ms
WHERE ms.cover_photo_url IS NOT NULL
    AND ms.cover_photo_url != ''
    AND ms.deleted_at IS NULL
ON CONFLICT (tenant_id, bucket_name, file_path) DO NOTHING;

COMMIT;

-- Success confirmation with counts
DO $$
DECLARE
    v_total_count INTEGER;
    v_logos_count INTEGER;
    v_church_images_count INTEGER;
    v_member_photos_count INTEGER;
    v_schedule_covers_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total_count FROM public.tenant_media;
    SELECT COUNT(*) INTO v_logos_count FROM public.tenant_media WHERE category = 'church_logos';
    SELECT COUNT(*) INTO v_church_images_count FROM public.tenant_media WHERE category = 'church_images';
    SELECT COUNT(*) INTO v_member_photos_count FROM public.tenant_media WHERE category = 'member_photos';
    SELECT COUNT(*) INTO v_schedule_covers_count FROM public.tenant_media WHERE category = 'schedule_covers';

    RAISE NOTICE 'Backfilled tenant_media table successfully';
    RAISE NOTICE 'Total media records: %', v_total_count;
    RAISE NOTICE '  - Church logos: %', v_logos_count;
    RAISE NOTICE '  - Church images: %', v_church_images_count;
    RAISE NOTICE '  - Member photos: %', v_member_photos_count;
    RAISE NOTICE '  - Schedule covers: %', v_schedule_covers_count;
END $$;
