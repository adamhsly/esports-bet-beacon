
import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { MatchCountBreakdown } from '@/utils/matchCountUtils';

interface MatchCountResult {
  match_date: string;
  source: string;
  match_count: number;
}

interface FaceitMatchResult {
  match_date: string;
  id: string;
  match_id: string;
  game: string;
  region: string;
  competition_name: string;
  competition_type: string;
  organized_by: string;
  status: string;
  started_at: string;
  finished_at: string;
  configured_at: string;
  calculate_elo: boolean;
  version: number;
  teams: any;
  voting: any;
  faceit_data: any;
  raw_data: any;
  created_at: string;
  updated_at: string;
  scheduled_at: string;
  championship_stream_url: string;
  championship_raw_data: any;
  match_phase: string;
  current_round: number;
  round_timer_seconds: number;
  overtime_rounds: number;
  live_team_scores: any;
  maps_played: any;
  round_results: any;
  live_player_status: any;
  kill_feed: any;
  economy_data: any;
  objectives_status: any;
  auto_refresh_interval: number;
  last_live_update: string;
}

interface PandaScoreMatchResult {
  match_date: string;
  id: string;
  match_id: string;
  esport_type: string;
  teams: any;
  start_time: string;
  end_time: string;
  tournament_id: string;
  tournament_name: string;
  league_id: string;
  league_name: string;
  serie_id: string;
  serie_name: string;
  status: string;
  match_type: string;
  number_of_games: number;
  raw_data: any;
  created_at: string;
  updated_at: string;
  last_synced_at: string;
  slug: string;
  draw: boolean;
  forfeit: boolean;
  original_scheduled_at: string;
  rescheduled: boolean;
  detailed_stats: boolean;
  winner_id: string;
  winner_type: string;
  videogame_id: string;
  videogame_name: string;
  stream_url_1: string;
  stream_url_2: string;
  modified_at: string;
  team_a_player_ids: any;
  team_b_player_ids: any;
  row_id: number;
}

// Get match counts around a specific date using Supabase functions
export async function getMatchCountsAroundDate(targetDate: Date): Promise<Record<string, MatchCountBreakdown>> {
  console.log(`🔍 Fetching match counts around date: ${targetDate.toISOString()}`);
  
  try {
    // Call both Supabase functions in parallel
    const [faceitResult, pandascoreResult] = await Promise.all([
      supabase.rpc('faceit_get_match_counts_around_date', { 
        target_date: targetDate.toISOString() 
      }),
      supabase.rpc('pandascore_get_match_counts_around_date', { 
        target_date: targetDate.toISOString() 
      })
    ]);

    if (faceitResult.error) {
      console.error('❌ Error fetching FACEIT match counts:', faceitResult.error);
    }

    if (pandascoreResult.error) {
      console.error('❌ Error fetching PandaScore match counts:', pandascoreResult.error);
    }

    const faceitCounts = faceitResult.data || [];
    const pandascoreCounts = pandascoreResult.data || [];

    console.log(`📊 FACEIT counts: ${faceitCounts.length} days`);
    console.log(`📊 PandaScore counts: ${pandascoreCounts.length} days`);

    // Combine and process the results
    const combinedCounts: Record<string, MatchCountBreakdown> = {};

    // Process FACEIT counts
    faceitCounts.forEach((count: MatchCountResult) => {
      const dateKey = count.match_date;
      if (!combinedCounts[dateKey]) {
        combinedCounts[dateKey] = {
          total: 0,
          professional: 0,
          amateur: 0,
          live: 0,
          upcoming: 0
        };
      }
      combinedCounts[dateKey].total += count.match_count;
      combinedCounts[dateKey].amateur += count.match_count;
    });

    // Process PandaScore counts
    pandascoreCounts.forEach((count: MatchCountResult) => {
      const dateKey = count.match_date;
      if (!combinedCounts[dateKey]) {
        combinedCounts[dateKey] = {
          total: 0,
          professional: 0,
          amateur: 0,
          live: 0,
          upcoming: 0
        };
      }
      combinedCounts[dateKey].total += count.match_count;
      combinedCounts[dateKey].professional += count.match_count;
    });

    console.log(`✅ Combined match counts for ${Object.keys(combinedCounts).length} days`);
    return combinedCounts;

  } catch (error) {
    console.error('❌ Error in getMatchCountsAroundDate:', error);
    return {};
  }
}

