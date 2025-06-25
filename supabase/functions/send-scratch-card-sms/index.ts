
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SMSRequest {
  phone: string;
  customerName: string;
  cardsCount: number;
  totalPurchase: number;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('Scratch card SMS function called');

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, customerName, cardsCount, totalPurchase }: SMSRequest = await req.json();
    
    console.log('Processing SMS for:', { phone, customerName, cardsCount, totalPurchase });

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !twilioPhone) {
      console.error('Missing Twilio credentials');
      console.log('Available env vars:', Object.keys(Deno.env.toObject()));
      throw new Error('Twilio credentials not configured');
    }

    // Format phone number to include country code if not present
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      // Assuming Indian numbers, add +91 prefix
      formattedPhone = `+91${phone.replace(/^0+/, '')}`;
    }

    console.log('Original phone:', phone);  
    console.log('Formatted phone:', formattedPhone);

    // Create the scratch card link - using the play URL
    const scratchCardUrl = `https://mpzwlxpbhipnzizthftb.supabase.co/play-scratch-cards?phone=${encodeURIComponent(formattedPhone)}`;
    
    const message = `🎉 Hey ${customerName}! You've got ${cardsCount} scratch card${cardsCount > 1 ? 's' : ''} waiting for you! 🎫

✨ Scratch & Win Amazing Prizes: ${scratchCardUrl}

⏰ Valid for 1 hour only. Good luck! 🍀

- Luck Draw Team`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    
    const body = new URLSearchParams({
      To: formattedPhone,
      From: twilioPhone,
      Body: message,
    });

    console.log('Sending SMS via Twilio to:', formattedPhone);
    console.log('From number:', twilioPhone);
    console.log('Message length:', message.length);
    
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const responseData = await response.json();
    console.log('Twilio response status:', response.status);
    console.log('Twilio response:', JSON.stringify(responseData, null, 2));
    
    if (!response.ok) {
      console.error('Twilio error:', responseData);
      return new Response(JSON.stringify({ 
        error: responseData.message || 'Failed to send SMS',
        code: responseData.code,
        details: responseData,
        phoneUsed: formattedPhone
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('SMS sent successfully! SID:', responseData.sid);
    
    return new Response(JSON.stringify({ 
      success: true, 
      messageSid: responseData.sid,
      scratchCardUrl,
      phoneUsed: formattedPhone,
      message: message
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in send-scratch-card-sms function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      stack: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);
