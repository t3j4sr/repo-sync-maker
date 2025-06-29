
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json()

    console.log('Received OTP request for phone:', phone)
    console.log('OTP to send:', otp)

    // Validate input
    if (!phone || !otp) {
      throw new Error('Phone number and OTP are required')
    }

    // Twilio SMS sending
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    console.log('Twilio config check:', {
      accountSid: accountSid ? 'Set' : 'Missing',
      authToken: authToken ? 'Set' : 'Missing',
      twilioPhone: twilioPhone ? 'Set' : 'Missing'
    })

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured')
    }

    const message = `Your OTP for Sri Krishna Groceries scratch card is: ${otp}. Valid for 10 minutes.`

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
    console.log('Sending SMS to:', phone)
    
    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone,
        From: twilioPhone,
        Body: message,
      }),
    })

    if (!twilioResponse.ok) {
      const errorText = await twilioResponse.text()
      console.error('Twilio error response:', errorText)
      throw new Error(`Twilio API error: ${twilioResponse.status} - ${errorText}`)
    }

    const twilioResult = await twilioResponse.json()
    console.log('OTP SMS sent successfully:', twilioResult.sid)

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioResult.sid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending OTP SMS:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
