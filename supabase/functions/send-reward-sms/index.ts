
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
    const { phone, reward, customerName } = await req.json()
    
    if (!phone || !reward) {
      return new Response(
        JSON.stringify({ error: 'Phone and reward are required' }),
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
        JSON.stringify({ 
          error: 'SMS service not configured',
          details: 'Twilio credentials are missing'
        }),
        { 
          status: 200, // Return 200 so the scratch card continues to work
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

    console.log('Sending reward SMS to:', formattedPhone)

    // Send SMS using Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    const message = `🎉 Congratulations ${customerName || 'there'}! You've won: ${reward}. Use this reward on your next purchase. Thank you for playing!`
    
    const body = new URLSearchParams({
      To: formattedPhone,
      From: fromNumber,
      Body: message
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
      
      // Handle specific Twilio errors more gracefully
      let errorMessage = 'Failed to send SMS'
      if (result.code === 21608) {
        errorMessage = 'Phone number is not verified in Twilio trial account. Please verify the number at twilio.com or upgrade to a paid account.'
      } else if (result.message) {
        errorMessage = result.message
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          code: result.code,
          details: result,
          warning: 'Reward was revealed but SMS could not be sent'
        }),
        { 
          status: 200, // Return 200 so the scratch card continues to work
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Reward SMS sent successfully:', result.sid)
    
    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid, message: 'Reward sent successfully!' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error sending reward SMS:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        warning: 'Reward was revealed but SMS could not be sent'
      }),
      { 
        status: 200, // Return 200 so the scratch card continues to work
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
