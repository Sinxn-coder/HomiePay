const { Client } = require('pg');

const connectionString = "postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres";

const client = new Client({
  connectionString,
});

const sql = `
  CREATE TABLE IF NOT EXISTS public.group_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_id, to_user_id)
  );

  -- Enable RLS
  ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;

  -- Create policies
  DO $$
  BEGIN
    -- Policy: Users can view invites sent to them or from them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own invites' AND tablename = 'group_invites'
    ) THEN
        CREATE POLICY "Users can view their own invites" ON public.group_invites
        FOR SELECT
        USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
    END IF;

    -- Policy: Users can create invites if they are the from_user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can create invites' AND tablename = 'group_invites'
    ) THEN
        CREATE POLICY "Users can create invites" ON public.group_invites
        FOR INSERT
        WITH CHECK (auth.uid() = from_user_id);
    END IF;

    -- Policy: Users can update their own received invites
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Users can update received invites' AND tablename = 'group_invites'
    ) THEN
        CREATE POLICY "Users can update received invites" ON public.group_invites
        FOR UPDATE
        USING (auth.uid() = to_user_id);
    END IF;
  END
  $$;
`;

async function runMigration() {
  try {
    await client.connect();
    console.log("Connected to database.");
    await client.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
  }
}

runMigration();
