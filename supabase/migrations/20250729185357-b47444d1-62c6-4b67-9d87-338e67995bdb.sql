-- CRITICAL SECURITY FIXES

-- 1. Fix RLS policies - Enable RLS on tables that have policies but RLS disabled
ALTER TABLE card_minting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE esports_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_live_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_match_kill_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_match_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_player_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_player_match_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE faceit_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_round_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_round_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_player_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nft_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE panda_team_head_to_head ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_match_team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_players_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_team_detailed_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE pandascore_tournaments ENABLE ROW LEVEL SECURITY;

-- 2. Create missing profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Fix database functions security - Add proper search_path
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

-- 4. Add trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();