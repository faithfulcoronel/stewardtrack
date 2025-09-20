CREATE OR REPLACE FUNCTION delete_from_table(p_table_name text, p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', p_table_name)
  USING p_tenant_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % rows from %', deleted_count, p_table_name;
END;
$$;


CREATE OR REPLACE FUNCTION reset_tenant_data(p_tenant_id uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  -- Ensure caller can modify the tenant
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied for tenant %', p_tenant_id;
  END IF;

  -- Advisory lock to avoid concurrent resets
  PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));

  -- 1. Transactional tables
  PERFORM delete_from_table('income_expense_transaction_mappings', p_tenant_id);
  PERFORM delete_from_table('financial_transactions', p_tenant_id);
  PERFORM delete_from_table('income_expense_transactions', p_tenant_id);
  PERFORM delete_from_table('financial_transaction_headers', p_tenant_id);
  PERFORM delete_from_table('offering_batches', p_tenant_id);
  PERFORM delete_from_table('fund_opening_balances', p_tenant_id);

  -- 2. Budgets and categories
  PERFORM delete_from_table('budgets', p_tenant_id);
  PERFORM delete_from_table('categories', p_tenant_id);

  -- 3. Membership-related data
  PERFORM delete_from_table('family_relationships', p_tenant_id);
  PERFORM delete_from_table('members', p_tenant_id);
  PERFORM delete_from_table('membership_type', p_tenant_id);
  PERFORM delete_from_table('membership_status', p_tenant_id);

  -- 4. Messaging and notifications
  PERFORM delete_from_table('messages', p_tenant_id);
  PERFORM delete_from_table('message_threads', p_tenant_id);
  PERFORM delete_from_table('notifications', p_tenant_id);
  PERFORM delete_from_table('announcements', p_tenant_id);
  PERFORM delete_from_table('email_invitations', p_tenant_id);
  PERFORM delete_from_table('invitations', p_tenant_id);

  -- 5. Funds and accounts
  PERFORM delete_from_table('funds', p_tenant_id);
  PERFORM delete_from_table('designated_funds', p_tenant_id);
  PERFORM delete_from_table('financial_sources', p_tenant_id);
  PERFORM delete_from_table('accounts', p_tenant_id);

  -- 6. Chart of Accounts & fiscal structures
  PERFORM delete_from_table('chart_of_accounts', p_tenant_id);
  PERFORM delete_from_table('fiscal_periods', p_tenant_id);
  PERFORM delete_from_table('fiscal_years', p_tenant_id);

  -- 7. Clear settings belonging to this tenant or current user
  DELETE FROM settings WHERE tenant_id = p_tenant_id OR user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION reset_tenant_data(uuid) TO authenticated;