
-- Add expires_at column to scratch_cards table
ALTER TABLE public.scratch_cards 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NULL;
