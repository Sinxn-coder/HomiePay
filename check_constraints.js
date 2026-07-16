const { Client } = require('pg');
const client = new Client('postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
client.connect().then(() => {
  return client.query("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE conrelid = 'group_invites'::regclass;");
}).then(res => {
  console.dir(res.rows, {depth: null});
  client.end();
}).catch(console.error);
