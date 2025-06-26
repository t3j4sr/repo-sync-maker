
-- First, let's add some additional columns to the scratch_cards table if needed
ALTER TABLE public.scratch_cards 
ADD COLUMN IF NOT EXISTS prize_type TEXT DEFAULT 'better_luck',
ADD COLUMN IF NOT EXISTS prize_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour');

-- Create an index for better performance on expiration queries
CREATE INDEX IF NOT EXISTS idx_scratch_cards_expires_at ON public.scratch_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_scratch_cards_customer_id ON public.scratch_cards(customer_id);

-- Update the generate_scratch_cards_for_customer function to include prizes
CREATE OR REPLACE FUNCTION public.generate_scratch_cards_for_customer(customer_uuid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_amount NUMERIC := 0;
  cards_earned INTEGER := 0;
  existing_cards INTEGER := 0;
  cards_to_create INTEGER := 0;
  i INTEGER;
  prize_rand NUMERIC;
  prize_type_val TEXT;
  prize_value_val NUMERIC;
BEGIN
  -- Calculate total purchase amount for customer
  SELECT COALESCE(SUM(amount), 0) INTO total_amount
  FROM public.purchases 
  WHERE customer_id = customer_uuid;
  
  -- Calculate cards earned (1 card per 150 Rs)
  cards_earned := FLOOR(total_amount / 150);
  
  -- Count existing cards
  SELECT COUNT(*) INTO existing_cards
  FROM public.scratch_cards 
  WHERE customer_id = customer_uuid;
  
  -- Calculate cards to create
  cards_to_create := cards_earned - existing_cards;
  
  -- Create new cards if needed
  IF cards_to_create > 0 THEN
    FOR i IN 1..cards_to_create LOOP
      -- Generate random prize
      prize_rand := RANDOM();
      
      IF prize_rand < 0.1 THEN -- 10% chance for 30% discount
        prize_type_val := 'percentage_discount';
        prize_value_val := 30;
      ELSIF prize_rand < 0.2 THEN -- 10% chance for 20% discount  
        prize_type_val := 'percentage_discount';
        prize_value_val := 20;
      ELSIF prize_rand < 0.3 THEN -- 10% chance for Rs 50 off
        prize_type_val := 'amount_discount';
        prize_value_val := 50;
      ELSIF prize_rand < 0.4 THEN -- 10% chance for Rs 30 off
        prize_type_val := 'amount_discount';
        prize_value_val := 30;
      ELSE -- 60% chance for better luck next time
        prize_type_val := 'better_luck';
        prize_value_val := 0;
      END IF;
      
      INSERT INTO public.scratch_cards (customer_id, code, prize_type, prize_value, expires_at)
      VALUES (
        customer_uuid, 
        LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
        prize_type_val,
        prize_value_val,
        now() + interval '1 hour'
      );
    END LOOP;
  END IF;
  
  RETURN cards_to_create;
END;
$$;

-- Function to clean up expired scratch cards
CREATE OR REPLACE FUNCTION public.cleanup_expired_scratch_cards()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.scratch_cards 
  WHERE is_scratched = true AND expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Create a function to get customer scratch cards with total discount
CREATE OR REPLACE FUNCTION public.get_customer_scratch_summary(customer_uuid uuid)
RETURNS TABLE(
  total_cards INTEGER,
  unscratched_cards INTEGER,
  scratched_cards INTEGER,
  total_percentage_discount NUMERIC,
  total_amount_discount NUMERIC,
  cards_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clean up expired cards first
  PERFORM public.cleanup_expired_scratch_cards();
  
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_cards,
    COUNT(CASE WHEN NOT is_scratched THEN 1 END)::INTEGER as unscratched_cards,
    COUNT(CASE WHEN is_scratched AND expires_at > now() THEN 1 END)::INTEGER as scratched_cards,
    COALESCE(SUM(CASE WHEN is_scratched AND prize_type = 'percentage_discount' AND expires_at > now() THEN prize_value ELSE 0 END), 0) as total_percentage_discount,
    COALESCE(SUM(CASE WHEN is_scratched AND prize_type = 'amount_discount' AND expires_at > now() THEN prize_value ELSE 0 END), 0) as total_amount_discount,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'code', code,
          'is_scratched', is_scratched,
          'prize_type', prize_type,
          'prize_value', prize_value,
          'expires_at', expires_at,
          'created_at', created_at
        ) ORDER BY created_at DESC
      ), 
      '[]'::jsonb
    ) as cards_data
  FROM public.scratch_cards 
  WHERE customer_id = customer_uuid;
END;
$$;
