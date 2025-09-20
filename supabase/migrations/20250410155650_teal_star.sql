/*
# Create Default Chart of Accounts for Existing Tenants

1. New Functions
  - create_default_chart_of_accounts_for_tenant: Creates a standard chart of accounts for a specific tenant
  - create_default_chart_of_accounts_for_new_tenant: Trigger function to create accounts for new tenants
  - create_default_chart_of_accounts_for_all_tenants: Creates accounts for all existing tenants

2. Trigger
  - create_default_chart_of_accounts_trigger: Automatically creates accounts when a new tenant is created

This migration ensures all tenants have a standardized chart of accounts for financial tracking.
*/

-- Function to create a default chart of accounts for a specific tenant
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_tenant(p_tenant_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_asset_parent_id UUID;
    v_liability_parent_id UUID;
    v_equity_parent_id UUID;
    v_revenue_parent_id UUID;
    v_expense_parent_id UUID;
    v_cash_parent_id UUID;
    v_bank_parent_id UUID;
    v_ministry_expense_parent_id UUID;
    v_payroll_expense_parent_id UUID;
    v_facilities_expense_parent_id UUID;
    v_admin_expense_parent_id UUID;
BEGIN
    -- Check if tenant already has chart of accounts
    IF EXISTS (
        SELECT 1 FROM chart_of_accounts 
        WHERE tenant_id = p_tenant_id
        LIMIT 1
    ) THEN
        RAISE NOTICE 'Tenant % already has chart of accounts. Skipping.', p_tenant_id;
        RETURN;
    END IF;

    -- Create main account categories
    -- Assets (1000)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, created_by, updated_by
    ) VALUES (
        p_tenant_id, '1000', 'Assets', 'Resources owned by the church', 'asset', TRUE, p_user_id, p_user_id
    ) RETURNING id INTO v_asset_parent_id;

    -- Liabilities (2000)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, created_by, updated_by
    ) VALUES (
        p_tenant_id, '2000', 'Liabilities', 'Debts and obligations owed by the church', 'liability', TRUE, p_user_id, p_user_id
    ) RETURNING id INTO v_liability_parent_id;

    -- Equity (3000)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, created_by, updated_by
    ) VALUES (
        p_tenant_id, '3000', 'Equity', 'Net assets of the church', 'equity', TRUE, p_user_id, p_user_id
    ) RETURNING id INTO v_equity_parent_id;

    -- Revenue (4000)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, created_by, updated_by
    ) VALUES (
        p_tenant_id, '4000', 'Revenue', 'Income received by the church', 'revenue', TRUE, p_user_id, p_user_id
    ) RETURNING id INTO v_revenue_parent_id;

    -- Expenses (5000)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, created_by, updated_by
    ) VALUES (
        p_tenant_id, '5000', 'Expenses', 'Costs incurred by the church', 'expense', TRUE, p_user_id, p_user_id
    ) RETURNING id INTO v_expense_parent_id;

    -- Create Asset subcategories
    -- Cash (1100)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES (
        p_tenant_id, '1100', 'Cash', 'Cash on hand', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id
    ) RETURNING id INTO v_cash_parent_id;

    -- Cash accounts
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '1101', 'Petty Cash', 'Small cash fund for minor expenses', 'asset', TRUE, v_cash_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1102', 'Cash on Hand', 'Cash kept in the church safe', 'asset', TRUE, v_cash_parent_id, p_user_id, p_user_id);

    -- Bank Accounts (1200)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES (
        p_tenant_id, '1200', 'Bank Accounts', 'Funds held in bank accounts', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id
    ) RETURNING id INTO v_bank_parent_id;

    -- Bank account types
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '1201', 'Main Checking Account', 'Primary operating account', 'asset', TRUE, v_bank_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1202', 'Savings Account', 'Church savings account', 'asset', TRUE, v_bank_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1203', 'Building Fund Account', 'Designated account for building projects', 'asset', TRUE, v_bank_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1204', 'Missions Fund Account', 'Designated account for mission projects', 'asset', TRUE, v_bank_parent_id, p_user_id, p_user_id);

    -- Other Assets (1300)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '1300', 'Accounts Receivable', 'Amounts owed to the church', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1400', 'Prepaid Expenses', 'Expenses paid in advance', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1500', 'Fixed Assets', 'Long-term tangible property', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1501', 'Church Building', 'Church building and property', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1502', 'Furniture and Equipment', 'Church furniture and equipment', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1503', 'Vehicles', 'Church-owned vehicles', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '1600', 'Accumulated Depreciation', 'Accumulated depreciation of fixed assets', 'asset', TRUE, v_asset_parent_id, p_user_id, p_user_id);

    -- Create Liability subcategories
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '2100', 'Accounts Payable', 'Amounts owed by the church', 'liability', TRUE, v_liability_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '2200', 'Accrued Expenses', 'Expenses incurred but not yet paid', 'liability', TRUE, v_liability_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '2300', 'Payroll Liabilities', 'Amounts owed to employees and tax authorities', 'liability', TRUE, v_liability_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '2400', 'Loans Payable', 'Loans owed by the church', 'liability', TRUE, v_liability_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '2500', 'Designated Fund Liabilities', 'Funds designated for specific purposes', 'liability', TRUE, v_liability_parent_id, p_user_id, p_user_id);

    -- Create Equity subcategories
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '3100', 'Opening Balance Equity', 'Initial equity balance', 'equity', TRUE, v_equity_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '3200', 'Retained Earnings', 'Accumulated earnings from prior years', 'equity', TRUE, v_equity_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '3300', 'Net Income', 'Current year net income', 'equity', TRUE, v_equity_parent_id, p_user_id, p_user_id);

    -- Create Revenue subcategories
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '4100', 'Tithes', 'Regular tithes from members', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4101', 'Regular Tithes', 'Regular tithes from members', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4102', 'First Fruit Offerings', 'First fruit offerings', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4200', 'Offerings', 'Various offerings', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4201', 'Love Offerings', 'Love offerings', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4202', 'Mission Offerings', 'Offerings for mission work', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4203', 'Building Offerings', 'Offerings for building projects', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4204', 'Special Offerings', 'Special event offerings', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4300', 'Donations', 'General donations', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4400', 'Fundraising', 'Income from fundraising activities', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4500', 'Rental Income', 'Income from renting church facilities', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4600', 'Interest Income', 'Interest earned on bank accounts', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '4700', 'Miscellaneous Income', 'Other income sources', 'revenue', TRUE, v_revenue_parent_id, p_user_id, p_user_id);

    -- Create Expense subcategories
    -- Ministry Expenses (5100)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES (
        p_tenant_id, '5100', 'Ministry Expenses', 'Expenses related to church ministries', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id
    ) RETURNING id INTO v_ministry_expense_parent_id;

    -- Ministry expense types
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '5101', 'Worship Ministry', 'Worship team and music expenses', 'expense', TRUE, v_ministry_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5102', 'Childrens Ministry', 'Childrens program expenses', 'expense', TRUE, v_ministry_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5103', 'Youth Ministry', 'Youth program expenses', 'expense', TRUE, v_ministry_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5104', 'Adult Ministry', 'Adult education and small group expenses', 'expense', TRUE, v_ministry_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5105', 'Outreach Ministry', 'Community outreach expenses', 'expense', TRUE, v_ministry_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5106', 'Missions', 'Mission support and expenses', 'expense', TRUE, v_ministry_expense_parent_id, p_user_id, p_user_id);

    -- Payroll Expenses (5200)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES (
        p_tenant_id, '5200', 'Payroll Expenses', 'Staff salaries and benefits', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id
    ) RETURNING id INTO v_payroll_expense_parent_id;

    -- Payroll expense types
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '5201', 'Pastoral Salaries', 'Salaries for pastoral staff', 'expense', TRUE, v_payroll_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5202', 'Administrative Salaries', 'Salaries for administrative staff', 'expense', TRUE, v_payroll_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5203', 'Ministry Staff Salaries', 'Salaries for ministry staff', 'expense', TRUE, v_payroll_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5204', 'Employee Benefits', 'Health insurance and other benefits', 'expense', TRUE, v_payroll_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5205', 'Payroll Taxes', 'Employer portion of payroll taxes', 'expense', TRUE, v_payroll_expense_parent_id, p_user_id, p_user_id);

    -- Facilities Expenses (5300)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES (
        p_tenant_id, '5300', 'Facilities Expenses', 'Building and property expenses', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id
    ) RETURNING id INTO v_facilities_expense_parent_id;

    -- Facilities expense types
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '5301', 'Utilities', 'Electricity, water, gas, etc.', 'expense', TRUE, v_facilities_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5302', 'Maintenance', 'Building and grounds maintenance', 'expense', TRUE, v_facilities_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5303', 'Cleaning', 'Janitorial services and supplies', 'expense', TRUE, v_facilities_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5304', 'Rent/Mortgage', 'Building rent or mortgage payments', 'expense', TRUE, v_facilities_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5305', 'Insurance', 'Property and liability insurance', 'expense', TRUE, v_facilities_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5306', 'Property Taxes', 'Property taxes if applicable', 'expense', TRUE, v_facilities_expense_parent_id, p_user_id, p_user_id);

    -- Administrative Expenses (5400)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES (
        p_tenant_id, '5400', 'Administrative Expenses', 'Office and administrative expenses', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id
    ) RETURNING id INTO v_admin_expense_parent_id;

    -- Administrative expense types
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '5401', 'Office Supplies', 'Paper, pens, and other office supplies', 'expense', TRUE, v_admin_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5402', 'Printing and Copying', 'Printing and copying expenses', 'expense', TRUE, v_admin_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5403', 'Postage', 'Postage and shipping expenses', 'expense', TRUE, v_admin_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5404', 'Telephone', 'Telephone and internet expenses', 'expense', TRUE, v_admin_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5405', 'Software and Technology', 'Software subscriptions and technology expenses', 'expense', TRUE, v_admin_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5406', 'Professional Services', 'Accounting, legal, and other professional services', 'expense', TRUE, v_admin_expense_parent_id, p_user_id, p_user_id);

    -- Other Expenses (5500-5900)
    INSERT INTO chart_of_accounts (
        tenant_id, code, name, description, account_type, is_active, parent_id, created_by, updated_by
    ) VALUES
        (p_tenant_id, '5500', 'Events and Programs', 'Special events and program expenses', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5600', 'Education and Training', 'Staff and volunteer education expenses', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5700', 'Travel', 'Travel expenses for staff and volunteers', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5800', 'Benevolence', 'Assistance to individuals in need', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id),
        (p_tenant_id, '5900', 'Miscellaneous Expenses', 'Expenses not categorized elsewhere', 'expense', TRUE, v_expense_parent_id, p_user_id, p_user_id);

    RAISE NOTICE 'Created default chart of accounts for tenant %', p_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create default chart of accounts when a new tenant is created
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
    -- Create default chart of accounts for the new tenant
    PERFORM create_default_chart_of_accounts_for_tenant(NEW.id, NEW.created_by);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create chart of accounts for new tenants
DROP TRIGGER IF EXISTS create_default_chart_of_accounts_trigger ON tenants;
CREATE TRIGGER create_default_chart_of_accounts_trigger
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION create_default_chart_of_accounts_for_new_tenant();

-- Function to create default chart of accounts for all existing tenants
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_all_tenants()
RETURNS VOID AS $$
DECLARE
    v_tenant RECORD;
    v_admin_user_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- Find an admin user to use as the creator
    SELECT user_id INTO v_admin_user_id
    FROM tenant_users
    WHERE user_id IN (
        SELECT user_id FROM user_roles
        JOIN roles ON user_roles.role_id = roles.id
        WHERE roles.name = 'admin'
    )
    LIMIT 1;
    
    -- If no admin user found, use the first user
    IF v_admin_user_id IS NULL THEN
        SELECT user_id INTO v_admin_user_id
        FROM tenant_users
        LIMIT 1;
    END IF;
    
    -- Process each tenant
    FOR v_tenant IN 
        SELECT id FROM tenants
        WHERE NOT EXISTS (
            SELECT 1 FROM chart_of_accounts 
            WHERE tenant_id = tenants.id
            LIMIT 1
        )
    LOOP
        PERFORM create_default_chart_of_accounts_for_tenant(v_tenant.id, v_admin_user_id);
        v_count := v_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Created default chart of accounts for % tenants', v_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create chart of accounts for all existing tenants
SELECT create_default_chart_of_accounts_for_all_tenants();