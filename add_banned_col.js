const { Client } = require('pg');
const client = new Client('postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
client.connect().then(() => {
  return client.query(`
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
  `);
}).then(res => {
  console.log('Added is_banned column successfully');
  client.end();
}).catch(console.error);
