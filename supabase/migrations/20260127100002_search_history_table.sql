-- =====================================================
-- Search History Table
-- Stores recent searches for each user
-- =====================================================

CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  entity_types TEXT[] DEFAULT '{}',
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate recent searches
  CONSTRAINT search_history_unique_query UNIQUE (tenant_id, user_id, query)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_tenant_user ON search_history(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history(query);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at DESC);

-- RLS Policies
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own search history
CREATE POLICY "Users can view own search history"
  ON search_history
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own search history
CREATE POLICY "Users can insert own search history"
  ON search_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own search history
CREATE POLICY "Users can update own search history"
  ON search_history
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own search history
CREATE POLICY "Users can delete own search history"
  ON search_history
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Comment for documentation
COMMENT ON TABLE search_history IS 'Stores recent search queries for each user';
COMMENT ON COLUMN search_history.query IS 'The search query text (lowercase, trimmed)';
COMMENT ON COLUMN search_history.entity_types IS 'Array of entity types that were searched';
COMMENT ON COLUMN search_history.result_count IS 'Number of results returned for this search';

-- Function to clean up old search history (keep last 50 per user)
CREATE OR REPLACE FUNCTION cleanup_old_search_history()
RETURNS trigger AS $$
BEGIN
  DELETE FROM search_history
  WHERE id IN (
    SELECT id FROM search_history
    WHERE tenant_id = NEW.tenant_id AND user_id = NEW.user_id
    ORDER BY created_at DESC
    OFFSET 50
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically clean up old search history
DROP TRIGGER IF EXISTS trigger_cleanup_search_history ON search_history;
CREATE TRIGGER trigger_cleanup_search_history
  AFTER INSERT ON search_history
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_old_search_history();
