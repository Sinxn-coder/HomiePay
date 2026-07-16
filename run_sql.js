const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:Perambra12@db.ksdegmsuhzqqdlnzsqmu.supabase.co:5432/postgres'
  });
  
  await client.connect();
  console.log("Connected to Supabase.");

  try {
    const supportTicketsSql = fs.readFileSync('sql/add_support_tickets.sql', 'utf8');
    await client.query(supportTicketsSql);
    console.log("Executed add_support_tickets.sql successfully.");

    const systemSettingsSql = fs.readFileSync('sql/add_system_settings.sql', 'utf8');
    await client.query(systemSettingsSql);
    console.log("Executed add_system_settings.sql successfully.");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

main();
