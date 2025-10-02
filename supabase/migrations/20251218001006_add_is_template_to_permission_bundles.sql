-- Add is_template column to permission_bundles table
ALTER TABLE permission_bundles
ADD COLUMN is_template boolean DEFAULT false NOT NULL;

-- Add index for filtering templates
CREATE INDEX permission_bundles_is_template_idx ON permission_bundles(is_template) WHERE is_template = true;

-- Add comment
COMMENT ON COLUMN permission_bundles.is_template IS 'Indicates if this bundle is a template that can be cloned for new tenants';
