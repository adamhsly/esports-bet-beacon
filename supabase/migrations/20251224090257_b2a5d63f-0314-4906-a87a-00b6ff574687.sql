-- Add welcome_offer_claimed column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_offer_claimed boolean DEFAULT false;