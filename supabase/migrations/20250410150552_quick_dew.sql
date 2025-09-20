/*
# Default Chart of Accounts for Churches

This migration creates a function to generate a default chart of accounts
for new church tenants. It includes standard accounts for:
- Assets (cash, bank accounts, receivables)
- Liabilities (payables, loans)
- Equity (retained earnings)
- Revenue (tithes, offerings, donations)
- Expenses (ministry, payroll, utilities, etc.)
*/

-- Function to create default chart of accounts for a tenant
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_tenant_id UUID, p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_asset_parent_id UUID;
  v_liability_parent_id UUID;
  v_equity_parent_id UUID;
  v_revenue_parent_id UUID;
  v_expense_parent_id UUID;
  v_cash_asset_id UUID;
  v_bank_asset_id UUID;
  v_receivable_asset_id UUID;
  v_fixed_asset_id UUID;
  v_current_liability_id UUID;
  v_long_term_liability_id UUID;
  v_tithe_revenue_id UUID;
  v_offering_revenue_id UUID;
  v_ministry_expense_id UUID;
  v_payroll_expense_id UUID;
  v_facility_expense_id UUID;
BEGIN
  -- Create parent accounts
  
  -- 1. Assets
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, is_active, 
    tenant_id, created_by, updated_by
  ) VALUES (
    '1000', 'Assets', 'Resources owned by the church', 'asset', TRUE,
    p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_asset_parent_id;
  
  -- 2. Liabilities
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, is_active, 
    tenant_id, created_by, updated_by
  ) VALUES (
    '2000', 'Liabilities', 'Obligations owed by the church', 'liability', TRUE,
    p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_liability_parent_id;
  
  -- 3. Equity
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, is_active, 
    tenant_id, created_by, updated_by
  ) VALUES (
    '3000', 'Equity', 'Church''s net worth', 'equity', TRUE,
    p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_equity_parent_id;
  
  -- 4. Revenue
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, is_active, 
    tenant_id, created_by, updated_by
  ) VALUES (
    '4000', 'Revenue', 'Income received by the church', 'revenue', TRUE,
    p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_revenue_parent_id;
  
  -- 5. Expenses
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, is_active, 
    tenant_id, created_by, updated_by
  ) VALUES (
    '5000', 'Expenses', 'Costs incurred by the church', 'expense', TRUE,
    p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_expense_parent_id;
  
  -- Create Asset sub-accounts
  
  -- Cash Assets
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '1100', 'Cash', 'Cash on hand', 'asset', 'current', TRUE,
    v_asset_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_cash_asset_id;
  
  -- Bank Assets
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '1200', 'Bank Accounts', 'Bank accounts owned by the church', 'asset', 'current', TRUE,
    v_asset_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_bank_asset_id;
  
  -- Receivables
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '1300', 'Accounts Receivable', 'Money owed to the church', 'asset', 'current', TRUE,
    v_asset_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_receivable_asset_id;
  
  -- Fixed Assets
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '1400', 'Fixed Assets', 'Long-term tangible property', 'asset', 'fixed', TRUE,
    v_asset_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_fixed_asset_id;
  
  -- Create specific asset accounts
  
  -- Cash sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('1101', 'Petty Cash', 'Small cash on hand for minor expenses', 'asset', 'current', TRUE,
     v_cash_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1102', 'Cash Drawer', 'Cash for daily operations', 'asset', 'current', TRUE,
     v_cash_asset_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Bank account sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('1201', 'Main Checking Account', 'Primary checking account', 'asset', 'current', TRUE,
     v_bank_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1202', 'Savings Account', 'Church savings account', 'asset', 'current', TRUE,
     v_bank_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1203', 'Building Fund Account', 'Designated account for building projects', 'asset', 'current', TRUE,
     v_bank_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1204', 'Missions Fund Account', 'Designated account for missions', 'asset', 'current', TRUE,
     v_bank_asset_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Fixed asset sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('1401', 'Church Building', 'Church building and property', 'asset', 'fixed', TRUE,
     v_fixed_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1402', 'Equipment', 'Church equipment', 'asset', 'fixed', TRUE,
     v_fixed_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1403', 'Vehicles', 'Church vehicles', 'asset', 'fixed', TRUE,
     v_fixed_asset_id, p_tenant_id, p_user_id, p_user_id),
    ('1404', 'Furniture and Fixtures', 'Church furniture and fixtures', 'asset', 'fixed', TRUE,
     v_fixed_asset_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Create Liability sub-accounts
  
  -- Current Liabilities
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '2100', 'Current Liabilities', 'Short-term obligations', 'liability', 'current', TRUE,
    v_liability_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_current_liability_id;
  
  -- Long-term Liabilities
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '2200', 'Long-term Liabilities', 'Long-term obligations', 'liability', 'long-term', TRUE,
    v_liability_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_long_term_liability_id;
  
  -- Create specific liability accounts
  
  -- Current liability sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('2101', 'Accounts Payable', 'Money owed to vendors', 'liability', 'current', TRUE,
     v_current_liability_id, p_tenant_id, p_user_id, p_user_id),
    ('2102', 'Accrued Expenses', 'Expenses incurred but not yet paid', 'liability', 'current', TRUE,
     v_current_liability_id, p_tenant_id, p_user_id, p_user_id),
    ('2103', 'Payroll Liabilities', 'Payroll taxes and withholdings', 'liability', 'current', TRUE,
     v_current_liability_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Long-term liability sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('2201', 'Mortgage Payable', 'Church building mortgage', 'liability', 'long-term', TRUE,
     v_long_term_liability_id, p_tenant_id, p_user_id, p_user_id),
    ('2202', 'Long-term Loans', 'Other long-term loans', 'liability', 'long-term', TRUE,
     v_long_term_liability_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Create Equity accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('3100', 'Retained Earnings', 'Accumulated surplus or deficit', 'equity', NULL, TRUE,
     v_equity_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('3200', 'Designated Funds', 'Funds designated for specific purposes', 'equity', NULL, TRUE,
     v_equity_parent_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Create Revenue sub-accounts
  
  -- Tithes
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '4100', 'Tithes', 'Regular tithes from members', 'revenue', NULL, TRUE,
    v_revenue_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_tithe_revenue_id;
  
  -- Offerings
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '4200', 'Offerings', 'Various offerings', 'revenue', NULL, TRUE,
    v_revenue_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_offering_revenue_id;
  
  -- Create specific revenue accounts
  
  -- Tithe sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('4101', 'Regular Tithes', 'Regular tithes from members', 'revenue', NULL, TRUE,
     v_tithe_revenue_id, p_tenant_id, p_user_id, p_user_id),
    ('4102', 'First Fruits', 'First fruits offerings', 'revenue', NULL, TRUE,
     v_tithe_revenue_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Offering sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('4201', 'Love Offerings', 'Love offerings', 'revenue', NULL, TRUE,
     v_offering_revenue_id, p_tenant_id, p_user_id, p_user_id),
    ('4202', 'Mission Offerings', 'Offerings for missions', 'revenue', NULL, TRUE,
     v_offering_revenue_id, p_tenant_id, p_user_id, p_user_id),
    ('4203', 'Building Offerings', 'Offerings for building projects', 'revenue', NULL, TRUE,
     v_offering_revenue_id, p_tenant_id, p_user_id, p_user_id),
    ('4204', 'Special Offerings', 'Special purpose offerings', 'revenue', NULL, TRUE,
     v_offering_revenue_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Other revenue accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('4300', 'Donations', 'General donations', 'revenue', NULL, TRUE,
     v_revenue_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('4400', 'Fundraising', 'Income from fundraising activities', 'revenue', NULL, TRUE,
     v_revenue_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('4500', 'Interest Income', 'Income from interest', 'revenue', NULL, TRUE,
     v_revenue_parent_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Create Expense sub-accounts
  
  -- Ministry Expenses
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '5100', 'Ministry Expenses', 'Expenses related to ministry activities', 'expense', NULL, TRUE,
    v_expense_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_ministry_expense_id;
  
  -- Payroll Expenses
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '5200', 'Payroll Expenses', 'Expenses related to staff compensation', 'expense', NULL, TRUE,
    v_expense_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_payroll_expense_id;
  
  -- Facility Expenses
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES (
    '5300', 'Facility Expenses', 'Expenses related to church facilities', 'expense', NULL, TRUE,
    v_expense_parent_id, p_tenant_id, p_user_id, p_user_id
  ) RETURNING id INTO v_facility_expense_id;
  
  -- Create specific expense accounts
  
  -- Ministry expense sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('5101', 'Children''s Ministry', 'Expenses for children''s ministry', 'expense', NULL, TRUE,
     v_ministry_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5102', 'Youth Ministry', 'Expenses for youth ministry', 'expense', NULL, TRUE,
     v_ministry_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5103', 'Adult Ministry', 'Expenses for adult ministry', 'expense', NULL, TRUE,
     v_ministry_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5104', 'Worship Ministry', 'Expenses for worship ministry', 'expense', NULL, TRUE,
     v_ministry_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5105', 'Outreach Ministry', 'Expenses for outreach ministry', 'expense', NULL, TRUE,
     v_ministry_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5106', 'Missions', 'Expenses for missions', 'expense', NULL, TRUE,
     v_ministry_expense_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Payroll expense sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('5201', 'Pastoral Salaries', 'Salaries for pastoral staff', 'expense', NULL, TRUE,
     v_payroll_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5202', 'Administrative Salaries', 'Salaries for administrative staff', 'expense', NULL, TRUE,
     v_payroll_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5203', 'Ministry Staff Salaries', 'Salaries for ministry staff', 'expense', NULL, TRUE,
     v_payroll_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5204', 'Payroll Taxes', 'Employer portion of payroll taxes', 'expense', NULL, TRUE,
     v_payroll_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5205', 'Employee Benefits', 'Employee benefits', 'expense', NULL, TRUE,
     v_payroll_expense_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Facility expense sub-accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('5301', 'Utilities', 'Utility expenses', 'expense', NULL, TRUE,
     v_facility_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5302', 'Maintenance', 'Building maintenance', 'expense', NULL, TRUE,
     v_facility_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5303', 'Insurance', 'Property and liability insurance', 'expense', NULL, TRUE,
     v_facility_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5304', 'Mortgage/Rent', 'Building mortgage or rent', 'expense', NULL, TRUE,
     v_facility_expense_id, p_tenant_id, p_user_id, p_user_id),
    ('5305', 'Supplies', 'Facility supplies', 'expense', NULL, TRUE,
     v_facility_expense_id, p_tenant_id, p_user_id, p_user_id);
  
  -- Other expense accounts
  INSERT INTO chart_of_accounts (
    code, name, description, account_type, account_subtype, is_active, 
    parent_id, tenant_id, created_by, updated_by
  ) VALUES 
    ('5400', 'Office Expenses', 'General office expenses', 'expense', NULL, TRUE,
     v_expense_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('5500', 'Technology', 'Technology expenses', 'expense', NULL, TRUE,
     v_expense_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('5600', 'Events', 'Event expenses', 'expense', NULL, TRUE,
     v_expense_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('5700', 'Professional Services', 'Professional service fees', 'expense', NULL, TRUE,
     v_expense_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('5800', 'Depreciation', 'Depreciation expense', 'expense', NULL, TRUE,
     v_expense_parent_id, p_tenant_id, p_user_id, p_user_id),
    ('5900', 'Miscellaneous', 'Miscellaneous expenses', 'expense', NULL, TRUE,
     v_expense_parent_id, p_tenant_id, p_user_id, p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to create default chart of accounts for new tenants
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_new_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the function to create default chart of accounts
  PERFORM create_default_chart_of_accounts(NEW.id, NEW.created_by);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create default chart of accounts for new tenants
DROP TRIGGER IF EXISTS create_default_chart_of_accounts_trigger ON tenants;
CREATE TRIGGER create_default_chart_of_accounts_trigger
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION create_default_chart_of_accounts_for_new_tenant();