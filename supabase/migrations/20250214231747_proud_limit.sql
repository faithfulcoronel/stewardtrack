-- Add donor to member_status enum
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'donor';

-- Add comment explaining donor status
COMMENT ON TYPE member_status IS 
  'Status of a member in the church: active, inactive, under_discipline, regular_attender, visitor, withdrawn, removed, or donor';