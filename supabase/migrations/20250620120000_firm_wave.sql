/*
# Transaction Status Workflow Updates

This migration introduces submit and approve actions for transaction headers and restricts posting to approved transactions only.
*/

-- Function to submit a transaction
CREATE OR REPLACE FUNCTION submit_transaction(p_header_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM financial_transaction_headers
  WHERE id = p_header_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  ELSIF v_status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft transactions can be submitted';
  END IF;

  UPDATE financial_transaction_headers
  SET
    status = 'submitted',
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_header_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to approve a transaction
CREATE OR REPLACE FUNCTION approve_transaction(p_header_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM financial_transaction_headers
  WHERE id = p_header_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  ELSIF v_status <> 'submitted' THEN
    RAISE EXCEPTION 'Only submitted transactions can be approved';
  END IF;

  UPDATE financial_transaction_headers
  SET
    status = 'approved',
    updated_at = NOW(),
    updated_by = p_user_id
  WHERE id = p_header_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Update post_transaction to require approved status
CREATE OR REPLACE FUNCTION post_transaction(p_header_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM financial_transaction_headers
  WHERE id = p_header_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  ELSIF v_status = 'posted' THEN
    RAISE EXCEPTION 'Transaction is already posted';
  ELSIF v_status = 'voided' THEN
    RAISE EXCEPTION 'Transaction is voided and cannot be posted';
  ELSIF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Only approved transactions can be posted';
  END IF;

  IF NOT is_transaction_balanced(p_header_id) THEN
    RAISE EXCEPTION 'Transaction is not balanced. Debits must equal credits.';
  END IF;

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
