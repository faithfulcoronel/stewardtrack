-- Add fund_id to source_recent_transactions_view

-- Drop existing trigger, function and view if they exist
DROP TRIGGER IF EXISTS refresh_source_recent_transactions_view ON financial_transactions;
DROP FUNCTION IF EXISTS refresh_source_recent_transactions_view();
DROP MATERIALIZED VIEW IF EXISTS source_recent_transactions_view;

-- Recreate materialized view including fund_id
CREATE MATERIALIZED VIEW source_recent_transactions_view AS
SELECT
  DISTINCT ON (h.id)
  h.id AS header_id,
  fs.id AS source_id,
  fs.account_id,
  ft.fund_id,
  h.tenant_id AS tenant_id,
  h.transaction_date AS date,
  COALESCE(c.name, 'Uncategorized') AS category,
  h.description,
  CASE
    WHEN ft.debit > 0 THEN ft.debit
    ELSE -ft.credit
  END AS amount
FROM financial_transactions ft
JOIN financial_transaction_headers h ON ft.header_id = h.id
LEFT JOIN categories c ON ft.category_id = c.id
JOIN financial_sources fs ON fs.account_id = ft.account_id
WHERE fs.account_id IS NOT NULL
ORDER BY h.id, ft.id;

-- Recreate indexes for faster lookups
CREATE INDEX IF NOT EXISTS source_recent_transactions_view_account_date_idx
  ON source_recent_transactions_view(account_id, date);
CREATE INDEX IF NOT EXISTS source_recent_transactions_view_fund_date_idx
  ON source_recent_transactions_view(fund_id, date);

-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS source_recent_transactions_view_header_id_uidx
  ON source_recent_transactions_view(header_id);

-- Refresh function and trigger
CREATE OR REPLACE FUNCTION refresh_source_recent_transactions_view()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY source_recent_transactions_view;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER refresh_source_recent_transactions_view
AFTER INSERT OR UPDATE OR DELETE ON financial_transactions
FOR EACH STATEMENT EXECUTE FUNCTION refresh_source_recent_transactions_view();

-- Add helpful comments
COMMENT ON MATERIALIZED VIEW source_recent_transactions_view IS
  'Latest transactions per header aggregated for each financial source account, fund, and tenant.';
COMMENT ON FUNCTION refresh_source_recent_transactions_view() IS
  'Refreshes source_recent_transactions_view whenever transactions change.';
COMMENT ON TRIGGER refresh_source_recent_transactions_view ON financial_transactions IS
  'Keeps source_recent_transactions_view up to date.';
