-- Creator applications table
CREATE TABLE public.creator_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  platform_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  discord TEXT,
  avg_viewers TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application
CREATE POLICY "Anyone can submit creator applications"
ON public.creator_applications
FOR INSERT
WITH CHECK (true);

-- Creator affiliates table (approved creators)
CREATE TABLE public.creator_affiliates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  referral_code TEXT NOT NULL UNIQUE,
  rev_share_percent INTEGER NOT NULL DEFAULT 20,
  tier TEXT NOT NULL DEFAULT 'bronze',
  status TEXT NOT NULL DEFAULT 'active',
  platform_links JSONB DEFAULT '[]'::jsonb,
  discord TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_affiliates ENABLE ROW LEVEL SECURITY;

-- Creators can view their own affiliate record
CREATE POLICY "Creators can view own affiliate record"
ON public.creator_affiliates
FOR SELECT
USING (auth.uid() = user_id);

-- Public can look up referral codes for validation
CREATE POLICY "Public can validate referral codes"
ON public.creator_affiliates
FOR SELECT
USING (status = 'active');

-- Affiliate earnings table
CREATE TABLE public.affiliate_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creator_affiliates(id),
  user_id UUID NOT NULL,
  round_id UUID REFERENCES public.fantasy_rounds(id),
  entry_fee INTEGER NOT NULL,
  rev_share_percent INTEGER NOT NULL,
  earnings_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- Creators can view their own earnings
CREATE POLICY "Creators can view own earnings"
ON public.affiliate_earnings
FOR SELECT
USING (
  creator_id IN (
    SELECT id FROM public.creator_affiliates WHERE user_id = auth.uid()
  )
);

-- Affiliate payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creator_affiliates(id),
  amount INTEGER NOT NULL,
  month TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Creators can view their own payouts
CREATE POLICY "Creators can view own payouts"
ON public.affiliate_payouts
FOR SELECT
USING (
  creator_id IN (
    SELECT id FROM public.creator_affiliates WHERE user_id = auth.uid()
  )
);

-- Add referrer column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referrer_code TEXT;

-- Create index for referrer lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referrer_code ON public.profiles(referrer_code);
CREATE INDEX IF NOT EXISTS idx_creator_affiliates_referral_code ON public.creator_affiliates(referral_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_creator_id ON public.affiliate_earnings(creator_id);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code(creator_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  -- Create base code from name (lowercase, alphanumeric only)
  base_code := lower(regexp_replace(creator_name, '[^a-zA-Z0-9]', '', 'g'));
  base_code := substring(base_code from 1 for 15);
  
  -- Try base code first
  final_code := base_code;
  
  -- Add numbers if code exists
  WHILE EXISTS (SELECT 1 FROM public.creator_affiliates WHERE referral_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || counter::text;
  END LOOP;
  
  RETURN final_code;
END;
$$;