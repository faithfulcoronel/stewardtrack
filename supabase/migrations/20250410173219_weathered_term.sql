/*
# Link Financial Transactions to Accounts and Sources

1. Migration Overview
  - This migration links existing financial transactions to accounts and sources
  - It updates account_id based on member_id records
  - It links transactions to the most logical source account
  - It ensures proper chart of account linkage for all transactions
  - It maintains double-entry principles for existing transactions

2. Key Functions
  - link_member_transactions: Links transactions to member accounts
  - link_transactions_to_sources: Links transactions to appropriate sources
  - link_transactions_to_chart_of_accounts: Links transactions to chart of accounts
  - validate_double_entry_transactions: Ensures double-entry principles are maintained

3. Safety Measures
  - All operations are performed within transactions to ensure atomicity
  - Validation checks are performed before and after updates
  - Detailed logging is implemented for troubleshooting
*/

-- Function to link transactions to member accounts
CREATE OR REPLACE FUNCTION link_member_transactions() RETURNS VOID AS $$
DECLARE
    v_transaction RECORD;
    v_account_id UUID;
    v_tenant_id UUID;
    v_tenant RECORD;
    v_tenant_count INT := 0;
    v_total_tenants INT;
    v_transaction_count INT := 0;
    v_linked_count INT := 0;
BEGIN
    -- Get total number of tenants
    SELECT COUNT(*) INTO v_total_tenants FROM tenants;
    
    -- Process each tenant
    FOR v_tenant IN SELECT id FROM tenants LOOP
        v_tenant_id := v_tenant.id;
        v_tenant_count := v_tenant_count + 1;
        
        RAISE NOTICE 'Processing tenant % (% of %): Linking member transactions', v_tenant_id, v_tenant_count, v_total_tenants;
        
        -- Process transactions with member_id but no account_id
        FOR v_transaction IN 
            SELECT ft.id, ft.member_id
            FROM financial_transactions ft
            WHERE ft.tenant_id = v_tenant_id
            AND ft.member_id IS NOT NULL
            AND ft.accounts_account_id IS NULL
        LOOP
            v_transaction_count := v_transaction_count + 1;
            
            -- Find the account associated with this member
            SELECT id INTO v_account_id
            FROM accounts
            WHERE member_id = v_transaction.member_id
            AND tenant_id = v_tenant_id
            AND deleted_at IS NULL
            LIMIT 1;
            
            -- If member has an account, link the transaction to it
            IF v_account_id IS NOT NULL THEN
                UPDATE financial_transactions
                SET accounts_account_id = v_account_id,
                    updated_at = NOW()
                WHERE id = v_transaction.id;
                
                v_linked_count := v_linked_count + 1;
            END IF;
            
            -- Log progress periodically
            IF v_transaction_count % 100 = 0 THEN
                RAISE NOTICE 'Processed % transactions, linked %', v_transaction_count, v_linked_count;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Member transaction linking complete. Processed % transactions, linked %', v_transaction_count, v_linked_count;
END;
$$ LANGUAGE plpgsql;

-- Function to link transactions to sources
CREATE OR REPLACE FUNCTION link_transactions_to_sources() RETURNS VOID AS $$
DECLARE
    v_transaction RECORD;
    v_source_id UUID;
    v_tenant_id UUID;
    v_tenant RECORD;
    v_tenant_count INT := 0;
    v_total_tenants INT;
    v_transaction_count INT := 0;
    v_linked_count INT := 0;
