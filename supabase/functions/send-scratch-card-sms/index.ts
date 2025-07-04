
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.2'

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { name, phone, scratch_card_code } = await req.json()

    // Twilio SMS sending
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!accountSid || !authToken || !twilioPhone) {
      throw new Error('Twilio credentials not configured')
    }

    const message = `Hey ${name}, welcome to our scratch card game! 🎉\nYou've earned a chance to win a discount. Scratch your card now: https://mpzwlxpbhipnzizthftb.supabase.co/card/${scratch_card_code}`

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
    
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
      console.error('Twilio error:', errorText)
      throw new Error(`Twilio API error: ${twilioResponse.status}`)
    }

    const twilioResult = await twilioResponse.json()
    console.log('SMS sent successfully:', twilioResult.sid)

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioResult.sid }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending SMS:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
