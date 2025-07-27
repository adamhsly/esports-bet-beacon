-- Extend the faceit_matches table with comprehensive live and historical match data
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS match_phase text CHECK (match_phase IN ('warmup', 'live', 'halftime', 'overtime', 'finished', 'cancelled'));
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS current_round integer DEFAULT 0;
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS round_timer_seconds integer DEFAULT 0;
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS overtime_rounds integer DEFAULT 0;
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS live_team_scores jsonb DEFAULT '{}';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS maps_played jsonb DEFAULT '[]';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS round_results jsonb DEFAULT '[]';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS live_player_status jsonb DEFAULT '{}';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS kill_feed jsonb DEFAULT '[]';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS economy_data jsonb DEFAULT '{}';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS objectives_status jsonb DEFAULT '{}';
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS auto_refresh_interval integer DEFAULT 15000;
ALTER TABLE public.faceit_matches ADD COLUMN IF NOT EXISTS last_live_update timestamp with time zone;

-- Create comprehensive live match stats table for real-time updates
CREATE TABLE IF NOT EXISTS public.faceit_live_match_stats (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id text NOT NULL REFERENCES public.faceit_matches(match_id) ON DELETE CASCADE,
    round_number integer NOT NULL DEFAULT 0,
    round_phase text CHECK (round_phase IN ('freezetime', 'buy', 'live', 'round_end', 'timeout')) DEFAULT 'live',
    round_timer_seconds integer DEFAULT 0,
    team_scores jsonb NOT NULL DEFAULT '{"faction1": 0, "faction2": 0}',
    player_positions jsonb DEFAULT '{}',
    player_health jsonb DEFAULT '{}',
    player_armor jsonb DEFAULT '{}',
    player_weapons jsonb DEFAULT '{}',
    player_money jsonb DEFAULT '{}',
    bomb_status text CHECK (bomb_status IN ('planted', 'defused', 'exploded', 'none')) DEFAULT 'none',
    bomb_site text,
    bomb_timer_seconds integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create comprehensive player match performance table (extends existing stats)
CREATE TABLE IF NOT EXISTS public.faceit_player_match_performance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id text NOT NULL,
    player_id text NOT NULL,
    player_nickname text NOT NULL,
    team_faction text NOT NULL CHECK (team_faction IN ('faction1', 'faction2')),
    -- Basic performance stats
    kills integer DEFAULT 0,
    deaths integer DEFAULT 0,
    assists integer DEFAULT 0,
    score integer DEFAULT 0,
    kd_ratio numeric(4,2) DEFAULT 0,
    adr numeric(6,2) DEFAULT 0,
    headshots integer DEFAULT 0,
    headshots_percent numeric(5,2) DEFAULT 0,
    mvp_rounds integer DEFAULT 0,
    rating numeric(4,3) DEFAULT 0,
    -- Advanced stats
    first_kills integer DEFAULT 0,
    first_deaths integer DEFAULT 0,
    clutch_rounds_won integer DEFAULT 0,
    clutch_rounds_attempted integer DEFAULT 0,
    damage_dealt integer DEFAULT 0,
    damage_received integer DEFAULT 0,
    utility_damage integer DEFAULT 0,
    enemies_flashed integer DEFAULT 0,
    flash_assists integer DEFAULT 0,
    -- Round-specific data
    round_kills jsonb DEFAULT '[]',
    round_deaths jsonb DEFAULT '[]',
    round_damage jsonb DEFAULT '[]',
    equipment_used jsonb DEFAULT '{}',
    map_areas_controlled jsonb DEFAULT '{}',
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(match_id, player_id)
);

-- Create round-by-round results table for detailed match analysis
CREATE TABLE IF NOT EXISTS public.faceit_match_rounds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id text NOT NULL,
    round_number integer NOT NULL,
    map_name text,
    winning_faction text CHECK (winning_faction IN ('faction1', 'faction2')),
    round_type text CHECK (round_type IN ('pistol', 'eco', 'force', 'full_buy', 'anti_eco')),
    round_end_reason text CHECK (round_end_reason IN ('elimination', 'bomb_defused', 'bomb_exploded', 'time_expired', 'surrender')),
    round_duration_seconds integer,
    faction1_score_before integer DEFAULT 0,
    faction2_score_before integer DEFAULT 0,
    faction1_score_after integer DEFAULT 0,
    faction2_score_after integer DEFAULT 0,
    bomb_planted boolean DEFAULT false,
    bomb_defused boolean DEFAULT false,
    bomb_exploded boolean DEFAULT false,
    bomb_site text,
    first_kill_player text,
    first_kill_victim text,
    first_kill_weapon text,
    round_mvp_player text,
    economy_before jsonb DEFAULT '{}',
    economy_after jsonb DEFAULT '{}',
    player_positions_start jsonb DEFAULT '{}',
    player_positions_end jsonb DEFAULT '{}',
    key_events jsonb DEFAULT '[]',
    created_at timestamp with time zone DEFAULT now(),
    
    UNIQUE(match_id, round_number, map_name)
);