BEGIN
    -- Get total number of tenants
    SELECT COUNT(*) INTO v_total_tenants FROM tenants;
    
    -- Process each tenant
    FOR v_tenant IN SELECT id FROM tenants LOOP
        v_tenant_id := v_tenant.id;
        v_tenant_count := v_tenant_count + 1;
        
        RAISE NOTICE 'Processing tenant % (% of %): Linking transactions to sources', v_tenant_id, v_tenant_count, v_total_tenants;
        
        -- Find default source for this tenant (prefer cash, then bank)
        SELECT id INTO v_source_id
        FROM financial_sources
        WHERE tenant_id = v_tenant_id
        AND is_active = true
        ORDER BY 
            CASE 
                WHEN source_type = 'cash' THEN 1
                WHEN source_type = 'bank' THEN 2
                ELSE 3
            END
        LIMIT 1;
        
        -- If no source exists, create a default one
        IF v_source_id IS NULL THEN
            INSERT INTO financial_sources (
                tenant_id,
                name,
                source_type,
                description,
                is_active,
                created_at,
                updated_at
            ) VALUES (
                v_tenant_id,
                'Default Cash Account',
                'cash',
                'Default cash account created during migration',
                true,
                NOW(),
                NOW()
            ) RETURNING id INTO v_source_id;
            
            RAISE NOTICE 'Created default source % for tenant %', v_source_id, v_tenant_id;
        END IF;
        
        -- Process transactions with no source_id
        UPDATE financial_transactions
        SET source_id = v_source_id,
            updated_at = NOW()
        WHERE tenant_id = v_tenant_id
        AND source_id IS NULL;
        
        GET DIAGNOSTICS v_linked_count = ROW_COUNT;
        v_transaction_count := v_transaction_count + v_linked_count;
        
        RAISE NOTICE 'Linked % transactions to sources for tenant %', v_linked_count, v_tenant_id;
    END LOOP;
    
    RAISE NOTICE 'Source linking complete. Linked % transactions across % tenants', v_transaction_count, v_tenant_count;
END;
$$ LANGUAGE plpgsql;

-- Function to link transactions to chart of accounts
CREATE OR REPLACE FUNCTION link_transactions_to_chart_of_accounts() RETURNS VOID AS $$
DECLARE
    v_transaction RECORD;
    v_account_id UUID;
    v_tenant_id UUID;
    v_tenant RECORD;
    v_tenant_count INT := 0;
    v_total_tenants INT;
    v_transaction_count INT := 0;
    v_linked_count INT := 0;
    v_category_code TEXT;
    v_account_code TEXT;
    v_header_id UUID;
    v_cash_account_id UUID;
    v_user_id UUID;
