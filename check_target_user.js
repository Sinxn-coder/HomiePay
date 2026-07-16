const { Client } = require('pg');
const client = new Client('postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres');
client.connect().then(() => {
  return client.query("SELECT * FROM users WHERE id = '959d472f-cd16-424c-95ff-ec797844eab2'");
}).then(res => {
  console.dir(res.rows, {depth: null});
  client.end();
}).catch(console.error);
