-- CRITICAL SECURITY FIX: Phase 1 - Enable RLS on all unprotected tables (corrected)
-- This addresses the most critical security vulnerabilities

-- Enable RLS on all tables that currently don't have it enabled (excluding views)
ALTER TABLE public.esports_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceit_player_match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceit_player_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceit_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_player_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panda_team_head_to_head ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pandascore_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Add public read policies for publicly accessible data
-- Esports news should be readable by everyone
CREATE POLICY "Esports news is publicly readable" ON public.esports_news
  FOR SELECT USING (true);

-- Tournament data should be publicly readable
CREATE POLICY "Tournaments are publicly readable" ON public.tournaments
  FOR SELECT USING (true);

-- PandaScore data should be publicly readable (match data, teams, tournaments)
CREATE POLICY "PandaScore matches are publicly readable" ON public.pandascore_matches
  FOR SELECT USING (true);

CREATE POLICY "PandaScore teams are publicly readable" ON public.pandascore_teams
  FOR SELECT USING (true);

CREATE POLICY "PandaScore tournaments are publicly readable" ON public.pandascore_tournaments
  FOR SELECT USING (true);

CREATE POLICY "Team head to head data is publicly readable" ON public.panda_team_head_to_head
  FOR SELECT USING (true);

-- Player stats should be publicly readable
CREATE POLICY "Faceit player stats are publicly readable" ON public.faceit_player_stats
  FOR SELECT USING (true);

CREATE POLICY "Faceit player match stats are publicly readable" ON public.faceit_player_match_stats
  FOR SELECT USING (true);

CREATE POLICY "Faceit player match history is publicly readable" ON public.faceit_player_match_history
  FOR SELECT USING (true);

-- Live performance data should be publicly readable
CREATE POLICY "Live player performance is publicly readable" ON public.live_player_performance
  FOR SELECT USING (true);

-- Sync logs should be admin-only (restrict access for now)
CREATE POLICY "Sync logs are admin readable only" ON public.pandascore_sync_logs
  FOR SELECT USING (false); -- Will be updated when user roles are implemented

CREATE POLICY "Sync state is admin readable only" ON public.pandascore_sync_state
  FOR SELECT USING (false); -- Will be updated when user roles are implemented

CREATE POLICY "Sync checkpoints are admin readable only" ON public.sync_checkpoints
  FOR SELECT USING (false); -- Will be updated when user roles are implemented

-- Fix function security by adding proper search_path settings
-- Update existing functions to include search_path for security
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.update_expired_fantasy_rounds()
RETURNS integer
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  rows_updated integer;
BEGIN
  -- Update rounds that have ended to 'finished' status
  UPDATE fantasy_rounds 
  SET status = 'finished', updated_at = now()
  WHERE end_date <= now() 
    AND status IN ('open', 'active');
    
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_fantasy_points(kills integer, deaths integer, assists integer, adr numeric, mvp_rounds integer, clutch_rounds integer, scoring_config jsonb)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  points DECIMAL := 0;
  kill_points DECIMAL := COALESCE((scoring_config->>'kills')::DECIMAL, 2);
  death_points DECIMAL := COALESCE((scoring_config->>'deaths')::DECIMAL, -1);
  assist_points DECIMAL := COALESCE((scoring_config->>'assists')::DECIMAL, 1);
  adr_multiplier DECIMAL := COALESCE((scoring_config->>'adr_multiplier')::DECIMAL, 0.1);
  mvp_bonus DECIMAL := COALESCE((scoring_config->>'mvp_bonus')::DECIMAL, 5);
  clutch_bonus DECIMAL := COALESCE((scoring_config->>'clutch_bonus')::DECIMAL, 3);
BEGIN
  points := (kills * kill_points) + 
            (deaths * death_points) + 
            (assists * assist_points) + 
            (adr * adr_multiplier) + 
            (mvp_rounds * mvp_bonus) + 
            (clutch_rounds * clutch_bonus);
  
  RETURN points;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- Remove the problematic security definer view and recreate as regular view
DROP VIEW IF EXISTS public.pandascore_view_teams;

-- Recreate as a regular view (not security definer)
CREATE VIEW public.pandascore_view_teams AS
SELECT 
    team_id as original_id,
    slug,
    acronym,
    logo_url,
    name,
    players_data,
    esport_type,
    team_id
FROM public.pandascore_teams;