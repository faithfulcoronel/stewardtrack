-- ============================================
-- AI CREDITS SYSTEM - Database Migration
-- ============================================
-- Purpose: Token-based credit system for AI Assistant usage
-- Features: Purchase credits, track usage, auto-recharge, multi-currency
-- Date: 2026-01-23
-- ============================================

-- ============================================
-- Table 1: AI Credit Packages (SKU Catalog)
-- ============================================
CREATE TABLE ai_credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  credits_amount INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PHP',
  sort_order INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  badge_text TEXT,
  savings_percent INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CHECK (credits_amount > 0),
  CHECK (price > 0)
);

CREATE INDEX idx_ai_credit_packages_active ON ai_credit_packages(is_active, sort_order);
CREATE INDEX idx_ai_credit_packages_currency ON ai_credit_packages(currency, is_active);

COMMENT ON TABLE ai_credit_packages IS 'Available credit packages for purchase';
COMMENT ON COLUMN ai_credit_packages.credits_amount IS 'Number of credits in this package';
COMMENT ON COLUMN ai_credit_packages.price IS 'Price in the specified currency';
COMMENT ON COLUMN ai_credit_packages.savings_percent IS 'Discount percentage for display (e.g., 10 for 10% off)';

-- ============================================
-- Table 2: Tenant AI Credits (Balance - Source of Truth)
-- ============================================
CREATE TABLE tenant_ai_credits (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  total_credits INTEGER DEFAULT 0,
  used_credits INTEGER DEFAULT 0,
  remaining_credits INTEGER DEFAULT 0,
  auto_recharge_enabled BOOLEAN DEFAULT FALSE,
  auto_recharge_package_id UUID REFERENCES ai_credit_packages(id),
  low_credit_threshold INTEGER DEFAULT 10,
  last_purchase_at TIMESTAMPTZ,
  last_usage_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- CRITICAL: Data integrity constraints
  CHECK (total_credits >= 0),
  CHECK (used_credits >= 0),
  CHECK (remaining_credits >= 0),
  CHECK (remaining_credits = total_credits - used_credits),
  CHECK (low_credit_threshold >= 0)
);

CREATE INDEX idx_tenant_ai_credits_low_balance
  ON tenant_ai_credits(tenant_id)
  WHERE auto_recharge_enabled = TRUE AND remaining_credits < low_credit_threshold;

COMMENT ON TABLE tenant_ai_credits IS 'Tenant credit balance - single source of truth';
COMMENT ON COLUMN tenant_ai_credits.total_credits IS 'Total credits ever purchased';
COMMENT ON COLUMN tenant_ai_credits.used_credits IS 'Total credits consumed';
COMMENT ON COLUMN tenant_ai_credits.remaining_credits IS 'Current available credits (total - used)';
COMMENT ON COLUMN tenant_ai_credits.auto_recharge_enabled IS 'Whether to auto-purchase when low';
COMMENT ON COLUMN tenant_ai_credits.low_credit_threshold IS 'Trigger auto-recharge when balance falls below this';

-- ============================================
-- Table 3: AI Credit Purchases (Payment History)
-- ============================================
CREATE TABLE ai_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES ai_credit_packages(id),
  credits_purchased INTEGER NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL,
  xendit_invoice_id TEXT UNIQUE,
  payment_status TEXT DEFAULT 'pending',
  purchased_at TIMESTAMPTZ,
  credits_added_at TIMESTAMPTZ,
  purchase_type TEXT DEFAULT 'manual',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (credits_purchased > 0),
  CHECK (amount_paid >= 0),
  CHECK (payment_status IN ('pending', 'paid', 'completed', 'failed', 'expired'))
);

CREATE INDEX idx_ai_credit_purchases_tenant ON ai_credit_purchases(tenant_id, created_at DESC);
CREATE INDEX idx_ai_credit_purchases_status ON ai_credit_purchases(payment_status);
CREATE INDEX idx_ai_credit_purchases_xendit ON ai_credit_purchases(xendit_invoice_id);

COMMENT ON TABLE ai_credit_purchases IS 'Record of all credit purchases and payment status';
COMMENT ON COLUMN ai_credit_purchases.purchase_type IS 'manual, auto_recharge, trial, comp';
COMMENT ON COLUMN ai_credit_purchases.credits_added_at IS 'When credits were actually provisioned';

