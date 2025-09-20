/*
# Transaction Validation Functions

This migration creates functions to:
1. Validate transaction headers before posting
2. Ensure double-entry accounting principles are followed
3. Provide helper functions for transaction processing
*/

-- Function to check if a transaction is balanced (debits = credits)
CREATE OR REPLACE FUNCTION is_transaction_balanced(p_header_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_debits NUMERIC(10,2);
  v_total_credits NUMERIC(10,2);
BEGIN
  -- Get total debits
  SELECT COALESCE(SUM(debit), 0) INTO v_total_debits
  FROM financial_transactions
  WHERE header_id = p_header_id;
  
  -- Get total credits
  SELECT COALESCE(SUM(credit), 0) INTO v_total_credits
  FROM financial_transactions
  WHERE header_id = p_header_id;
  
  -- Check if balanced (within a small tolerance for floating point issues)
  RETURN ABS(v_total_debits - v_total_credits) < 0.01;
END;
$$ LANGUAGE plpgsql;

-- Function to post a transaction
CREATE OR REPLACE FUNCTION post_transaction(p_header_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Check if transaction exists and is in draft status
  SELECT status INTO v_status
  FROM financial_transaction_headers
  WHERE id = p_header_id;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  ELSIF v_status = 'posted' THEN
    RAISE EXCEPTION 'Transaction is already posted';
  ELSIF v_status = 'voided' THEN
    RAISE EXCEPTION 'Transaction is voided and cannot be posted';
  END IF;
  
  -- Check if transaction is balanced
  IF NOT is_transaction_balanced(p_header_id) THEN
    RAISE EXCEPTION 'Transaction is not balanced. Debits must equal credits.';
  END IF;
  
  -- Post the transaction
  UPDATE financial_transaction_headers
  SET 
    status = 'posted',
    posted_at = NOW(),
    posted_by = p_user_id,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_header_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to void a transaction
CREATE OR REPLACE FUNCTION void_transaction(p_header_id UUID, p_user_id UUID, p_reason TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  -- Check if transaction exists and is in posted status
  SELECT status INTO v_status
  FROM financial_transaction_headers
  WHERE id = p_header_id;
  
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  ELSIF v_status = 'draft' THEN
    RAISE EXCEPTION 'Transaction is in draft status and should be deleted instead of voided';
  ELSIF v_status = 'voided' THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;
  
  -- Void the transaction
  UPDATE financial_transaction_headers
  SET 
    status = 'voided',
    voided_at = NOW(),
    voided_by = p_user_id,
    void_reason = p_reason,
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_header_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if all transactions for a header are valid
CREATE OR REPLACE FUNCTION validate_transaction_entries(p_header_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_invalid_count INTEGER;
BEGIN
  -- Check for entries with both debit and credit
  SELECT COUNT(*) INTO v_invalid_count
  FROM financial_transactions
  WHERE header_id = p_header_id
    AND deleted_at IS NULL
    AND debit > 0 AND credit > 0;
  
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Transaction entries cannot have both debit and credit values';
  END IF;
  
  -- Check for entries with neither debit nor credit
  SELECT COUNT(*) INTO v_invalid_count
  FROM financial_transactions
  WHERE header_id = p_header_id
    AND deleted_at IS NULL
    AND debit = 0 AND credit = 0;
  
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Transaction entries must have either a debit or credit value';
  END IF;
  
  -- Check for entries without an account
  SELECT COUNT(*) INTO v_invalid_count
  FROM financial_transactions
  WHERE header_id = p_header_id
    AND deleted_at IS NULL
    AND account_id IS NULL;
  
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'All transaction entries must have an account';
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to validate transactions before posting
CREATE OR REPLACE FUNCTION validate_transaction_before_posting()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run validation when status changes to 'posted'
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    -- Validate transaction entries
    IF NOT validate_transaction_entries(NEW.id) THEN
      RETURN NULL; -- Abort the update
    END IF;
    
    -- Check if transaction is balanced
    IF NOT is_transaction_balanced(NEW.id) THEN
      RAISE EXCEPTION 'Transaction is not balanced. Debits must equal credits.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate transactions before posting
DROP TRIGGER IF EXISTS validate_transaction_before_posting_trigger ON financial_transaction_headers;
CREATE TRIGGER validate_transaction_before_posting_trigger
BEFORE UPDATE ON financial_transaction_headers
FOR EACH ROW
WHEN (NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status = 'draft'))
EXECUTE FUNCTION validate_transaction_before_posting();