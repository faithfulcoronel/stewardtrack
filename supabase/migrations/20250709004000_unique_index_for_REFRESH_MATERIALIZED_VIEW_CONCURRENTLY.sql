-- Unique index required for REFRESH MATERIALIZED VIEW CONCURRENTLY
CREATE UNIQUE INDEX CONCURRENTLY 
  IF NOT EXISTS source_recent_transactions_view_header_id_uidx
  ON source_recent_transactions_view(header_id);