// Get simple match counts for calendar visualization
export function getTotalMatchCountsByDate(matchCountBreakdown: Record<string, MatchCountBreakdown>): Record<string, number> {
  const totalCounts: Record<string, number> = {};
  
  Object.keys(matchCountBreakdown).forEach(dateKey => {
    totalCounts[dateKey] = matchCountBreakdown[dateKey].total;
  });
  
  return totalCounts;
}

// Transform FACEIT database result to MatchInfo format
function transformFaceitMatch(match: FaceitMatchResult): MatchInfo {
  const teams = match.teams || {};
  
  return {
    id: `faceit_${match.match_id}`,
    teams: [
      {
        name: teams.faction1?.name || 'Team 1',
        logo: teams.faction1?.avatar || '/placeholder.svg',
        id: teams.faction1?.faction_id || `faceit_team_${match.match_id}_1`
      },
      {
        name: teams.faction2?.name || 'Team 2',
        logo: teams.faction2?.avatar || '/placeholder.svg',
        id: teams.faction2?.faction_id || `faceit_team_${match.match_id}_2`
      }
    ] as [any, any],
    startTime: match.started_at || match.scheduled_at,
    tournament: match.competition_name || 'FACEIT Match',
    esportType: match.game,
    bestOf: match.raw_data?.best_of || 3,
    source: 'amateur' as const,
    status: match.status,
    faceitData: match.faceit_data,
    rawData: match.raw_data
  };
}

// Transform PandaScore database result to MatchInfo format
function transformPandaScoreMatch(match: PandaScoreMatchResult): MatchInfo {
  const teams = match.teams || [];
  const team1 = Array.isArray(teams) && teams[0]?.opponent ? teams[0].opponent : {};
  const team2 = Array.isArray(teams) && teams[1]?.opponent ? teams[1].opponent : {};
  
  return {
    id: `pandascore_${match.match_id}`,
    teams: [
      {
        name: team1.name || 'Team 1',
        logo: team1.image_url || '/placeholder.svg',
        id: team1.id?.toString() || `pandascore_team_${match.match_id}_1`
      },
      {
        name: team2.name || 'Team 2',
        logo: team2.image_url || '/placeholder.svg',
        id: team2.id?.toString() || `pandascore_team_${match.match_id}_2`
      }
    ] as [any, any],
    startTime: match.start_time,
    tournament: match.tournament_name || match.league_name || 'Professional Tournament',
    tournament_name: match.tournament_name,
    league_name: match.league_name,
    esportType: match.esport_type,
    bestOf: match.number_of_games || 3,
    source: 'professional' as const,
    status: match.status,
    rawData: match.raw_data
  };
}

// Get matches around a specific date using Supabase functions
export async function getMatchesAroundDate(targetDate: Date): Promise<MatchInfo[]> {
  console.log(`🔍 Fetching matches around date: ${targetDate.toISOString()}`);
  
  try {
    // Call both Supabase functions in parallel
    const [faceitResult, pandascoreResult] = await Promise.all([
      supabase.rpc('get_faceit_matches_around_date', { 
        target_date: targetDate.toISOString() 
      }),
      supabase.rpc('get_pandascore_matches_around_date', { 
        target_date: targetDate.toISOString() 
      })
    ]);

    if (faceitResult.error) {
      console.error('❌ Error fetching FACEIT matches:', faceitResult.error);
    }

    if (pandascoreResult.error) {
      console.error('❌ Error fetching PandaScore matches:', pandascoreResult.error);
    }

    const faceitMatches = faceitResult.data || [];
    const pandascoreMatches = pandascoreResult.data || [];

    console.log(`📊 Retrieved ${faceitMatches.length} FACEIT matches and ${pandascoreMatches.length} PandaScore matches`);

    // Transform matches to MatchInfo format
    const transformedFaceit = faceitMatches.map(transformFaceitMatch);
    const transformedPandaScore = pandascoreMatches.map(transformPandaScoreMatch);

    const combinedMatches = [...transformedFaceit, ...transformedPandaScore];

    // Filter out matches with TBC/TBD teams
    const filteredMatches = combinedMatches.filter(match => {
      const teamNames = match.teams.map(team => team.name?.toLowerCase() || '');
      return !teamNames.some(name => name === 'tbc' || name === 'tbd');
    });

    console.log(`✅ Final filtered matches: ${filteredMatches.length} (removed ${combinedMatches.length - filteredMatches.length} TBC/TBD)`);
    return filteredMatches;

  } catch (error) {
    console.error('❌ Error in getMatchesAroundDate:', error);
    return [];
  }
}
