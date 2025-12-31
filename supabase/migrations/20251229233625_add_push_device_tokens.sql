-- ================================================================================
-- PUSH DEVICE TOKENS TABLE
-- ================================================================================
-- Stores device tokens for Firebase Cloud Messaging push notifications
-- Supports web (browser), iOS, and Android devices
-- ================================================================================

-- Create the push_device_tokens table
CREATE TABLE IF NOT EXISTS public.push_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('web', 'ios', 'android')),
  device_name TEXT,
  browser_info JSONB, -- For web: { browser: 'Chrome', os: 'Windows', version: '120' }
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Each user can only have one token per device
  CONSTRAINT unique_user_token UNIQUE(user_id, token)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_user_id ON public.push_device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_tenant_id ON public.push_device_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_device_tokens_active ON public.push_device_tokens(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.push_device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own device tokens
CREATE POLICY "Users can view own device tokens"
  ON public.push_device_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own device tokens
CREATE POLICY "Users can insert own device tokens"
  ON public.push_device_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own device tokens
CREATE POLICY "Users can update own device tokens"
  ON public.push_device_tokens
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own device tokens
CREATE POLICY "Users can delete own device tokens"
  ON public.push_device_tokens
  FOR DELETE
  USING (user_id = auth.uid());

-- Service role has full access (for background jobs)
CREATE POLICY "Service role has full access to device tokens"
  ON public.push_device_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger to update updated_at on changes (uses existing function)
CREATE TRIGGER push_device_tokens_updated_at
  BEFORE UPDATE ON public.push_device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add comment
COMMENT ON TABLE public.push_device_tokens IS 'Stores FCM device tokens for push notifications (web, iOS, Android)';
