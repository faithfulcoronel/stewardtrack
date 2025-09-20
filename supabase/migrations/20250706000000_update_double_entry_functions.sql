-- Update functions to use debit and credit after removing amount column

-- Refresh offering batch totals using credit column
DROP FUNCTION IF EXISTS refresh_offering_batch_total(uuid);
CREATE OR REPLACE FUNCTION refresh_offering_batch_total(p_batch_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE offering_batches b
  SET total_amount = COALESCE(
    (SELECT SUM(ft.credit) FROM financial_transactions ft
      WHERE ft.batch_id = p_batch_id AND ft.tenant_id = b.tenant_id), 0)
  WHERE b.id = p_batch_id;
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_offering_batch_total(uuid) TO authenticated;
COMMENT ON FUNCTION refresh_offering_batch_total(uuid) IS
  'Recalculates the total amount for the specified offering batch';

-- Ensure restricted fund balances use debit and credit
DROP TRIGGER IF EXISTS check_fund_balance_trigger ON financial_transactions;
DROP FUNCTION IF EXISTS check_fund_balance();
CREATE OR REPLACE FUNCTION check_fund_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_type fund_type;
  v_balance numeric;
BEGIN
  IF NEW.fund_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO v_type FROM funds WHERE id = NEW.fund_id;
  IF v_type = 'restricted' THEN
    SELECT COALESCE(SUM(
      CASE
        WHEN type = 'income' THEN credit
        WHEN type = 'expense' THEN debit
        ELSE COALESCE(debit,0) - COALESCE(credit,0)
      END
    ),0) INTO v_balance
    FROM financial_transactions
    WHERE fund_id = NEW.fund_id
      AND (id <> NEW.id OR TG_OP = 'INSERT');

    v_balance := v_balance + COALESCE(
      CASE
        WHEN NEW.type = 'income' THEN NEW.credit
        WHEN NEW.type = 'expense' THEN NEW.debit
        ELSE COALESCE(NEW.debit,0) - COALESCE(NEW.credit,0)
      END,0);

    IF v_balance < 0 THEN
      RAISE EXCEPTION 'Restricted fund cannot have negative balance';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_fund_balance_trigger
BEFORE INSERT OR UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION check_fund_balance();

-- Member statements use credit amounts
DROP FUNCTION IF EXISTS get_member_statement(date, date);
CREATE OR REPLACE FUNCTION get_member_statement(p_start_date date, p_end_date date)
RETURNS TABLE (
  member_id uuid,
  first_name text,
  last_name text,
  fund_id uuid,
  fund_name text,
  total_amount numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      m.id,
      m.first_name,
      m.last_name,
      f.id AS fund_id,
      f.name AS fund_name,
      SUM(ft.credit) AS total_amount
    FROM members m
    JOIN financial_transactions ft ON ft.member_id = m.id
    LEFT JOIN funds f ON ft.fund_id = f.id
    WHERE m.tenant_id = get_user_tenant_id()
      AND ft.tenant_id = m.tenant_id
      AND ft.date BETWEEN p_start_date AND p_end_date
      AND (SELECT code FROM categories WHERE id = m.status_category_id) IN ('active','donor')
      AND ft.type = 'income'
    GROUP BY m.id, m.first_name, m.last_name, f.id, f.name
    HAVING SUM(ft.credit) <> 0
    ORDER BY m.last_name, m.first_name, f.name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_statement(date, date) TO authenticated;
COMMENT ON FUNCTION get_member_statement(date, date) IS
  'Aggregates income transactions by member and fund for active or donor members within a date range.';

-- Dashboard summaries based on debit and credit
DROP VIEW IF EXISTS finance_monthly_stats CASCADE;
CREATE VIEW finance_monthly_stats AS
WITH tx AS (
  SELECT
    ft.tenant_id,
    ft.type AS type,
    COALESCE(c.name, 'Uncategorized') AS category_name,
    SUM(
      CASE
        WHEN ft.type = 'income' THEN ft.credit
        WHEN ft.type = 'expense' THEN ft.debit
        ELSE 0
      END
    ) AS total
  FROM financial_transactions ft
  LEFT JOIN categories c ON c.id = ft.category_id
  WHERE date_trunc('month', ft.date) = date_trunc('month', CURRENT_DATE)
  GROUP BY ft.tenant_id, ft.type, c.name
)
SELECT
  tenant_id,
  SUM(CASE WHEN type = 'income' THEN total ELSE 0 END) AS monthly_income,
  SUM(CASE WHEN type = 'expense' THEN total ELSE 0 END) AS monthly_expenses,
  COALESCE(
    (SELECT COUNT(*) FROM budgets b
      WHERE b.tenant_id = tx.tenant_id
        AND CURRENT_DATE BETWEEN b.start_date AND b.end_date),
    0
  ) AS active_budgets,
  jsonb_object_agg(category_name, total) FILTER (WHERE type = 'income') AS income_by_category,
  jsonb_object_agg(category_name, total) FILTER (WHERE type = 'expense') AS expenses_by_category
FROM tx
GROUP BY tenant_id;

COMMENT ON VIEW finance_monthly_stats IS 'Aggregated financial statistics for the current month per tenant';

DROP VIEW IF EXISTS fund_balances_view CASCADE;
CREATE VIEW fund_balances_view AS
SELECT
  f.tenant_id,
  f.id,
  f.name,
  COALESCE(
    SUM(
      CASE
        WHEN t.type = 'income' THEN t.credit
        WHEN t.type = 'expense' THEN -t.debit
        ELSE COALESCE(t.credit,0) - COALESCE(t.debit,0)
      END
    ),
    0
  ) AS balance
FROM funds f
LEFT JOIN financial_transactions t ON t.fund_id = f.id
GROUP BY f.tenant_id, f.id, f.name;

COMMENT ON VIEW fund_balances_view IS 'Current running balance for each fund';

