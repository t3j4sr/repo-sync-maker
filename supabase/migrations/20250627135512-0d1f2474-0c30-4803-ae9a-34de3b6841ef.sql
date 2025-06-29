
-- Add a new column to store scratch card codes as a JSON array
ALTER TABLE public.customers 
ADD COLUMN scratch_cards JSONB DEFAULT '[]'::jsonb;

-- Create a function to generate a new scratch card for a customer after purchase
CREATE OR REPLACE FUNCTION public.generate_scratch_card_for_customer()
RETURNS TRIGGER AS $$
DECLARE
  discount_options TEXT[] := ARRAY['5%', '10%', '15%', '20%', '25%'];
  selected_discount TEXT;
  new_scratch_code TEXT;
  current_scratch_cards JSONB;
BEGIN
  -- Generate a unique scratch card code
  new_scratch_code := encode(gen_random_bytes(16), 'base64url');
  
  -- Select random discount
  selected_discount := discount_options[1 + floor(random() * array_length(discount_options, 1))];
  
  -- Get current scratch cards for the customer
  SELECT COALESCE(scratch_cards, '[]'::jsonb) INTO current_scratch_cards
  FROM public.customers 
  WHERE id = NEW.customer_id;
  
  -- Add the new scratch card to the array
  UPDATE public.customers
  SET scratch_cards = current_scratch_cards || jsonb_build_object(
    'code', new_scratch_code,
    'discount', selected_discount,
    'is_scratched', false,
    'purchase_id', NEW.id,
    'created_at', NOW()
  )
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on purchases table to generate scratch card
DROP TRIGGER IF EXISTS on_purchase_create_scratch_card ON public.purchases;
CREATE TRIGGER on_purchase_create_scratch_card
  AFTER INSERT ON public.purchases
  FOR EACH ROW 
  EXECUTE FUNCTION public.generate_scratch_card_for_customer();
