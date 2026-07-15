-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.group_invites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id text NOT NULL,
  from_user_id uuid NOT NULL,
  to_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, to_user_id)
);

-- Enable RLS
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

-- Allow users to insert invites if they are the from_user_id
CREATE POLICY "Users can send invites"
  ON public.group_invites
  FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

-- Allow users to view invites they sent or received
CREATE POLICY "Users can view their invites"
  ON public.group_invites
  FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Allow users to update invites they received (to accept/decline)
CREATE POLICY "Users can respond to invites"
  ON public.group_invites
  FOR UPDATE
  USING (auth.uid() = to_user_id)
  WITH CHECK (auth.uid() = to_user_id);

-- Wait, the client uses non-authenticated supabase calls by just querying the users table directly with UUIDs in our setup?
-- Yes, HomiePay uses a custom auth system via the `users` table instead of Supabase Auth for end-users!
-- So `auth.uid()` WILL NOT WORK because they are not logged into Supabase Auth. They are just anonymous users.

-- If you are not using Supabase Auth for end-users, you need to allow anonymous access:
DROP POLICY IF EXISTS "Users can send invites" ON public.group_invites;
DROP POLICY IF EXISTS "Users can view their invites" ON public.group_invites;
DROP POLICY IF EXISTS "Users can respond to invites" ON public.group_invites;

CREATE POLICY "Allow anonymous insert for invites"
  ON public.group_invites FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anonymous select for invites"
  ON public.group_invites FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anonymous update for invites"
  ON public.group_invites FOR UPDATE TO anon USING (true);
