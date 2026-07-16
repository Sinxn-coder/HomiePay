const { Client } = require('pg');
const client = new Client('postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
client.connect().then(() => {
  return client.query("SELECT policyname, qual, with_check FROM pg_policies WHERE tablename = 'group_invites'");
}).then(res => {
  console.dir(res.rows, {depth: null});
  client.end();
}).catch(console.error);
