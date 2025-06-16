
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
  kd_ratio?: number;
  avg_headshots_percent?: number;
  recent_form?: string;
  recent_form_string?: string;
  country?: string;
  membership?: string;
  faceit_elo?: number;
  current_win_streak?: number;
  recent_results?: string[];
  match_history?: PlayerMatchHistory[];
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
  teams: [{
    id?: string;
    name: string;
    logo: string;
    avatar?: string;
    roster?: FaceitPlayer[];
  }, {
    id?: string;
    name: string;
    logo: string;
    avatar?: string;
    roster?: FaceitPlayer[];
  }];
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
  esportType: string;
  bestOf: number;
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
  console.log('🔄 Raw FACEIT match data from database:', match);
  
  // Extract teams from the database structure - teams can be stored as faction1/faction2 or as an array
  let team1, team2;
  
  if (match.teams && typeof match.teams === 'object') {
    if (match.teams.faction1 && match.teams.faction2) {
      // Teams stored as faction1/faction2 objects
      team1 = match.teams.faction1;
      team2 = match.teams.faction2;
    } else if (Array.isArray(match.teams) && match.teams.length >= 2) {
      // Teams stored as array
      team1 = match.teams[0];
      team2 = match.teams[1];
    } else {
      // Fallback for unexpected structure
      console.warn('⚠️ Unexpected team structure in FACEIT match:', match.teams);
      team1 = { name: 'Team 1', avatar: '/placeholder.svg', roster: [] };
      team2 = { name: 'Team 2', avatar: '/placeholder.svg', roster: [] };
    }
  } else {
    // No team data available
    team1 = { name: 'Team 1', avatar: '/placeholder.svg', roster: [] };
    team2 = { name: 'Team 2', avatar: '/placeholder.svg', roster: [] };
  }

  console.log('🔄 Extracted teams:', { team1, team2 });

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
    teams: [
      {
        id: team1.team_id || team1.id || `team_1_${match.match_id}`,
        name: team1.name || 'Team 1',
        logo: team1.avatar || team1.logo || '/placeholder.svg',
        avatar: team1.avatar,
        roster: team1.roster || []
      },
      {
        id: team2.team_id || team2.id || `team_2_${match.match_id}`,
        name: team2.name || 'Team 2',
        logo: team2.avatar || team2.logo || '/placeholder.svg',
        avatar: team2.avatar,
        roster: team2.roster || []
      }
    ],
    voting: match.voting,
    faceitData: match.faceit_data,
    raw_data: match.raw_data,
    championship_stream_url: match.championship_stream_url,
    startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
    endTime: match.finished_at,
    tournament: match.competition_name || 'FACEIT Match',
    esportType: 'csgo',
    bestOf: 1,
    source: 'amateur'
  };
};