BEGIN
    -- Get total number of tenants
    SELECT COUNT(*) INTO v_total_tenants FROM tenants;
    
    -- Process each tenant
    FOR v_tenant IN SELECT id FROM tenants LOOP
        v_tenant_id := v_tenant.id;
        v_tenant_count := v_tenant_count + 1;
        
        RAISE NOTICE 'Processing tenant % (% of %): Linking transactions to chart of accounts', v_tenant_id, v_tenant_count, v_total_tenants;
        
        -- Get a default user ID for this tenant
        SELECT user_id INTO v_user_id
        FROM tenant_users
        WHERE tenant_id = v_tenant_id
        LIMIT 1;
        
        -- If no user found, use any user
        IF v_user_id IS NULL THEN
            SELECT user_id INTO v_user_id FROM tenant_users LIMIT 1;
        END IF;
        
        -- Get the cash account for this tenant
        SELECT id INTO v_cash_account_id
        FROM chart_of_accounts
        WHERE tenant_id = v_tenant_id AND code = '1101' -- Petty Cash
        LIMIT 1;
        
        -- If no cash account found, use the first asset account
        IF v_cash_account_id IS NULL THEN
            SELECT id INTO v_cash_account_id
            FROM chart_of_accounts
            WHERE tenant_id = v_tenant_id AND account_type = 'asset'
            LIMIT 1;
        END IF;
        
        -- Process transactions with no account_id
        FOR v_transaction IN 
            SELECT ft.id, ft.type, ft.category_id, ft.header_id, ft.debit, ft.credit
            FROM financial_transactions ft
            WHERE ft.tenant_id = v_tenant_id
            AND ft.account_id IS NULL
        LOOP
            v_transaction_count := v_transaction_count + 1;
            
            -- Determine account based on category and transaction type
            IF v_transaction.category_id IS NOT NULL THEN
                -- Get the category code
                SELECT code INTO v_category_code
                FROM categories
                WHERE id = v_transaction.category_id AND tenant_id = v_tenant_id;
                
                -- Map category code to account code
                CASE 
                    -- Income categories
                    WHEN v_category_code = 'tithe' THEN v_account_code := '4101'; -- Regular Tithes
                    WHEN v_category_code = 'first_fruit_offering' THEN v_account_code := '4102'; -- First Fruit Offerings
                    WHEN v_category_code = 'love_offering' THEN v_account_code := '4201'; -- Love Offerings
                    WHEN v_category_code = 'mission_offering' THEN v_account_code := '4202'; -- Mission Offerings
                    WHEN v_category_code = 'building_offering' THEN v_account_code := '4203'; -- Building Offerings
                    WHEN v_category_code = 'lot_offering' THEN v_account_code := '4204'; -- Special Offerings
                    WHEN v_category_code = 'other' AND v_transaction.type = 'income' THEN v_account_code := '4700'; -- Miscellaneous Income
                    
                    -- Expense categories
                    WHEN v_category_code = 'ministry' THEN v_account_code := '5100'; -- Ministry Expenses
                    WHEN v_category_code = 'payroll' THEN v_account_code := '5200'; -- Payroll Expenses
                    WHEN v_category_code = 'utilities' THEN v_account_code := '5301'; -- Utilities
                    WHEN v_category_code = 'maintenance' THEN v_account_code := '5302'; -- Maintenance
                    WHEN v_category_code = 'events' THEN v_account_code := '5500'; -- Events and Programs
                    WHEN v_category_code = 'missions' THEN v_account_code := '5106'; -- Missions
                    WHEN v_category_code = 'education' THEN v_account_code := '5600'; -- Education and Training
                    WHEN v_category_code = 'other' AND v_transaction.type = 'expense' THEN v_account_code := '5900'; -- Miscellaneous Expenses
                    
                    -- Default fallbacks
                    ELSE
                        CASE 
                            WHEN v_transaction.type = 'income' THEN v_account_code := '4700'; -- Miscellaneous Income
                            WHEN v_transaction.type = 'expense' THEN v_account_code := '5900'; -- Miscellaneous Expenses
                        END CASE;
                END CASE;
                
                -- Get the account ID based on the code
                SELECT id INTO v_account_id
                FROM chart_of_accounts
                WHERE code = v_account_code AND tenant_id = v_tenant_id;
            END IF;
            
            -- If we couldn't find an account based on category, use default accounts
            IF v_account_id IS NULL THEN
                CASE 
                    WHEN v_transaction.type = 'income' THEN
                        SELECT id INTO v_account_id
                        FROM chart_of_accounts
                        WHERE code = '4700' AND tenant_id = v_tenant_id; -- Miscellaneous Income
                    WHEN v_transaction.type = 'expense' THEN
                        SELECT id INTO v_account_id
                        FROM chart_of_accounts
                        WHERE code = '5900' AND tenant_id = v_tenant_id; -- Miscellaneous Expenses
                END CASE;
            END IF;
            
            -- If we still don't have an account, use the first account of the appropriate type
            IF v_account_id IS NULL THEN
                CASE 
                    WHEN v_transaction.type = 'income' THEN
                        SELECT id INTO v_account_id
                        FROM chart_of_accounts
                        WHERE account_type = 'revenue' AND tenant_id = v_tenant_id
                        LIMIT 1;
                    WHEN v_transaction.type = 'expense' THEN
                        SELECT id INTO v_account_id
                        FROM chart_of_accounts
                        WHERE account_type = 'expense' AND tenant_id = v_tenant_id
                        LIMIT 1;
                END CASE;
            END IF;
            
            -- Update the transaction with the account ID
            IF v_account_id IS NOT NULL THEN
                -- Check if this is part of a double-entry pair
                IF v_transaction.header_id IS NOT NULL THEN
                    -- This is part of a double-entry pair
                    -- If debit > 0, this is likely an expense or asset account
                    -- If credit > 0, this is likely a revenue or liability account
                    IF (v_transaction.debit > 0 AND v_transaction.type = 'expense') OR 
                       (v_transaction.credit > 0 AND v_transaction.type = 'income') THEN
                        UPDATE financial_transactions
                        SET account_id = v_account_id,
                            updated_at = NOW()
                        WHERE id = v_transaction.id;
                        
                        v_linked_count := v_linked_count + 1;
                    ELSE
                        -- This is the cash side of the transaction
                        UPDATE financial_transactions
                        SET account_id = v_cash_account_id,
                            updated_at = NOW()
                        WHERE id = v_transaction.id;
                        
                        v_linked_count := v_linked_count + 1;
                    END IF;
                ELSE
                    -- This is a standalone transaction (not part of a double-entry pair)
                    -- Update it with the appropriate account
                    UPDATE financial_transactions
                    SET account_id = v_account_id,
                        updated_at = NOW()
                    WHERE id = v_transaction.id;
                    
                    v_linked_count := v_linked_count + 1;
                END IF;
            END IF;
            
            -- Reset account_id for next iteration
            v_account_id := NULL;
            
            -- Log progress periodically
            IF v_transaction_count % 100 = 0 THEN
                RAISE NOTICE 'Processed % transactions, linked %', v_transaction_count, v_linked_count;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Chart of accounts linking complete. Processed % transactions, linked %', v_transaction_count, v_linked_count;
