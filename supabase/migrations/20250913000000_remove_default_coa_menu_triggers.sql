-- Remove automatic default chart of accounts and menu item triggers
-- These are now handled explicitly in handle_new_tenant_registration
DROP TRIGGER IF EXISTS create_default_chart_of_accounts_trigger ON tenants;
DROP TRIGGER IF EXISTS create_default_menu_items_trigger ON tenants;
