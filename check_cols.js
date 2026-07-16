const { Client } = require('pg');
const client = new Client('postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
client.connect().then(() => {
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users';");
}).then(res => {
  console.dir(res.rows, {depth: null});
  client.end();
}).catch(console.error);
