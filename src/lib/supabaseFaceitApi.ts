
import { supabase } from '@/integrations/supabase/client';

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
    name: string;
    logo?: string;
    avatar?: string;
    roster?: Array<{
      nickname: string;
      player_id: string;
      skill_level?: number;
      avatar?: string;
    }>;
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
    teams: match.teams || [],
    voting: match.voting,
    faceitData: match.faceit_data,
    raw_data: match.raw_data,
    championship_stream_url: match.championship_stream_url,
    startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
    endTime: match.finished_at,
  };
};
