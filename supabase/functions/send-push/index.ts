import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import webpush from "npm:web-push@3.6.7"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") || ""
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") || ""
const VAPID_SUBJECT = "mailto:admin@homiepay.com"

// Initialize web-push with the VAPID keys
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC,
  VAPID_PRIVATE
)

serve(async (req) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { title, body, userId } = await req.json()

    if (!title || !body) {
      return new Response(JSON.stringify({ error: "Missing title or body" }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    // Connect to Supabase to fetch subscriptions
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("*")
    if (userId && userId !== 'all') {
      query = query.eq("user_id", userId)
    }
    
    const { data: subscriptions, error } = await query

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found to notify." }), { 
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      })
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-512x512.png',
      badge: '/icon-512x512.png',
    })

    const notifications = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }
      return webpush.sendNotification(pushSubscription, payload).catch(err => {
        console.error("Error sending to endpoint:", sub.endpoint, err)
        // If the subscription is gone (410) we could delete it from the DB here
      })
    })

    await Promise.all(notifications)

    return new Response(JSON.stringify({ success: true, count: notifications.length }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
