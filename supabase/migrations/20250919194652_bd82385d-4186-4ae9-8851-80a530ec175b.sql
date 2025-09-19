-- Add avatar_border_id to profiles table for border configuration
ALTER TABLE public.profiles 
ADD COLUMN avatar_border_id text;