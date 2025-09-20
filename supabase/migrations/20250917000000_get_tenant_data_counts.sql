CREATE OR REPLACE FUNCTION get_tenant_data_counts(p_tenant_id uuid)
RETURNS TABLE (
  transactions bigint,
  budgets_categories bigint,
  membership bigint,
  messaging bigint,
  funds_accounts bigint,
  chart_of_accounts bigint,
  settings bigint
)
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT check_tenant_access(p_tenant_id) THEN
    RAISE EXCEPTION 'Access denied for tenant %', p_tenant_id;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM income_expense_transaction_mappings WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM financial_transactions WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM income_expense_transactions WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM financial_transaction_headers WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM offering_batches WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM fund_opening_balances WHERE tenant_id = p_tenant_id) AS transactions,
    (SELECT COUNT(*) FROM budgets WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM categories WHERE tenant_id = p_tenant_id) AS budgets_categories,
    (SELECT COUNT(*) FROM family_relationships WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM members WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM membership_type WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM membership_status WHERE tenant_id = p_tenant_id) AS membership,
    (SELECT COUNT(*) FROM messages WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM message_threads WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM notifications WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM announcements WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM email_invitations WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM invitations WHERE tenant_id = p_tenant_id) AS messaging,
    (SELECT COUNT(*) FROM funds WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM designated_funds WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM financial_sources WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM accounts WHERE tenant_id = p_tenant_id) AS funds_accounts,
    (SELECT COUNT(*) FROM chart_of_accounts WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM fiscal_periods WHERE tenant_id = p_tenant_id) +
    (SELECT COUNT(*) FROM fiscal_years WHERE tenant_id = p_tenant_id) AS chart_of_accounts,
    (SELECT COUNT(*) FROM settings WHERE tenant_id = p_tenant_id OR user_id = auth.uid()) AS settings;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tenant_data_counts(uuid) TO authenticated;
