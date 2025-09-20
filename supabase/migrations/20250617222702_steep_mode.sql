-- =============================================
-- Notifications Table with Tenant Isolation
-- =============================================

-- Create table
create table if not exists public.notifications (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  message text not null,
  type text not null check (type in ('success', 'info', 'warning', 'error')),
  action_type text not null check (action_type in ('redirect', 'modal', 'none')),
  action_payload text null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  tenant_id uuid null,
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade,
  constraint notifications_tenant_id_fkey foreign key (tenant_id) references tenants (id) on delete cascade
);

-- Indexes for performance
create index if not exists idx_notifications_user_id on public.notifications (user_id);
create index if not exists idx_notifications_is_read on public.notifications (is_read);
create index if not exists idx_notifications_created_at on public.notifications (created_at);
create index if not exists idx_notifications_tenant_id on public.notifications (tenant_id);

-- =============================================
-- RLS Policies for Tenant-based Access
-- =============================================

-- Enable RLS
alter table public.notifications enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can insert notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

-- Select
create policy "Users can view their own notifications"
on public.notifications
for select
to authenticated
using (
  true
);

-- Update
create policy "Users can update their own notifications"
on public.notifications
for update
to authenticated
using (
  true
);

-- Insert
create policy "Users can insert notifications"
on public.notifications
for insert
to authenticated
with check (
  true
);

-- Delete
create policy "Users can delete their own notifications"
on public.notifications
for delete
to authenticated
using (
  true
);

-- =============================================
-- Trigger: Auto-assign tenant_id on insert
-- =============================================

create or replace function set_notification_tenant_id()
returns trigger as $$
declare
  user_tenant_id uuid;
begin
  -- Skip if already provided
  if new.tenant_id is not null then
    return new;
  end if;

  -- Auto-assign tenant_id based on user_id
  select tenant_id into user_tenant_id
  from tenant_users
  where user_id = new.user_id
  limit 1;

  new.tenant_id := user_tenant_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_notification_tenant_id_trigger on public.notifications;

create trigger set_notification_tenant_id_trigger
before insert on public.notifications
for each row
execute function set_notification_tenant_id();