-- Create Support Tickets Table
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable Row Level Security (RLS) because HomiePay uses custom client-side auth
alter table public.support_tickets disable row level security;
