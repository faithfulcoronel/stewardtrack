-- Drop the unique constraint on subdomain
ALTER TABLE tenants
DROP CONSTRAINT IF EXISTS tenants_subdomain_key;

-- Add helpful comment
COMMENT ON COLUMN tenants.subdomain IS 
  'The tenant''s subdomain. No longer required to be unique.';