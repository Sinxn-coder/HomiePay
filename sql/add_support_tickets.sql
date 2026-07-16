-- Create Support Tickets Table
create table if not exists public.support_tickets (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.support_tickets enable row level security;

-- Policies
-- Users can insert their own tickets
create policy "Users can insert their own support tickets"
on public.support_tickets for insert
with check (auth.uid() = user_id);

-- Admins can view all tickets (Assuming no specific admin role yet, we allow all for now in RLS, but restrict via UI. Wait, we should probably just allow read/update for authenticated users and secure the admin page route like it already is. To be safe, we can allow read for the owner, and since we don't have a strict admin role in RLS, we can allow full access for authenticated users to support_tickets if they are admins. Let's just allow read for owner, and full access if we need to).
-- Actually, the admin page fetches data server-side or client-side with the service role key? No, the admin logs in using a specific email. Let's just allow all authenticated users to read/update for now, as the admin is authenticated.

create policy "Users can view their own tickets"
on public.support_tickets for select
using (auth.uid() = user_id);

-- For admin to view and update tickets, we can create a policy that allows anyone authenticated to read/update, OR we can check if the user is the admin. 
-- Since the admin logs in with a specific email (msinankavala786@gmail.com), we can write a policy for that, or just allow all authenticated users for now as a quick fix, since the admin route is protected.
create policy "Admins can view and update all tickets"
on public.support_tickets for all
using (
  auth.jwt() ->> 'email' = 'msinankavala786@gmail.com'
  or
  auth.jwt() ->> 'email' = 'admin@homiepay.com'
);
