
-- Create a table to store customer authentication details
CREATE TABLE public.customer_auth (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL UNIQUE,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.customer_auth ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_auth table
CREATE POLICY "Customers can view their own auth records" 
  ON public.customer_auth 
  FOR SELECT 
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Shopkeepers can view customer auth records for their customers" 
  ON public.customer_auth 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = customer_auth.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Shopkeepers can create customer auth records for their customers" 
  ON public.customer_auth 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = customer_auth.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Shopkeepers can update customer auth records for their customers" 
  ON public.customer_auth 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.customers 
      WHERE customers.id = customer_auth.customer_id 
      AND customers.user_id = auth.uid()
    )
  );

-- Add a column to customers table to track if they have an auth account
ALTER TABLE public.customers ADD COLUMN has_auth_account BOOLEAN NOT NULL DEFAULT false;

-- Create an index for better performance
CREATE INDEX idx_customer_auth_phone ON public.customer_auth(phone);
CREATE INDEX idx_customer_auth_customer_id ON public.customer_auth(customer_id);

-- Create a function to handle customer auth account creation
CREATE OR REPLACE FUNCTION public.create_customer_auth_account(
  p_customer_id UUID,
  p_phone TEXT,
  p_name TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_auth_user_id UUID;
  v_customer_auth_id UUID;
BEGIN
  -- Create auth user for customer
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    phone,
    phone_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_confirmed_at,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    NULL,
    p_phone,
    NOW(),
    '{"provider": "phone", "providers": ["phone"]}',
    jsonb_build_object('name', p_name, 'isCustomer', true),
    NOW(),
    NOW(),
    '',
    NULL,
    '',
    '',
    ''
  ) RETURNING id INTO v_auth_user_id;

  -- Create customer auth record
  INSERT INTO public.customer_auth (
    customer_id,
    phone,
    auth_user_id,
    is_verified
  ) VALUES (
    p_customer_id,
    p_phone,
    v_auth_user_id,
    true
  ) RETURNING id INTO v_customer_auth_id;

  -- Update customer record
  UPDATE public.customers 
  SET has_auth_account = true 
  WHERE id = p_customer_id;

  RETURN v_customer_auth_id;
END;
$$;

-- Create a function to verify customer login
CREATE OR REPLACE FUNCTION public.verify_customer_login(p_phone TEXT)
RETURNS TABLE(customer_id UUID, customer_name TEXT, auth_user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as customer_id,
    c.name as customer_name,
    ca.auth_user_id
  FROM public.customers c
  JOIN public.customer_auth ca ON c.id = ca.customer_id
  WHERE ca.phone = p_phone AND ca.is_verified = true;
END;
$$;
