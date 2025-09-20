/*
# Create accounts for existing members

1. New Functionality
  - Creates an account record for each existing member that doesn't already have one
  - Links the account to the member via member_id
  - Sets appropriate account type and details based on member information

2. Changes
  - No schema changes, only data insertion
  - Ensures each member has exactly one associated account

3. Security
  - Maintains existing RLS policies
*/

-- Function to create accounts for all members who don't have one
CREATE OR REPLACE FUNCTION create_accounts_for_members()
RETURNS void AS $$
DECLARE
    member_record RECORD;
    account_id UUID;
    current_user_id UUID;
BEGIN
    -- Get the current user ID for created_by/updated_by fields
    -- SELECT auth.uid() INTO current_user_id;
    
    -- Loop through all active members without an account
    FOR member_record IN 
        SELECT m.* 
        FROM members m
        LEFT JOIN accounts a ON a.member_id = m.id
        WHERE a.id IS NULL
          AND m.deleted_at IS NULL
    LOOP
        -- Create a new account for this member
        INSERT INTO accounts (
            name,
            account_type,
            account_number,
            description,
            email,
            phone,
            address,
            is_active,
            member_id,
            tenant_id,
            created_by,
            updated_by,
            created_at,
            updated_at
        ) VALUES (
            CONCAT(member_record.first_name, ' ', member_record.last_name),
            'person',
            CONCAT('MEM-', SUBSTRING(member_record.id::text, 1, 8)),
            CONCAT('Personal account for ', member_record.first_name, ' ', member_record.last_name),
            member_record.email,
            member_record.contact_number,
            member_record.address,
            TRUE,
            member_record.id,
            member_record.tenant_id,
            member_record.created_by,
            member_record.created_by,
            NOW(),
            NOW()
        )
        RETURNING id INTO account_id;
        
        -- Log the creation
        RAISE NOTICE 'Created account % for member % %', 
            account_id, 
            member_record.first_name, 
            member_record.last_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create accounts
SELECT create_accounts_for_members();

-- Drop the function after use
DROP FUNCTION create_accounts_for_members();

-- Add a comment to explain what was done
COMMENT ON TABLE accounts IS 'Financial accounts for organizations and individuals. Each member has a personal account.';