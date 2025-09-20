-- Prevent editing financial transactions that belong to posted headers

CREATE OR REPLACE FUNCTION prevent_edit_on_posted_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_status text;
  v_header uuid := COALESCE(NEW.header_id, OLD.header_id);
BEGIN
  IF v_header IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT status INTO v_status
  FROM financial_transaction_headers
  WHERE id = v_header;

  IF v_status = 'posted' THEN
    RAISE EXCEPTION 'Cannot modify transactions for posted headers';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce read-only transactions when header is posted
DROP TRIGGER IF EXISTS prevent_edit_on_posted_transactions ON financial_transactions;
CREATE TRIGGER prevent_edit_on_posted_transactions
  BEFORE UPDATE OR DELETE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_edit_on_posted_transactions();
