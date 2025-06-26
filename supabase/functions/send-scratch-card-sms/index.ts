
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  customerName: string;
  cardsCount: number;
  totalPurchase: number;
  isWelcomeSMS?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Scratch card SMS function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, customerName, cardsCount, totalPurchase, isWelcomeSMS = false }: SMSRequest = await req.json();
    
    console.log('Processing SMS for:', { phone, customerName, cardsCount, totalPurchase, isWelcomeSMS });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Missing Twilio credentials');
      throw new Error('Twilio credentials not configured');
    }

    // Create the scratch card link
    const scratchCardUrl = `https://mpzwlxpbhipnzizthftb.supabase.co/scratch-cards?phone=${encodeURIComponent(phone)}`;
    
    let message: string;
    
    if (isWelcomeSMS) {
      // Combined welcome + scratch card message
      message = `🎉 Welcome ${customerName}! You have been registered and earned ${cardsCount} scratch card${cardsCount > 1 ? 's' : ''} for your Rs ${totalPurchase} purchase!

🎫 Click here to scratch and win: ${scratchCardUrl}

Good luck! 🍀`;
    } else {
      // Regular scratch card message
      message = `🎉 Congratulations ${customerName}! You've earned ${cardsCount} scratch card${cardsCount > 1 ? 's' : ''} for your Rs ${totalPurchase} purchase! 

🎫 Click here to scratch your cards and win exciting prizes: ${scratchCardUrl}

Valid for 1 hour only. Good luck! 🍀`;
    }

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: phone,
      From: twilioPhone,
      Body: message,
    });

    console.log('Sending SMS via Twilio...');
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Twilio error:', responseData);
      return new Response(JSON.stringify({ 
        error: responseData.message || 'Failed to send SMS',
        code: responseData.code 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('SMS sent successfully:', responseData.sid);
    
    return new Response(JSON.stringify({ 
      success: true, 
      messageSid: responseData.sid,
      scratchCardUrl 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-scratch-card-sms function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
