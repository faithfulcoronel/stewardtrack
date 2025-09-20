/*
# Update Chart of Accounts Trigger Function

This migration updates the existing trigger function to ensure it doesn't break
when creating default chart of accounts for new tenants.
*/

-- Update the trigger function to handle potential errors gracefully
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default chart of accounts for the new tenant
    BEGIN
        PERFORM create_default_chart_of_accounts_for_tenant(NEW.id, NEW.created_by);
        EXCEPTION WHEN OTHERS THEN
            -- Log error but don't prevent tenant creation
            RAISE WARNING 'Error creating default chart of accounts for tenant %: %', NEW.id, SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger is properly set
DROP TRIGGER IF EXISTS create_default_chart_of_accounts_trigger ON tenants;
CREATE TRIGGER create_default_chart_of_accounts_trigger
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION create_default_chart_of_accounts_for_new_tenant();