-- ============================================
-- Table 4: AI Credit Transactions (Usage Audit Log - Immutable)
-- ============================================
CREATE TABLE ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  conversation_turn INTEGER NOT NULL,
  credits_used INTEGER NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  tool_executions_count INTEGER DEFAULT 0,
  cost_breakdown JSONB NOT NULL,
  model_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (credits_used > 0),
  CHECK (input_tokens >= 0),
  CHECK (output_tokens >= 0),
  CHECK (tool_executions_count >= 0)
);

CREATE INDEX idx_ai_credit_transactions_tenant ON ai_credit_transactions(tenant_id, created_at DESC);
CREATE INDEX idx_ai_credit_transactions_user ON ai_credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_ai_credit_transactions_session ON ai_credit_transactions(session_id);
CREATE INDEX idx_ai_credit_transactions_created_at ON ai_credit_transactions(created_at DESC);

COMMENT ON TABLE ai_credit_transactions IS 'Immutable audit log of all credit usage - NEVER UPDATE OR DELETE';
COMMENT ON COLUMN ai_credit_transactions.cost_breakdown IS 'JSON with inputCost, outputCost, totalCost, creditsCalculated';

-- ============================================
-- Database Function: Deduct Credits (Atomic)
-- ============================================
CREATE OR REPLACE FUNCTION deduct_ai_credits(
  p_tenant_id UUID,
  p_credits_amount INTEGER,
  p_user_id UUID,
  p_session_id TEXT,
  p_conversation_turn INTEGER,
  p_input_tokens INTEGER,
  p_output_tokens INTEGER,
  p_tool_count INTEGER,
  p_cost_breakdown JSONB,
  p_model_name TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock row for atomic operation (prevents race conditions)
  SELECT remaining_credits INTO v_current_balance
  FROM tenant_ai_credits
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;

  -- If tenant record doesn't exist, initialize with 0
  IF NOT FOUND THEN
    INSERT INTO tenant_ai_credits (tenant_id, total_credits, used_credits, remaining_credits)
    VALUES (p_tenant_id, 0, 0, 0);
    v_current_balance := 0;
  END IF;

  -- Check sufficient balance
  IF v_current_balance < p_credits_amount THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error_message', 'Insufficient credits',
      'current_balance', v_current_balance,
      'required', p_credits_amount
    );
  END IF;

  -- Deduct credits (CHECK constraint ensures remaining >= 0)
  UPDATE tenant_ai_credits
  SET
    used_credits = used_credits + p_credits_amount,
    remaining_credits = remaining_credits - p_credits_amount,
    last_usage_at = NOW(),
    updated_at = NOW()
  WHERE tenant_id = p_tenant_id;

  -- Log transaction (immutable audit record)
  INSERT INTO ai_credit_transactions (
    tenant_id, user_id, session_id, conversation_turn,
    credits_used, input_tokens, output_tokens, tool_executions_count,
    cost_breakdown, model_name
  ) VALUES (
    p_tenant_id, p_user_id, p_session_id, p_conversation_turn,
    p_credits_amount, p_input_tokens, p_output_tokens, p_tool_count,
    p_cost_breakdown, p_model_name
  );

  v_new_balance := v_current_balance - p_credits_amount;

  RETURN jsonb_build_object(
    'success', TRUE,
    'new_balance', v_new_balance,
    'credits_deducted', p_credits_amount
  );
END;
$$;

COMMENT ON FUNCTION deduct_ai_credits IS 'Atomically deduct credits and log transaction (prevents race conditions)';

-- ============================================
-- Database Function: Add Credits (Atomic)
-- ============================================
CREATE OR REPLACE FUNCTION add_ai_credits(
  p_tenant_id UUID,
  p_credits_amount INTEGER,
  p_purchase_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  -- Upsert tenant credits (create if not exists)
  INSERT INTO tenant_ai_credits (
    tenant_id, total_credits, used_credits, remaining_credits, last_purchase_at
  )
  VALUES (
    p_tenant_id, p_credits_amount, 0, p_credits_amount, NOW()
  )
  ON CONFLICT (tenant_id) DO UPDATE
  SET
    total_credits = tenant_ai_credits.total_credits + p_credits_amount,
    remaining_credits = tenant_ai_credits.remaining_credits + p_credits_amount,
    last_purchase_at = NOW(),
    updated_at = NOW();

  -- Update purchase record
  UPDATE ai_credit_purchases
  SET
    payment_status = 'completed',
    credits_added_at = NOW(),
    updated_at = NOW()
  WHERE id = p_purchase_id;

  -- Get new balance
  SELECT remaining_credits INTO v_new_balance
  FROM tenant_ai_credits
  WHERE tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'new_balance', v_new_balance,
    'credits_added', p_credits_amount
  );
