-- 1. System Settings Table (Singleton)
create table if not exists public.system_settings (
  id integer primary key default 1 check (id = 1),
  maintenance_mode boolean not null default false,
  announcement_message text
);

-- Insert the default row if it doesn't exist
insert into public.system_settings (id, maintenance_mode, announcement_message)
values (1, false, null)
on conflict (id) do nothing;

-- Disable RLS on system_settings
alter table public.system_settings disable row level security;

-- 2. Push Subscriptions Table
create table if not exists public.push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- ensure a user doesn't have duplicate endpoints
  unique(user_id, endpoint)
);

-- Disable RLS on push_subscriptions
alter table public.push_subscriptions disable row level security;
