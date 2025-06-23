
-- Add password field to profiles table for shopkeeper authentication
ALTER TABLE public.profiles ADD COLUMN password_hash TEXT;

-- Create function to handle shopkeeper login with password
CREATE OR REPLACE FUNCTION public.verify_shopkeeper_login(p_phone text, p_password text)
RETURNS TABLE(user_id uuid, shopkeeper_name text, shop_name text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.shopkeeper_name,
    p.shop_name
  FROM public.profiles p
  WHERE p.phone = p_phone 
    AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;

-- Create function to update shopkeeper password
CREATE OR REPLACE FUNCTION public.update_shopkeeper_password(p_phone text, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE phone = p_phone;
  
  RETURN FOUND;
END;
$$;

-- Create function to set initial password for existing shopkeepers
CREATE OR REPLACE FUNCTION public.set_shopkeeper_password(p_phone text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET password_hash = crypt(p_password, gen_salt('bf'))
  WHERE phone = p_phone AND password_hash IS NULL;
  
  RETURN FOUND;
END;
$$;
