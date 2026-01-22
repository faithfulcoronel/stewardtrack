-- Update AI Credits RLS Policies to use check_tenant_access() function
-- This matches the standard pattern used throughout the codebase (roles, user_roles, etc.)

-- Drop the existing policies that use current_setting
DROP POLICY IF EXISTS ai_credit_purchases_policy ON ai_credit_purchases;
DROP POLICY IF EXISTS tenant_ai_credits_policy ON tenant_ai_credits;
DROP POLICY IF EXISTS ai_credit_transactions_policy ON ai_credit_transactions;

-- Recreate with check_tenant_access() function (standard pattern)
CREATE POLICY ai_credit_purchases_policy ON ai_credit_purchases
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY tenant_ai_credits_policy ON tenant_ai_credits
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));

CREATE POLICY ai_credit_transactions_policy ON ai_credit_transactions
  FOR ALL TO authenticated
  USING (check_tenant_access(tenant_id))
  WITH CHECK (check_tenant_access(tenant_id));