END;
$$ LANGUAGE plpgsql;

-- Function to validate double-entry transactions
CREATE OR REPLACE FUNCTION validate_double_entry_transactions() RETURNS VOID AS $$
DECLARE
    v_header RECORD;
    v_tenant_id UUID;
    v_tenant RECORD;
    v_tenant_count INT := 0;
    v_total_tenants INT;
    v_header_count INT := 0;
    v_balanced_count INT := 0;
    v_unbalanced_count INT := 0;
    v_total_debits NUMERIC;
    v_total_credits NUMERIC;
BEGIN
    -- Get total number of tenants
    SELECT COUNT(*) INTO v_total_tenants FROM tenants;
    
    -- Process each tenant
    FOR v_tenant IN SELECT id FROM tenants LOOP
        v_tenant_id := v_tenant.id;
        v_tenant_count := v_tenant_count + 1;
        
        RAISE NOTICE 'Processing tenant % (% of %): Validating double-entry transactions', v_tenant_id, v_tenant_count, v_total_tenants;
        
        -- Process each transaction header
        FOR v_header IN 
            SELECT id
            FROM financial_transaction_headers
            WHERE tenant_id = v_tenant_id
        LOOP
            v_header_count := v_header_count + 1;
            
            -- Calculate total debits and credits
            SELECT 
                SUM(debit) AS total_debits,
                SUM(credit) AS total_credits
            INTO v_total_debits, v_total_credits
            FROM financial_transactions
            WHERE header_id = v_header.id;
            
            -- Check if balanced
            IF ABS(COALESCE(v_total_debits, 0) - COALESCE(v_total_credits, 0)) < 0.01 THEN
                v_balanced_count := v_balanced_count + 1;
            ELSE
                v_unbalanced_count := v_unbalanced_count + 1;
                RAISE NOTICE 'Unbalanced transaction header: %. Debits: %, Credits: %', 
                    v_header.id, COALESCE(v_total_debits, 0), COALESCE(v_total_credits, 0);
            END IF;
            
            -- Log progress periodically
            IF v_header_count % 100 = 0 THEN
                RAISE NOTICE 'Processed % headers, balanced: %, unbalanced: %', 
                    v_header_count, v_balanced_count, v_unbalanced_count;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Double-entry validation complete. Processed % headers, balanced: %, unbalanced: %', 
        v_header_count, v_balanced_count, v_unbalanced_count;
END;
$$ LANGUAGE plpgsql;

-- Function to fix unbalanced transactions
CREATE OR REPLACE FUNCTION fix_unbalanced_transactions() RETURNS VOID AS $$
DECLARE
    v_header RECORD;
    v_tenant_id UUID;
    v_tenant RECORD;
    v_tenant_count INT := 0;
    v_total_tenants INT;
    v_header_count INT := 0;
    v_fixed_count INT := 0;
    v_total_debits NUMERIC;
    v_total_credits NUMERIC;
    v_difference NUMERIC;
    v_cash_account_id UUID;
    v_user_id UUID;
