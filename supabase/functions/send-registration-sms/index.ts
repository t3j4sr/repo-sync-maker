
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone, shopkeeperName } = await req.json()
    
    if (!phone || !shopkeeperName) {
      return new Response(
        JSON.stringify({ error: 'Phone and shopkeeper name are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get Twilio credentials from Supabase secrets
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !fromNumber) {
      console.error('Missing Twilio credentials')
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Format the phone number to ensure it has the correct format
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = `+91${formattedPhone}`
    } else if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
      formattedPhone = `+${formattedPhone}`
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`
    }

    console.log('Sending registration SMS to:', formattedPhone)

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const body = new URLSearchParams({
      To: formattedPhone,
      From: fromNumber,
      Body: `🎉 Congratulations ${shopkeeperName}! You have been successfully registered for the Lucky Draw! Check it out and good luck! 🍀`
    })

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    })

    const result = await response.json()
    
    if (!response.ok) {
      console.error('Twilio error:', result)
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: result }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Registration SMS sent successfully:', result.sid)
    
    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error sending registration SMS:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
