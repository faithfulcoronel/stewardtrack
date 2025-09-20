-- Rename account_id to coa_id on financial_sources
ALTER TABLE financial_sources RENAME COLUMN account_id TO coa_id;
ALTER INDEX IF EXISTS financial_sources_account_id_idx RENAME TO financial_sources_coa_id_idx;
COMMENT ON COLUMN financial_sources.coa_id IS 'Linked chart of account for this source';

-- Recreate source_recent_transactions_view with updated column
DROP TRIGGER IF EXISTS refresh_source_recent_transactions_view ON financial_transactions;
DROP FUNCTION IF EXISTS refresh_source_recent_transactions_view();
DROP MATERIALIZED VIEW IF EXISTS source_recent_transactions_view;

CREATE MATERIALIZED VIEW source_recent_transactions_view AS
SELECT
  DISTINCT ON (h.id)
  h.id AS header_id,
  fs.id AS source_id,
  fs.coa_id,
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
JOIN financial_transaction_headers h
  ON ft.header_id = h.id
 AND h.deleted_at IS NULL
LEFT JOIN categories c ON ft.category_id = c.id
JOIN financial_sources fs ON fs.coa_id = ft.account_id
WHERE fs.coa_id IS NOT NULL
  AND ft.deleted_at IS NULL
ORDER BY h.id, ft.id;

CREATE INDEX IF NOT EXISTS source_recent_transactions_view_account_date_idx
  ON source_recent_transactions_view(coa_id, date);
CREATE INDEX IF NOT EXISTS source_recent_transactions_view_fund_date_idx
  ON source_recent_transactions_view(fund_id, date);
CREATE UNIQUE INDEX IF NOT EXISTS source_recent_transactions_view_header_id_uidx
  ON source_recent_transactions_view(header_id);

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

COMMENT ON MATERIALIZED VIEW source_recent_transactions_view IS
  'Latest transactions per header aggregated for each financial source account, fund, and tenant, excluding deleted headers and transactions.';
COMMENT ON FUNCTION refresh_source_recent_transactions_view() IS
  'Refreshes source_recent_transactions_view whenever transactions change.';
COMMENT ON TRIGGER refresh_source_recent_transactions_view ON financial_transactions IS
  'Keeps source_recent_transactions_view up to date.';
