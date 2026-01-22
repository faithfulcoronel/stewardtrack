-- Fix RLS Policy for ai_credit_purchases to allow INSERT operations
-- The original policy only had USING clause which doesn't apply to INSERT
-- We need WITH CHECK clause to validate tenant_id on INSERT

-- Drop the existing policy
DROP POLICY IF EXISTS ai_credit_purchases_policy ON ai_credit_purchases;

-- Recreate with both USING and WITH CHECK clauses
CREATE POLICY ai_credit_purchases_policy ON ai_credit_purchases
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Do the same for tenant_ai_credits table to be consistent
DROP POLICY IF EXISTS tenant_ai_credits_policy ON tenant_ai_credits;

CREATE POLICY tenant_ai_credits_policy ON tenant_ai_credits
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Do the same for ai_credit_transactions table to be consistent
DROP POLICY IF EXISTS ai_credit_transactions_policy ON ai_credit_transactions;

CREATE POLICY ai_credit_transactions_policy ON ai_credit_transactions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);
