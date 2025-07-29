-- CRITICAL SECURITY FIXES - PART 2 (Fixed version)

-- 1. Fix RLS policies - Enable RLS on tables that have policies but RLS disabled
-- Only enable if not already enabled
DO $$
BEGIN
    -- Enable RLS on all tables with policies
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'card_minting_requests') THEN
        ALTER TABLE card_minting_requests ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'card_templates') THEN
        ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'card_transactions') THEN
        ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'esports_news') THEN
        ALTER TABLE esports_news ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Continue for all other tables...
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'faceit_live_match_stats') THEN
        ALTER TABLE faceit_live_match_stats ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'faceit_match_kill_feed') THEN
        ALTER TABLE faceit_match_kill_feed ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'faceit_match_rounds') THEN
        ALTER TABLE faceit_match_rounds ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'faceit_matches') THEN
        ALTER TABLE faceit_matches ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'nft_cards') THEN
        ALTER TABLE nft_cards ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'pandascore_matches') THEN
        ALTER TABLE pandascore_matches ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'pandascore_teams') THEN
        ALTER TABLE pandascore_teams ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'pandascore_tournaments') THEN
        ALTER TABLE pandascore_tournaments ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. Fix database functions security - Update existing functions with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_faceit_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'username',
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$function$;