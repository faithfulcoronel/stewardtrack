-- Drop the trigger and function for initializing tenant categories
DROP TRIGGER IF EXISTS initialize_tenant_categories ON tenants;
DROP FUNCTION IF EXISTS handle_new_tenant_categories() CASCADE;

-- Add helpful comment
COMMENT ON TABLE categories IS 
  'Categories are now initialized directly in the handle_new_tenant_registration function';