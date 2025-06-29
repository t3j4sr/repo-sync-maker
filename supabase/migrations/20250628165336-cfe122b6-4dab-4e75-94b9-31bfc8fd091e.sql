
-- Create the scratch_cards table
CREATE TABLE public.scratch_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('amount', 'better_luck')),
  discount_value INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  scratched_at TIMESTAMP WITH TIME ZONE NULL,
  is_scratched BOOLEAN NOT NULL DEFAULT false,
  shop_name TEXT NOT NULL DEFAULT 'Sri Krishna Groceries'
);

-- Enable RLS for the scratch_cards table
ALTER TABLE public.scratch_cards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for scratch_cards
CREATE POLICY "Users can view scratch cards for their customers" 
  ON public.scratch_cards 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = scratch_cards.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert scratch cards for their customers" 
  ON public.scratch_cards 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = scratch_cards.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update scratch cards for their customers" 
  ON public.scratch_cards 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = scratch_cards.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Create a function to generate scratch cards based on purchase amount
CREATE OR REPLACE FUNCTION public.generate_scratch_cards_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cards_to_generate INTEGER;
  i INTEGER;
  random_discount FLOAT;
  discount_type_val TEXT;
  discount_value_val INTEGER;
  shop_name_val TEXT;
BEGIN
  -- Calculate number of cards to generate (1 card per Rs 150)
  cards_to_generate := FLOOR(NEW.amount / 150);
  
  -- Get shop name from the user's profile
  SELECT shop_name INTO shop_name_val
  FROM public.profiles
  WHERE id = NEW.user_id;
  
  -- Generate the calculated number of cards
  FOR i IN 1..cards_to_generate LOOP
    -- Generate random discount with specified probabilities
    random_discount := RANDOM();
    
    IF random_discount < 0.3 THEN
      -- 30% chance of "Better Luck Next Time"
      discount_type_val := 'better_luck';
      discount_value_val := 0;
    ELSIF random_discount < 0.44 THEN
      -- 14% chance of Rs 10
      discount_type_val := 'amount';
      discount_value_val := 10;
    ELSIF random_discount < 0.58 THEN
      -- 14% chance of Rs 20
      discount_type_val := 'amount';
      discount_value_val := 20;
    ELSIF random_discount < 0.72 THEN
      -- 14% chance of Rs 30
      discount_type_val := 'amount';
      discount_value_val := 30;
    ELSIF random_discount < 0.86 THEN
      -- 14% chance of Rs 40
      discount_type_val := 'amount';
      discount_value_val := 40;
    ELSE
      -- 14% chance of Rs 50
      discount_type_val := 'amount';
      discount_value_val := 50;
    END IF;
    
    -- Insert the scratch card
    INSERT INTO public.scratch_cards (
      customer_id,
      discount_type,
      discount_value,
      shop_name
    ) VALUES (
      NEW.customer_id,
      discount_type_val,
      discount_value_val,
      COALESCE(shop_name_val, 'Sri Krishna Groceries')
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically generate scratch cards on purchase
CREATE TRIGGER trigger_generate_scratch_cards_on_purchase
  AFTER INSERT ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_scratch_cards_on_purchase();
