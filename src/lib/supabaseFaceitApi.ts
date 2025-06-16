import { supabase } from '@/integrations/supabase/client';

export interface FaceitPlayer {
  nickname: string;
  player_id: string;
  skill_level?: number;
  avatar?: string;
}

export interface EnhancedFaceitPlayer extends FaceitPlayer {
  total_matches?: number;
  win_rate?: number;
  avg_kd_ratio?: number;
  kd_ratio?: number; // Add this property
  avg_headshots_percent?: number;
  recent_form?: string;
  recent_form_string?: string; // Add this property
  country?: string;
  membership?: string;
  faceit_elo?: number;
  current_win_streak?: number;
  recent_results?: string[];
}

export interface PlayerMatchHistory {
  id: string;
  match_id: string;
  player_id: string;
  player_nickname: string;
  match_date: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  kd_ratio?: number;
  headshots_percent?: number;
  match_result?: 'win' | 'loss';
  team_name?: string;
  opponent_team_name?: string;
  map_name?: string;
  competition_name?: string;
  faceit_elo_change?: number;
}

export interface FaceitMatch {
  id: string;
  match_id: string;
  game: string;
  region?: string;
  competition_name?: string;
  competition_type?: string;
  organized_by?: string;
  status: string;
  started_at?: string;
  scheduled_at?: string;
  finished_at?: string;
  configured_at?: string;
  calculate_elo?: boolean;
  version?: number;
  teams: Array<{
    id?: string;
    name: string;
    logo: string;
    avatar?: string;
    roster?: FaceitPlayer[];
  }>;
  voting?: any;
  faceitData?: {
    region?: string;
    competitionType?: string;
    calculateElo?: boolean;
  };
  raw_data?: any;
  championship_stream_url?: string;
  startTime: string;
  endTime?: string;
  tournament: string;
  esportType: string; // Add this property
  bestOf: number; // Add this property
  source?: 'amateur' | 'professional';
}

export const fetchSupabaseFaceitMatches = async (limit = 50) => {
  console.log('🔍 Fetching FACEIT matches from Supabase...');
  
  const { data, error } = await supabase
    .from('faceit_matches')
    .select('*')
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching FACEIT matches:', error);
    throw new Error(`Failed to fetch FACEIT matches: ${error.message}`);
  }

  console.log(`✅ Fetched ${data?.length || 0} FACEIT matches`);
  
  return data?.map(transformFaceitMatch) || [];
};

export const fetchSupabaseFaceitMatchDetails = async (matchId: string): Promise<FaceitMatch | null> => {
  console.log(`🔍 Fetching FACEIT match details for: ${matchId}`);
  
  const { data, error } = await supabase
    .from('faceit_matches')
    .select('*')
    .eq('match_id', matchId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error fetching FACEIT match details:', error);
    throw new Error(`Failed to fetch FACEIT match details: ${error.message}`);
  }

  if (!data) {
    console.log('❌ No FACEIT match found with ID:', matchId);
    return null;
  }

  console.log('✅ FACEIT match details fetched successfully');
  return transformFaceitMatch(data);
};

export const fetchSupabaseFaceitAllMatches = async (limit = 100) => {
  return fetchSupabaseFaceitMatches(limit);
};

export const fetchSupabaseFaceitMatchesByDate = async (date: string, limit = 50) => {
  console.log('🔍 Fetching FACEIT matches by date from Supabase...');
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('faceit_matches')
    .select('*')
    .gte('scheduled_at', startOfDay.toISOString())
    .lte('scheduled_at', endOfDay.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching FACEIT matches by date:', error);
    throw new Error(`Failed to fetch FACEIT matches by date: ${error.message}`);
  }

  console.log(`✅ Fetched ${data?.length || 0} FACEIT matches for date: ${date}`);
  
  return data?.map(transformFaceitMatch) || [];
};

export const triggerFaceitLiveSync = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-live');
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error triggering FACEIT live sync:', error);
    return false;
  }
};

export const triggerFaceitUpcomingSync = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-upcoming');
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error triggering FACEIT upcoming sync:', error);
    return false;
  }
};

const transformFaceitMatch = (match: any): FaceitMatch => {
  return {
    id: match.match_id,
    match_id: match.match_id,
    game: match.game,
    region: match.region,
    competition_name: match.competition_name,
    competition_type: match.competition_type,
    organized_by: match.organized_by,
    status: match.status,
    started_at: match.started_at,
    scheduled_at: match.scheduled_at,
    finished_at: match.finished_at,
    configured_at: match.configured_at,
    calculate_elo: match.calculate_elo,
    version: match.version,
    teams: (match.teams || []).map((team: any, index: number) => ({
      id: team.id || `team_${index + 1}`,
      name: team.name,
      logo: team.logo || team.avatar || '/placeholder.svg',
      avatar: team.avatar,
      roster: team.roster || []
    })),
    voting: match.voting,
    faceitData: match.faceit_data,
    raw_data: match.raw_data,
    championship_stream_url: match.championship_stream_url,
    startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
    endTime: match.finished_at,
    tournament: match.competition_name || 'FACEIT Match',
    esportType: 'csgo', // Add default esportType for FACEIT matches
    bestOf: 1, // Add default bestOf for FACEIT matches
    source: 'amateur'
  };
};
