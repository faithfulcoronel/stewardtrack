-- Prevent deletion of fiscal years that have associated transactions
-- Transactions are linked by date range, not FK, so we need a trigger

CREATE OR REPLACE FUNCTION prevent_fiscal_year_delete_with_transactions()
RETURNS TRIGGER AS $$
DECLARE
  v_transaction_count int;
  v_header_count int;
BEGIN
  -- Check for financial_transaction_headers in the fiscal year date range
  SELECT COUNT(*) INTO v_header_count
  FROM financial_transaction_headers fth
  WHERE fth.tenant_id = OLD.tenant_id
    AND fth.transaction_date BETWEEN OLD.start_date AND OLD.end_date
    AND fth.deleted_at IS NULL;

  IF v_header_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete fiscal year "%": % transaction(s) exist within this period (% to %). Close and archive the fiscal year instead.',
      OLD.name, v_header_count, OLD.start_date, OLD.end_date;
  END IF;

  -- Also check financial_transactions directly (legacy entries without headers)
  SELECT COUNT(*) INTO v_transaction_count
  FROM financial_transactions ft
  WHERE ft.tenant_id = OLD.tenant_id
    AND ft.date BETWEEN OLD.start_date AND OLD.end_date
    AND ft.deleted_at IS NULL
    AND ft.header_id IS NULL;

  IF v_transaction_count > 0 THEN
    RAISE EXCEPTION 'Cannot delete fiscal year "%": % standalone transaction(s) exist within this period (% to %). Close and archive the fiscal year instead.',
      OLD.name, v_transaction_count, OLD.start_date, OLD.end_date;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_fiscal_year_delete_trigger ON fiscal_years;
CREATE TRIGGER prevent_fiscal_year_delete_trigger
BEFORE DELETE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION prevent_fiscal_year_delete_with_transactions();

-- Also prevent deletion of closed fiscal years (they should be archived, not deleted)
CREATE OR REPLACE FUNCTION prevent_closed_fiscal_year_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'closed' THEN
    RAISE EXCEPTION 'Cannot delete closed fiscal year "%". Closed fiscal years cannot be deleted for audit trail purposes.',
      OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_closed_fiscal_year_delete_trigger ON fiscal_years;
CREATE TRIGGER prevent_closed_fiscal_year_delete_trigger
BEFORE DELETE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION prevent_closed_fiscal_year_delete();

COMMENT ON FUNCTION prevent_fiscal_year_delete_with_transactions() IS
  'Prevents deletion of fiscal years that have transactions within their date range';
COMMENT ON FUNCTION prevent_closed_fiscal_year_delete() IS
  'Prevents deletion of closed fiscal years for audit trail integrity';