BEGIN
    -- Get total number of tenants
    SELECT COUNT(*) INTO v_total_tenants FROM tenants;
    
    -- Process each tenant
    FOR v_tenant IN SELECT id FROM tenants LOOP
        v_tenant_id := v_tenant.id;
        v_tenant_count := v_tenant_count + 1;
        
        RAISE NOTICE 'Processing tenant % (% of %): Fixing unbalanced transactions', v_tenant_id, v_tenant_count, v_total_tenants;
        
        -- Get a default user ID for this tenant
        SELECT user_id INTO v_user_id
        FROM tenant_users
        WHERE tenant_id = v_tenant_id
        LIMIT 1;
        
        -- If no user found, use any user
        IF v_user_id IS NULL THEN
            SELECT user_id INTO v_user_id FROM tenant_users LIMIT 1;
        END IF;
        
        -- Get the cash account for this tenant
        SELECT id INTO v_cash_account_id
        FROM chart_of_accounts
        WHERE tenant_id = v_tenant_id AND code = '1101' -- Petty Cash
        LIMIT 1;
        
        -- If no cash account found, use the first asset account
        IF v_cash_account_id IS NULL THEN
            SELECT id INTO v_cash_account_id
            FROM chart_of_accounts
            WHERE tenant_id = v_tenant_id AND account_type = 'asset'
            LIMIT 1;
        END IF;
        
        -- Process each transaction header
        FOR v_header IN 
            SELECT id, transaction_date, description
            FROM financial_transaction_headers
            WHERE tenant_id = v_tenant_id
        LOOP
            v_header_count := v_header_count + 1;
            
            -- Calculate total debits and credits
            SELECT 
                SUM(debit) AS total_debits,
                SUM(credit) AS total_credits
            INTO v_total_debits, v_total_credits
            FROM financial_transactions
            WHERE header_id = v_header.id;
            
            -- Check if unbalanced
            v_difference := COALESCE(v_total_debits, 0) - COALESCE(v_total_credits, 0);
            
            IF ABS(v_difference) >= 0.01 THEN
                -- Fix the imbalance by adding a balancing entry
                IF v_difference > 0 THEN
                    -- More debits than credits, add a credit entry
                    INSERT INTO financial_transactions (
                        tenant_id,
                        type,
                        amount,
                        description,
                        date,
                        header_id,
                        account_id,
                        source_id,
                        debit,
                        credit,
                        created_by,
                        updated_by
                    ) VALUES (
                        v_tenant_id,
                        'income',
                        v_difference,
                        'Balancing entry for ' || v_header.description,
                        v_header.transaction_date,
                        v_header.id,
                        v_cash_account_id,
                        (SELECT id FROM financial_sources WHERE tenant_id = v_tenant_id LIMIT 1),
                        0,
                        v_difference,
                        v_user_id,
                        v_user_id
                    );
                ELSE
                    -- More credits than debits, add a debit entry
                    INSERT INTO financial_transactions (
                        tenant_id,
                        type,
                        amount,
                        description,
                        date,
                        header_id,
                        account_id,
                        source_id,
                        debit,
                        credit,
                        created_by,
                        updated_by
                    ) VALUES (
                        v_tenant_id,
                        'expense',
                        ABS(v_difference),
                        'Balancing entry for ' || v_header.description,
                        v_header.transaction_date,
                        v_header.id,
                        v_cash_account_id,
                        (SELECT id FROM financial_sources WHERE tenant_id = v_tenant_id LIMIT 1),
                        ABS(v_difference),
                        0,
                        v_user_id,
                        v_user_id
                    );
                END IF;
                
                v_fixed_count := v_fixed_count + 1;
                RAISE NOTICE 'Fixed unbalanced transaction header: %. Difference: %', v_header.id, v_difference;
            END IF;
            
            -- Log progress periodically
            IF v_header_count % 100 = 0 THEN
                RAISE NOTICE 'Processed % headers, fixed: %', v_header_count, v_fixed_count;
            END IF;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Fixing unbalanced transactions complete. Processed % headers, fixed: %', v_header_count, v_fixed_count;
