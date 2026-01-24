-- Add confirmation_code column to schedule_registrations table
-- This column stores a unique confirmation code for each registration that can be shown to guests

ALTER TABLE public.schedule_registrations
ADD COLUMN IF NOT EXISTS confirmation_code TEXT;

-- Create an index for faster lookups by confirmation code
CREATE INDEX IF NOT EXISTS idx_schedule_registrations_confirmation_code
ON public.schedule_registrations(confirmation_code)
WHERE confirmation_code IS NOT NULL;

-- Add unique constraint to ensure confirmation codes are unique within a tenant
ALTER TABLE public.schedule_registrations
ADD CONSTRAINT unique_confirmation_code_per_tenant UNIQUE (tenant_id, confirmation_code);

-- Add comment for documentation
COMMENT ON COLUMN public.schedule_registrations.confirmation_code IS 'Unique confirmation code displayed to registrants for reference';
