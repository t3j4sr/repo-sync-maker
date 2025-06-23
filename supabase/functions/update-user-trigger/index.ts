
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function will be used to update the trigger
    const sql = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path TO ''
      AS $$
      BEGIN
        INSERT INTO public.profiles (id, shopkeeper_name, shop_name, phone)
        VALUES (
          new.id,
          COALESCE(new.raw_user_meta_data ->> 'shopkeeperName', new.raw_user_meta_data ->> 'shopkeeper_name', new.raw_user_meta_data ->> 'name', 'Customer'),
          COALESCE(new.raw_user_meta_data ->> 'shopName', new.raw_user_meta_data ->> 'shop_name', 'N/A'),
          COALESCE(new.phone, new.raw_user_meta_data ->> 'phone', '')
        );
        RETURN new;
      END;
      $$;
    `;

    return new Response(
      JSON.stringify({ message: 'Trigger function updated', sql }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
