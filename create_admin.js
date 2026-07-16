const { createClient } = require('@supabase/supabase-js')
const { Client } = require('pg')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ksdegmsuhzqqdlnzsqmu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZGVnbXN1aHpxcWRsbnpzcW11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxODYzNjAsImV4cCI6MjA5NDc2MjM2MH0.wasZ_gQLkZsVT80rzpDz_6KexfK4qVA2gWnjcMh5rog'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function setupAdmin() {
  const client = new Client({
    // Trying url encoded password @Perambra12 -> %40Perambra12
    connectionString: 'postgresql://postgres.ksdegmsuhzqqdlnzsqmu:%40Perambra12@aws-1-ap-south-1.pooler.supabase.com:6543/postgres'
  })

  try {
    await client.connect()
    console.log('Connected to database. Deleting old admin users...')
    
    await client.query(`DELETE FROM auth.users WHERE email IN ('sinan@homiepay.com', 'admin@homiepay.com', 'msinankavala786@gmail.com')`)
    console.log('Old admins deleted.')

    console.log('Creating new admin in Supabase Auth...')
    const { data, error } = await supabase.auth.signUp({
      email: 'msinankavala786@gmail.com',
      password: '@Perambra12'
    })
    
    if (error) {
      console.error('Error creating user:', error)
      return
    }
    console.log('User created successfully:', data.user?.id)
    
    const res = await client.query(`
      UPDATE auth.users 
      SET email_confirmed_at = now() 
      WHERE email = 'msinankavala786@gmail.com'
    `)
    console.log('Email confirmed successfully! Rows updated:', res.rowCount)

  } catch (err) {
    console.error('Error during setup:', err)
  } finally {
    await client.end()
  }
}

setupAdmin()
