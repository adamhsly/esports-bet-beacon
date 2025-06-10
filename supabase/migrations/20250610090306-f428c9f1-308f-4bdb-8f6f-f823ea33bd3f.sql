
-- Create PandaScore matches table
CREATE TABLE public.pandascore_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id TEXT NOT NULL UNIQUE,
  esport_type TEXT NOT NULL,
  teams JSONB NOT NULL DEFAULT '{}',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  tournament_id TEXT,
  tournament_name TEXT,
  league_id TEXT,
  league_name TEXT,
  serie_id TEXT,
  serie_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  match_type TEXT,
  number_of_games INTEGER DEFAULT 3,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create PandaScore teams table
CREATE TABLE public.pandascore_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  name TEXT NOT NULL,
  acronym TEXT,
  logo_url TEXT,
  slug TEXT,
  players_data JSONB DEFAULT '[]',
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, esport_type)
);

-- Create PandaScore tournaments table
CREATE TABLE public.pandascore_tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id TEXT NOT NULL,
  esport_type TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT,
  league_id TEXT,
  league_name TEXT,
  serie_id TEXT,
  serie_name TEXT,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  image_url TEXT,
  status TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, esport_type)
);

-- Create PandaScore sync logs table
CREATE TABLE public.pandascore_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  records_processed INTEGER DEFAULT 0,
  records_added INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  error_details JSONB,
  metadata JSONB,
  esport_type TEXT
);

-- Create indexes for better performance
CREATE INDEX idx_pandascore_matches_match_id ON public.pandascore_matches(match_id);
CREATE INDEX idx_pandascore_matches_esport_type ON public.pandascore_matches(esport_type);
CREATE INDEX idx_pandascore_matches_status ON public.pandascore_matches(status);
CREATE INDEX idx_pandascore_matches_start_time ON public.pandascore_matches(start_time);
CREATE INDEX idx_pandascore_matches_last_synced ON public.pandascore_matches(last_synced_at);

CREATE INDEX idx_pandascore_teams_team_id ON public.pandascore_teams(team_id);
CREATE INDEX idx_pandascore_teams_esport_type ON public.pandascore_teams(esport_type);
CREATE INDEX idx_pandascore_teams_last_synced ON public.pandascore_teams(last_synced_at);

CREATE INDEX idx_pandascore_tournaments_tournament_id ON public.pandascore_tournaments(tournament_id);
CREATE INDEX idx_pandascore_tournaments_esport_type ON public.pandascore_tournaments(esport_type);
CREATE INDEX idx_pandascore_tournaments_last_synced ON public.pandascore_tournaments(last_synced_at);

CREATE INDEX idx_pandascore_sync_logs_sync_type ON public.pandascore_sync_logs(sync_type);
CREATE INDEX idx_pandascore_sync_logs_started_at ON public.pandascore_sync_logs(started_at);

-- Add triggers to update the updated_at column
CREATE TRIGGER update_pandascore_matches_updated_at
  BEFORE UPDATE ON public.pandascore_matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pandascore_teams_updated_at
  BEFORE UPDATE ON public.pandascore_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pandascore_tournaments_updated_at
  BEFORE UPDATE ON public.pandascore_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