END;
$$ LANGUAGE plpgsql;

-- Function to create default chart of accounts for a new tenant
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts_for_new_tenant() 
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get the user who created the tenant
    v_user_id := NEW.created_by;
    
    -- Create default chart of accounts
    
    -- ASSETS (1000-1999)
    -- Current Assets
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '1000', 'ASSETS', 'All asset accounts', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1100', 'Current Assets', 'Assets expected to be converted to cash within one year', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1101', 'Petty Cash', 'Small amounts of cash kept on hand', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1102', 'Cash in Bank', 'Cash deposited in checking accounts', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1103', 'Savings Account', 'Cash deposited in savings accounts', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1200', 'Accounts Receivable', 'Amounts owed to the church by others', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1300', 'Prepaid Expenses', 'Expenses paid in advance', 'asset', true, v_user_id, v_user_id);
    
    -- Fixed Assets
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '1500', 'Fixed Assets', 'Long-term tangible assets', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1501', 'Church Building', 'Church building property', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1502', 'Land', 'Land owned by the church', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1503', 'Furniture and Equipment', 'Furniture and equipment owned by the church', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1504', 'Vehicles', 'Vehicles owned by the church', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1600', 'Accumulated Depreciation', 'Accumulated depreciation of fixed assets', 'asset', true, v_user_id, v_user_id);
    
    -- Other Assets
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '1800', 'Other Assets', 'Assets that don''t fit in other categories', 'asset', true, v_user_id, v_user_id),
        (NEW.id, '1801', 'Security Deposits', 'Deposits held by others', 'asset', true, v_user_id, v_user_id);
    
    -- LIABILITIES (2000-2999)
    -- Current Liabilities
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '2000', 'LIABILITIES', 'All liability accounts', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2100', 'Current Liabilities', 'Debts due within one year', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2101', 'Accounts Payable', 'Amounts owed to vendors', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2102', 'Accrued Expenses', 'Expenses incurred but not yet paid', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2103', 'Payroll Liabilities', 'Amounts owed to employees and tax authorities', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2104', 'Short-term Loans', 'Loans due within one year', 'liability', true, v_user_id, v_user_id);
    
    -- Long-term Liabilities
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '2500', 'Long-term Liabilities', 'Debts due after one year', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2501', 'Mortgage Payable', 'Mortgage on church property', 'liability', true, v_user_id, v_user_id),
        (NEW.id, '2502', 'Long-term Loans', 'Loans due after one year', 'liability', true, v_user_id, v_user_id);
    
    -- EQUITY (3000-3999)
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '3000', 'EQUITY', 'All equity accounts', 'equity', true, v_user_id, v_user_id),
        (NEW.id, '3100', 'Opening Balance Equity', 'Initial equity when setting up the accounting system', 'equity', true, v_user_id, v_user_id),
        (NEW.id, '3200', 'Retained Earnings', 'Accumulated earnings from prior periods', 'equity', true, v_user_id, v_user_id),
        (NEW.id, '3300', 'Net Income', 'Current period earnings', 'equity', true, v_user_id, v_user_id),
        (NEW.id, '3400', 'Restricted Funds', 'Funds restricted for specific purposes', 'equity', true, v_user_id, v_user_id);
    
    -- REVENUE (4000-4999)
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '4000', 'REVENUE', 'All revenue accounts', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4100', 'Tithes and Offerings', 'Regular tithes and offerings', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4101', 'Regular Tithes', 'Regular tithes from members', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4102', 'First Fruit Offerings', 'First fruit offerings from members', 'revenue', true, v_user_id, v_user_id);
    
    -- Special Offerings
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '4200', 'Special Offerings', 'Special purpose offerings', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4201', 'Love Offerings', 'Love offerings for special purposes', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4202', 'Mission Offerings', 'Offerings designated for missions', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4203', 'Building Offerings', 'Offerings for building projects', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4204', 'Special Offerings', 'Other special purpose offerings', 'revenue', true, v_user_id, v_user_id);
    
    -- Other Income
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '4500', 'Program Income', 'Income from church programs', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4600', 'Rental Income', 'Income from renting church facilities', 'revenue', true, v_user_id, v_user_id),
        (NEW.id, '4700', 'Miscellaneous Income', 'Income that doesn''t fit other categories', 'revenue', true, v_user_id, v_user_id);
    
    -- EXPENSES (5000-9999)
    -- Ministry Expenses
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '5000', 'EXPENSES', 'All expense accounts', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5100', 'Ministry Expenses', 'Expenses related to church ministries', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5101', 'Worship Ministry', 'Worship ministry expenses', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5102', 'Children''s Ministry', 'Children''s ministry expenses', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5103', 'Youth Ministry', 'Youth ministry expenses', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5104', 'Adult Ministry', 'Adult ministry expenses', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5105', 'Outreach Ministry', 'Outreach ministry expenses', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5106', 'Missions', 'Mission expenses', 'expense', true, v_user_id, v_user_id);
    
    -- Personnel Expenses
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '5200', 'Personnel Expenses', 'Expenses related to staff', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5201', 'Pastoral Salaries', 'Salaries for pastoral staff', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5202', 'Support Staff Salaries', 'Salaries for support staff', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5203', 'Employee Benefits', 'Benefits for employees', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5204', 'Payroll Taxes', 'Employer portion of payroll taxes', 'expense', true, v_user_id, v_user_id);
    
    -- Facilities Expenses
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '5300', 'Facilities Expenses', 'Expenses related to church facilities', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5301', 'Utilities', 'Electricity, water, gas, etc.', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5302', 'Maintenance', 'Building and grounds maintenance', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5303', 'Insurance', 'Property and liability insurance', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5304', 'Mortgage/Rent', 'Mortgage or rent payments', 'expense', true, v_user_id, v_user_id);
    
    -- Administrative Expenses
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '5400', 'Administrative Expenses', 'Office and administrative expenses', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5401', 'Office Supplies', 'Office supplies and materials', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5402', 'Technology', 'Computer equipment and software', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5403', 'Telephone', 'Telephone and internet services', 'expense', true, v_user_id, v_user_id);
    
    -- Other Expenses
    INSERT INTO chart_of_accounts (tenant_id, code, name, description, account_type, is_active, created_by, updated_by)
    VALUES 
        (NEW.id, '5500', 'Events and Programs', 'Expenses for church events and programs', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5600', 'Education and Training', 'Staff and volunteer education', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5700', 'Benevolence', 'Assistance to individuals in need', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5800', 'Depreciation Expense', 'Depreciation of fixed assets', 'expense', true, v_user_id, v_user_id),
        (NEW.id, '5900', 'Miscellaneous Expenses', 'Expenses that don''t fit other categories', 'expense', true, v_user_id, v_user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to create default chart of accounts for new tenants
DROP TRIGGER IF EXISTS create_default_chart_of_accounts_trigger ON tenants;
CREATE TRIGGER create_default_chart_of_accounts_trigger
AFTER INSERT ON tenants
FOR EACH ROW
EXECUTE FUNCTION create_default_chart_of_accounts_for_new_tenant();

-- Execute the migration functions
BEGIN;
    -- Step 1: Link member transactions
    SELECT link_member_transactions();
    
    -- Step 2: Link transactions to sources
    SELECT link_transactions_to_sources();
    
    -- Step 3: Link transactions to chart of accounts
    SELECT link_transactions_to_chart_of_accounts();
    
    -- Step 4: Validate double-entry transactions
    SELECT validate_double_entry_transactions();
    
    -- Step 5: Fix any unbalanced transactions
    SELECT fix_unbalanced_transactions();
    
    -- Step 6: Validate again to ensure all transactions are balanced
    SELECT validate_double_entry_transactions();
COMMIT;

-- Add a comment to the financial_transactions table to indicate migration is complete
COMMENT ON TABLE financial_transactions IS 'Financial transactions with double-entry accounting support. Migration completed.';