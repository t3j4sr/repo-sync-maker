
-- Create the eligible_customers table
CREATE TABLE public.eligible_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  purchase_amount NUMERIC NOT NULL,
  scratch_card_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'base64url'),
  discount_value TEXT NOT NULL,
  is_scratched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.eligible_customers ENABLE ROW LEVEL SECURITY;

-- Create policy for public access to scratch cards (for the scratch page)
CREATE POLICY "Public can view scratch cards by code" 
  ON public.eligible_customers 
  FOR SELECT 
  USING (true);

-- Create policy for updating scratch status
CREATE POLICY "Public can update scratch status" 
  ON public.eligible_customers 
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- Create function to generate scratch card when purchase > 150
CREATE OR REPLACE FUNCTION public.generate_scratch_card_for_purchase()
RETURNS TRIGGER AS $$
DECLARE
  discount_options TEXT[] := ARRAY['5%', '10%', '15%', '20%', '25%'];
  selected_discount TEXT;
  customer_name TEXT;
  customer_phone TEXT;
BEGIN
  -- Only generate card if purchase amount > 150
  IF NEW.amount > 150 THEN
    -- Get customer details
    SELECT name, phone INTO customer_name, customer_phone
    FROM public.customers 
    WHERE id = NEW.customer_id;
    
    -- Select random discount
    selected_discount := discount_options[1 + floor(random() * array_length(discount_options, 1))];
    
    -- Insert into eligible_customers
    INSERT INTO public.eligible_customers (
      name, 
      phone, 
      purchase_amount, 
      discount_value
    ) VALUES (
      customer_name,
      customer_phone,
      NEW.amount,
      selected_discount
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on purchases table
CREATE TRIGGER on_purchase_create_scratch_card
  AFTER INSERT ON public.purchases
  FOR EACH ROW 
  EXECUTE FUNCTION public.generate_scratch_card_for_purchase();