END;
$$;

COMMENT ON FUNCTION add_ai_credits IS 'Atomically add purchased credits to tenant balance';

-- ============================================
-- Database Function: Get Balance
-- ============================================
CREATE OR REPLACE FUNCTION get_tenant_credit_balance(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_credits', COALESCE(total_credits, 0),
    'used_credits', COALESCE(used_credits, 0),
    'remaining_credits', COALESCE(remaining_credits, 0),
    'auto_recharge_enabled', COALESCE(auto_recharge_enabled, FALSE),
    'auto_recharge_package_id', auto_recharge_package_id,
    'low_credit_threshold', COALESCE(low_credit_threshold, 10),
    'last_purchase_at', last_purchase_at,
    'last_usage_at', last_usage_at
  ) INTO v_result
  FROM tenant_ai_credits
  WHERE tenant_id = p_tenant_id;

  -- If no record, return zeros
  IF v_result IS NULL THEN
    v_result := jsonb_build_object(
      'total_credits', 0,
      'used_credits', 0,
      'remaining_credits', 0,
      'auto_recharge_enabled', FALSE,
      'auto_recharge_package_id', NULL,
      'low_credit_threshold', 10,
      'last_purchase_at', NULL,
      'last_usage_at', NULL
    );
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_tenant_credit_balance IS 'Get tenant credit balance (returns JSON with all fields)';

-- ============================================
-- Row-Level Security (RLS)
-- ============================================
ALTER TABLE tenant_ai_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only access their own data
CREATE POLICY tenant_ai_credits_policy ON tenant_ai_credits
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

CREATE POLICY ai_credit_purchases_policy ON ai_credit_purchases
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

CREATE POLICY ai_credit_transactions_policy ON ai_credit_transactions
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- ai_credit_packages is tenant-agnostic (visible to all)
ALTER TABLE ai_credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_credit_packages_read_all_policy ON ai_credit_packages
  FOR SELECT
  USING (TRUE);

-- ============================================
-- Seed Credit Packages
-- ============================================

-- PHP Currency Packages
INSERT INTO ai_credit_packages (name, description, credits_amount, price, currency, sort_order, is_featured, badge_text, savings_percent, is_active) VALUES
  ('Starter Pack', 'Perfect for trying out the AI Assistant', 100, 10.00, 'PHP', 1, FALSE, NULL, 0, TRUE),
  ('Pro Pack', 'Most popular for regular users', 500, 45.00, 'PHP', 2, TRUE, 'Most Popular', 10, TRUE),
  ('Business Pack', 'Best value for active teams', 1500, 120.00, 'PHP', 3, FALSE, 'Best Value', 20, TRUE),
  ('Enterprise Pack', 'Maximum credits for large organizations', 5000, 350.00, 'PHP', 4, FALSE, NULL, 30, TRUE);

-- USD Currency Packages
INSERT INTO ai_credit_packages (name, description, credits_amount, price, currency, sort_order, is_featured, badge_text, savings_percent, is_active) VALUES
  ('Starter Pack', 'Perfect for trying out the AI Assistant', 100, 10.00, 'USD', 1, FALSE, NULL, 0, TRUE),
  ('Pro Pack', 'Most popular for regular users', 500, 45.00, 'USD', 2, TRUE, 'Most Popular', 10, TRUE),
  ('Business Pack', 'Best value for active teams', 1500, 120.00, 'USD', 3, FALSE, 'Best Value', 20, TRUE),
  ('Enterprise Pack', 'Maximum credits for large organizations', 5000, 350.00, 'USD', 4, FALSE, NULL, 30, TRUE);

-- ============================================
-- Backfill Existing Tenants with Trial Credits
-- ============================================
INSERT INTO tenant_ai_credits (tenant_id, total_credits, used_credits, remaining_credits)
SELECT id, 10, 0, 10
FROM tenants
WHERE EXISTS (
  SELECT 1 FROM tenant_feature_grants tfg
  JOIN feature_catalog fc ON fc.id = tfg.feature_id
  WHERE tfg.tenant_id = tenants.id
  AND fc.code = 'ai_assistant'
  AND CURRENT_DATE >= COALESCE(tfg.starts_at, CURRENT_DATE)
  AND CURRENT_DATE < COALESCE(tfg.expires_at, CURRENT_DATE + INTERVAL '100 years')
)
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- Migration Complete
-- ============================================
