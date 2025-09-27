-- Migration: Fix user profile helper function type mismatch
-- This fixes the return type mismatch for the email field

-- Drop the existing function
drop function if exists get_user_profiles(uuid[]);

-- Create function to get user profiles by IDs with correct types
create or replace function get_user_profiles(user_ids uuid[])
returns table (
  id uuid,
  email character varying(255),
  raw_user_meta_data jsonb,
  email_confirmed_at timestamptz
)
language plpgsql
security definer
as $$
begin
  -- Only allow access if the requesting user is authenticated
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    au.id,
    au.email::character varying(255),
    au.raw_user_meta_data,
    au.email_confirmed_at
  from auth.users au
  where au.id = any(user_ids)
    and au.email_confirmed_at is not null; -- Only return confirmed users
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_user_profiles(uuid[]) to authenticated;

-- Add comment
comment on function get_user_profiles(uuid[]) is 'Helper function to safely retrieve user profile data from auth.users table with correct email type';