-- Create kill feed table for live match events
CREATE TABLE IF NOT EXISTS public.faceit_match_kill_feed (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id text NOT NULL,
    round_number integer NOT NULL,
    timestamp timestamp with time zone DEFAULT now(),
    round_time_seconds integer,
    killer_player_id text,
    killer_nickname text,
    killer_team text CHECK (killer_team IN ('faction1', 'faction2')),
    victim_player_id text,
    victim_nickname text,
    victim_team text CHECK (victim_team IN ('faction1', 'faction2')),
    weapon text,
    headshot boolean DEFAULT false,
    wallbang boolean DEFAULT false,
    noscope boolean DEFAULT false,
    thru_smoke boolean DEFAULT false,
    blind boolean DEFAULT false,
    penetrated boolean DEFAULT false,
    assisters jsonb DEFAULT '[]',
    event_type text CHECK (event_type IN ('kill', 'assist', 'suicide', 'team_kill')) DEFAULT 'kill',
    position_killer jsonb,
    position_victim jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_faceit_matches_match_id ON public.faceit_matches(match_id);
CREATE INDEX IF NOT EXISTS idx_faceit_matches_status ON public.faceit_matches(status);
CREATE INDEX IF NOT EXISTS idx_faceit_matches_last_live_update ON public.faceit_matches(last_live_update);
CREATE INDEX IF NOT EXISTS idx_faceit_matches_match_phase ON public.faceit_matches(match_phase);

CREATE INDEX IF NOT EXISTS idx_faceit_live_match_stats_match_id ON public.faceit_live_match_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_faceit_live_match_stats_round_number ON public.faceit_live_match_stats(round_number);
CREATE INDEX IF NOT EXISTS idx_faceit_live_match_stats_updated_at ON public.faceit_live_match_stats(updated_at);

CREATE INDEX IF NOT EXISTS idx_faceit_player_match_performance_match_id ON public.faceit_player_match_performance(match_id);
CREATE INDEX IF NOT EXISTS idx_faceit_player_match_performance_player_id ON public.faceit_player_match_performance(player_id);
CREATE INDEX IF NOT EXISTS idx_faceit_player_match_performance_team_faction ON public.faceit_player_match_performance(team_faction);

CREATE INDEX IF NOT EXISTS idx_faceit_match_rounds_match_id ON public.faceit_match_rounds(match_id);
CREATE INDEX IF NOT EXISTS idx_faceit_match_rounds_round_number ON public.faceit_match_rounds(round_number);
CREATE INDEX IF NOT EXISTS idx_faceit_match_rounds_map_name ON public.faceit_match_rounds(map_name);

CREATE INDEX IF NOT EXISTS idx_faceit_match_kill_feed_match_id ON public.faceit_match_kill_feed(match_id);
CREATE INDEX IF NOT EXISTS idx_faceit_match_kill_feed_round_number ON public.faceit_match_kill_feed(round_number);
CREATE INDEX IF NOT EXISTS idx_faceit_match_kill_feed_timestamp ON public.faceit_match_kill_feed(timestamp);

-- Create trigger for automatic updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_faceit_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_faceit_live_match_stats_updated_at ON public.faceit_live_match_stats;
CREATE TRIGGER update_faceit_live_match_stats_updated_at
    BEFORE UPDATE ON public.faceit_live_match_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_faceit_updated_at_column();

DROP TRIGGER IF EXISTS update_faceit_player_match_performance_updated_at ON public.faceit_player_match_performance;
CREATE TRIGGER update_faceit_player_match_performance_updated_at
    BEFORE UPDATE ON public.faceit_player_match_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_faceit_updated_at_column();

-- Enable Row Level Security on all new tables
ALTER TABLE public.faceit_live_match_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceit_player_match_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceit_match_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faceit_match_kill_feed ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access (matches existing pattern)
CREATE POLICY "FACEIT live match stats are publicly readable" ON public.faceit_live_match_stats
    FOR SELECT USING (true);

CREATE POLICY "FACEIT player match performance is publicly readable" ON public.faceit_player_match_performance
    FOR SELECT USING (true);

CREATE POLICY "FACEIT match rounds are publicly readable" ON public.faceit_match_rounds
    FOR SELECT USING (true);

CREATE POLICY "FACEIT match kill feed is publicly readable" ON public.faceit_match_kill_feed
    FOR SELECT USING (true);