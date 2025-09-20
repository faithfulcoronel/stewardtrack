-- Ensure new tenants receive a full chart of accounts hierarchy
-- by calling the helper that sets parent relationships.
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    PERFORM create_default_chart_of_accounts_for_tenant(NEW.id, NEW.created_by);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error creating default chart of accounts for tenant %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

