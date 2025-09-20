-- Update fund_opening_balances.status to use transaction_status enum


-- Map existing pending values to draft
UPDATE fund_opening_balances
SET status = 'draft'
WHERE status = 'pending';

-- Change column type to enum
ALTER TABLE fund_opening_balances
  DROP CONSTRAINT IF EXISTS fund_opening_balances_status_check,
  ALTER COLUMN status DROP DEFAULT,
  ALTER COLUMN status TYPE transaction_status USING status::transaction_status,
  ALTER COLUMN status SET DEFAULT 'draft';

-- Recreate index for enum column
DROP INDEX IF EXISTS fund_opening_balances_status_idx;
CREATE INDEX IF NOT EXISTS fund_opening_balances_status_idx
  ON fund_opening_balances(status);

-- Update post_fund_opening_balances to use enum status and dynamic accounts
DROP FUNCTION IF EXISTS post_fund_opening_balances(uuid, uuid);
CREATE OR REPLACE FUNCTION post_fund_opening_balances(
  p_fiscal_year_id uuid,
  p_user_id uuid,
  p_cash_account_id uuid,
  p_equity_account_id uuid
)
RETURNS void AS $$
DECLARE
  v_row RECORD;
  v_year fiscal_years;
  v_header uuid;
  v_number text;
BEGIN
  SELECT * INTO v_year FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF v_year.id IS NULL THEN
    RAISE EXCEPTION 'Fiscal year not found';
  END IF;


  FOR v_row IN
    SELECT * FROM fund_opening_balances
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status = 'draft' AND deleted_at IS NULL
  LOOP
    v_number := 'OB-'||to_char(now(),'YYYYMMDDHH24MISS');
    INSERT INTO financial_transaction_headers (
      transaction_number, transaction_date, description, tenant_id,
      status, posted_at, posted_by, created_by, updated_by
    ) VALUES (
      v_number, v_year.start_date, 'Opening Balance', v_row.tenant_id,
      'posted', now(), p_user_id, p_user_id, p_user_id
    ) RETURNING id INTO v_header;

    INSERT INTO financial_transactions (
      tenant_id, type, amount, description, date, header_id,
      account_id, fund_id, debit, credit, created_by, updated_by
    ) VALUES (
      v_row.tenant_id, 'income', v_row.amount, 'Opening Balance', v_year.start_date,
      v_header, p_cash_account_id, v_row.fund_id, v_row.amount, 0, p_user_id, p_user_id
    );

    INSERT INTO financial_transactions (
      tenant_id, type, amount, description, date, header_id,
      account_id, fund_id, debit, credit, created_by, updated_by
    ) VALUES (
      v_row.tenant_id, 'income', v_row.amount, 'Opening Balance', v_year.start_date,
      v_header, p_equity_account_id, v_row.fund_id, 0, v_row.amount, p_user_id, p_user_id
    );

    UPDATE fund_opening_balances
    SET status = 'posted', posted_at = now(), posted_by = p_user_id,
        updated_at = now(), updated_by = p_user_id
    WHERE id = v_row.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION post_fund_opening_balances(uuid, uuid, uuid, uuid) TO authenticated;
