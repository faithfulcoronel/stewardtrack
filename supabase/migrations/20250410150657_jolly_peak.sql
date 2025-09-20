/*
# Migrate Existing Financial Transactions to Double-Entry System

This migration creates functions to:
1. Create transaction headers for existing transactions
2. Update existing transactions with double-entry accounting fields
3. Create offsetting entries for double-entry accounting

The migration is designed to be safe and non-destructive to existing data.
*/

-- Function to generate a transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number(
  p_tenant_id UUID,
  p_date DATE,
  p_type TEXT,
  p_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_year TEXT;
  v_month TEXT;
  v_sequence TEXT;
BEGIN
  -- Set prefix based on transaction type
  IF p_type = 'income' THEN
    v_prefix := 'INC';
  ELSE
    v_prefix := 'EXP';
  END IF;
  
  -- Format year and month
  v_year := TO_CHAR(p_date, 'YYYY');
  v_month := TO_CHAR(p_date, 'MM');
  
  -- Use last 6 characters of UUID as sequence
  v_sequence := SUBSTRING(p_id::TEXT, 31, 6);
  
  -- Combine to form transaction number
  RETURN v_prefix || '-' || v_year || v_month || '-' || v_sequence;
END;
$$ LANGUAGE plpgsql;

-- Function to migrate existing transactions to the double-entry system
CREATE OR REPLACE FUNCTION migrate_existing_transactions()
RETURNS VOID AS $$
DECLARE
  v_transaction RECORD;
  v_header_id UUID;
  v_transaction_number TEXT;
  v_account_id UUID;
  v_offset_account_id UUID;
BEGIN
  -- Process each existing transaction
  FOR v_transaction IN 
    SELECT 
      t.id, 
      t.type, 
      t.amount, 
      t.description, 
      t.date, 
      t.member_id, 
      t.source_id,
      t.category_id,
      t.tenant_id,
      t.created_by,
      t.updated_by,
      t.created_at,
      t.updated_at,
      c.code AS category_code
    FROM 
      financial_transactions t
      LEFT JOIN categories c ON t.category_id = c.id
    WHERE 
      t.header_id IS NULL
  LOOP
    -- Generate transaction number
    v_transaction_number := generate_transaction_number(
      v_transaction.tenant_id, 
      v_transaction.date, 
      v_transaction.type::TEXT, 
      v_transaction.id
    );
    
    -- Create transaction header
    INSERT INTO financial_transaction_headers (
      transaction_number,
      transaction_date,
      description,
      source_id,
      status,
      tenant_id,
      created_by,
      updated_by,
      created_at,
      updated_at,
      posted_at,
      posted_by
    ) VALUES (
      v_transaction_number,
      v_transaction.date,
      v_transaction.description,
      v_transaction.source_id,
      'posted', -- Assume existing transactions are posted
      v_transaction.tenant_id,
      v_transaction.created_by,
      v_transaction.updated_by,
      v_transaction.created_at,
      v_transaction.updated_at,
      v_transaction.created_at, -- Use created_at as posted_at
      v_transaction.created_by
    ) RETURNING id INTO v_header_id;
    
    -- Determine appropriate accounts based on transaction type and category
    IF v_transaction.type = 'income' THEN
      -- For income transactions
      
      -- Determine revenue account based on category
      SELECT id INTO v_account_id
      FROM chart_of_accounts
      WHERE tenant_id = v_transaction.tenant_id
        AND account_type = 'revenue'
        AND (
          -- Try to match by category code if available
          (v_transaction.category_code IS NOT NULL AND code LIKE '4%' AND name ILIKE '%' || v_transaction.category_code || '%')
          -- Otherwise use general tithe/offering account
          OR (v_transaction.category_code IS NULL AND code = '4101') -- Default to Regular Tithes
        )
      LIMIT 1;
      
      -- If no matching account found, use default
      IF v_account_id IS NULL THEN
        SELECT id INTO v_account_id
        FROM chart_of_accounts
        WHERE tenant_id = v_transaction.tenant_id AND code = '4101' -- Regular Tithes
        LIMIT 1;
      END IF;
      
      -- Determine asset account (default to checking account)
      SELECT id INTO v_offset_account_id
      FROM chart_of_accounts
      WHERE tenant_id = v_transaction.tenant_id AND code = '1201' -- Main Checking Account
      LIMIT 1;
      
      -- Update the existing transaction record (credit to revenue)
      UPDATE financial_transactions
      SET 
        header_id = v_header_id,
        account_id = v_account_id,
        credit = amount,
        debit = 0
      WHERE id = v_transaction.id;
      
      -- Create the offsetting entry (debit to asset)
      INSERT INTO financial_transactions (
        type,
        amount,
        description,
        date,
        member_id,
        category_id,
        tenant_id,
        created_by,
        updated_by,
        created_at,
        updated_at,
        header_id,
        account_id,
        debit,
        credit,
        source_id
      ) VALUES (
        v_transaction.type,
        v_transaction.amount,
        v_transaction.description,
        v_transaction.date,
        v_transaction.member_id,
        v_transaction.category_id,
        v_transaction.tenant_id,
        v_transaction.created_by,
        v_transaction.updated_by,
        v_transaction.created_at,
        v_transaction.updated_at,
        v_header_id,
        v_offset_account_id,
        v_transaction.amount, -- Debit to asset
        0,
        v_transaction.source_id
      );
      
    ELSE
      -- For expense transactions
      
      -- Determine expense account based on category
      SELECT id INTO v_account_id
      FROM chart_of_accounts
      WHERE tenant_id = v_transaction.tenant_id
        AND account_type = 'expense'
        AND (
          -- Try to match by category code if available
          (v_transaction.category_code IS NOT NULL AND code LIKE '5%' AND name ILIKE '%' || v_transaction.category_code || '%')
          -- Otherwise use miscellaneous expense account
          OR (v_transaction.category_code IS NULL AND code = '5900') -- Miscellaneous
        )
      LIMIT 1;
      
      -- If no matching account found, use default
      IF v_account_id IS NULL THEN
        SELECT id INTO v_account_id
        FROM chart_of_accounts
        WHERE tenant_id = v_transaction.tenant_id AND code = '5900' -- Miscellaneous
        LIMIT 1;
      END IF;
      
      -- Determine asset account (default to checking account)
      SELECT id INTO v_offset_account_id
      FROM chart_of_accounts
      WHERE tenant_id = v_transaction.tenant_id AND code = '1201' -- Main Checking Account
      LIMIT 1;
      
      -- Update the existing transaction record (debit to expense)
      UPDATE financial_transactions
      SET 
        header_id = v_header_id,
        account_id = v_account_id,
        debit = amount,
        credit = 0
      WHERE id = v_transaction.id;
      
      -- Create the offsetting entry (credit to asset)
      INSERT INTO financial_transactions (
        type,
        amount,
        description,
        date,
        member_id,
        category_id,
        tenant_id,
        created_by,
        updated_by,
        created_at,
        updated_at,
        header_id,
        account_id,
        debit,
        credit,
        source_id
      ) VALUES (
        v_transaction.type,
        v_transaction.amount,
        v_transaction.description,
        v_transaction.date,
        v_transaction.member_id,
        v_transaction.category_id,
        v_transaction.tenant_id,
        v_transaction.created_by,
        v_transaction.updated_by,
        v_transaction.created_at,
        v_transaction.updated_at,
        v_header_id,
        v_offset_account_id,
        0,
        v_transaction.amount, -- Credit to asset
        v_transaction.source_id
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the migration function
-- This is commented out to allow manual execution after reviewing
-- SELECT migrate_existing_transactions();