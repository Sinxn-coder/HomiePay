const { Client } = require('pg');
const client = new Client('postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
client.connect().then(() => {
  return client.query(`
    DROP POLICY IF EXISTS "Allow anonymous insert for invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Allow anonymous select for invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Allow anonymous update for invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Users can create invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Users can update received invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Users can view their own invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Users can send invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Users can respond to invites" ON public.group_invites;
    DROP POLICY IF EXISTS "Users can view their invites" ON public.group_invites;

    CREATE POLICY "Allow all anonymous access for invites"
    ON public.group_invites FOR ALL TO anon USING (true) WITH CHECK (true);
  `);
}).then(res => {
  console.log('Policies updated successfully');
  client.end();
}).catch(console.error);
