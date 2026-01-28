-- =============================================================================
-- Migration: Usage Tracking Triggers
-- =============================================================================
-- Description: Creates triggers to automatically track usage when members,
--              transactions, and communications are created/deleted.
-- Date: 2026-01-28
-- Author: Claude Code
-- =============================================================================

BEGIN;

-- =============================================================================
-- Trigger: Member Count Tracking
-- Purpose: Update member count when members are created/deleted
--          Counts ALL members for a tenant (regardless of status)
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New member added (count all non-deleted members)
    IF NEW.deleted_at IS NULL THEN
      PERFORM increment_usage(NEW.tenant_id, 'members', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete / restore
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Member soft-deleted
      PERFORM increment_usage(NEW.tenant_id, 'members', -1);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- Member restored from soft delete
      PERFORM increment_usage(NEW.tenant_id, 'members', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Hard delete
    IF OLD.deleted_at IS NULL THEN
      PERFORM increment_usage(OLD.tenant_id, 'members', -1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS member_count_trigger ON members;
CREATE TRIGGER member_count_trigger
  AFTER INSERT OR UPDATE OF deleted_at OR DELETE
  ON members
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_member_count();


-- =============================================================================
-- Trigger: Transaction Count Tracking
-- Purpose: Update transaction count when financial transactions are created
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_transaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM increment_usage(NEW.tenant_id, 'transactions', 1);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS transaction_count_trigger ON financial_transaction_headers;
CREATE TRIGGER transaction_count_trigger
  AFTER INSERT
  ON financial_transaction_headers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_transaction_count();


-- =============================================================================
-- Trigger: Email Count Tracking
-- Purpose: Update email count when campaign emails are sent
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_email_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count if channel is email and status indicates sent
    IF NEW.channel = 'email' AND NEW.status IN ('sent', 'delivered') THEN
      PERFORM increment_usage(NEW.tenant_id, 'emails', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Count when status changes to sent/delivered
    IF OLD.status NOT IN ('sent', 'delivered')
       AND NEW.status IN ('sent', 'delivered')
       AND NEW.channel = 'email' THEN
      PERFORM increment_usage(NEW.tenant_id, 'emails', 1);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS email_count_trigger ON campaign_recipients;
CREATE TRIGGER email_count_trigger
  AFTER INSERT OR UPDATE OF status
  ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_email_count();


-- =============================================================================
-- Trigger: SMS Count Tracking
-- Purpose: Update SMS count when campaign SMS messages are sent
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_sms_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count if channel is sms and status indicates sent
    IF NEW.channel = 'sms' AND NEW.status IN ('sent', 'delivered') THEN
      PERFORM increment_usage(NEW.tenant_id, 'sms', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Count when status changes to sent/delivered
    IF OLD.status NOT IN ('sent', 'delivered')
       AND NEW.status IN ('sent', 'delivered')
       AND NEW.channel = 'sms' THEN
      PERFORM increment_usage(NEW.tenant_id, 'sms', 1);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS sms_count_trigger ON campaign_recipients;
CREATE TRIGGER sms_count_trigger
  AFTER INSERT OR UPDATE OF status
  ON campaign_recipients
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_sms_count();


-- =============================================================================
-- Trigger: Storage Tracking (if media table exists)
-- Purpose: Update storage usage when files are uploaded/deleted
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_storage_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.file_size IS NOT NULL AND NEW.deleted_at IS NULL THEN
      PERFORM increment_usage(NEW.tenant_id, 'storage_bytes', NEW.file_size::INTEGER);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      PERFORM increment_usage(NEW.tenant_id, 'storage_bytes', -(OLD.file_size::INTEGER));
    -- Handle restore from soft delete
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      PERFORM increment_usage(NEW.tenant_id, 'storage_bytes', NEW.file_size::INTEGER);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.file_size IS NOT NULL AND OLD.deleted_at IS NULL THEN
      PERFORM increment_usage(OLD.tenant_id, 'storage_bytes', -(OLD.file_size::INTEGER));
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on media table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'media') THEN
    DROP TRIGGER IF EXISTS storage_usage_trigger ON media;
    CREATE TRIGGER storage_usage_trigger
      AFTER INSERT OR UPDATE OF file_size, deleted_at OR DELETE
      ON media
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_storage_usage();
    RAISE NOTICE 'Created storage_usage_trigger on media table';
  ELSE
    RAISE NOTICE 'Media table does not exist, skipping storage trigger';
  END IF;
END $$;


-- =============================================================================
-- Trigger: AI Credits Usage Tracking
-- Purpose: Update AI credits usage when credits are consumed
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_ai_credits_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment usage by credits_used (debit transactions)
    IF NEW.credits_used > 0 THEN
      PERFORM increment_usage(NEW.tenant_id, 'ai_credits', NEW.credits_used);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on ai_credit_transactions table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_credit_transactions') THEN
    DROP TRIGGER IF EXISTS ai_credits_usage_trigger ON ai_credit_transactions;
    CREATE TRIGGER ai_credits_usage_trigger
      AFTER INSERT
      ON ai_credit_transactions
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_ai_credits_usage();
    RAISE NOTICE 'Created ai_credits_usage_trigger on ai_credit_transactions table';
  ELSE
    RAISE NOTICE 'ai_credit_transactions table does not exist, skipping AI credits trigger';
  END IF;
END $$;


-- =============================================================================
-- Trigger: Admin User Count Tracking
-- Purpose: Update admin user count when roles are assigned/revoked
-- Note: user_roles table uses hard deletes, not soft deletes
-- =============================================================================

CREATE OR REPLACE FUNCTION trigger_update_admin_user_count()
RETURNS TRIGGER AS $$
DECLARE
  v_is_admin_role BOOLEAN;
BEGIN
  -- Check if the role is an admin role
  SELECT EXISTS (
    SELECT 1 FROM roles
    WHERE id = COALESCE(NEW.role_id, OLD.role_id)
    AND code IN ('tenant_admin', 'staff', 'admin')
  ) INTO v_is_admin_role;

  IF NOT v_is_admin_role THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Check if user doesn't already have admin role for this tenant
    IF NOT EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = NEW.user_id
        AND ur.tenant_id = NEW.tenant_id
        AND ur.id != NEW.id
        AND r.code IN ('tenant_admin', 'staff', 'admin')
    ) THEN
      PERFORM increment_usage(NEW.tenant_id, 'admin_users', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Check if user has no other admin roles
    IF NOT EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = OLD.user_id
        AND ur.tenant_id = OLD.tenant_id
        AND ur.id != OLD.id
        AND r.code IN ('tenant_admin', 'staff', 'admin')
    ) THEN
      PERFORM increment_usage(OLD.tenant_id, 'admin_users', -1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS admin_user_count_trigger ON user_roles;
CREATE TRIGGER admin_user_count_trigger
  AFTER INSERT OR DELETE
  ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_admin_user_count();


-- =============================================================================
-- Create usage records for existing tenants (sync will happen in next migration)
-- =============================================================================
DO $$
DECLARE
  v_tenant RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_tenant IN SELECT id FROM tenants WHERE deleted_at IS NULL LOOP
    -- Create usage record if not exists (with zero values)
    INSERT INTO tenant_usage (tenant_id)
    VALUES (v_tenant.id)
    ON CONFLICT (tenant_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Created usage records for % tenants', v_count;
END $$;

-- Success confirmation
DO $$
BEGIN
  RAISE NOTICE 'Successfully created usage tracking triggers';
END $$;

COMMIT;
