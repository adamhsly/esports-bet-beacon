
import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { startOfDay, endOfDay } from 'date-fns';

// Enhanced player interface with comprehensive stats
export interface EnhancedFaceitPlayer {
  player_id: string;
  nickname: string;
  avatar?: string;
  country?: string;
  skill_level?: number;
  faceit_elo?: number;
  membership?: string;
  total_matches?: number;
  total_wins?: number;
  win_rate?: number;
  avg_kd_ratio?: number;
  avg_headshots_percent?: number;
  longest_win_streak?: number;
  current_win_streak?: number;
  recent_results?: string[];
  recent_form?: 'unknown' | 'poor' | 'average' | 'good' | 'excellent';
  recent_form_string?: string;
  map_stats?: Record<string, any>;
  match_history?: PlayerMatchHistory[];
  last_fetched_at?: string; // Add the missing property
}

// New interface for player match history
export interface PlayerMatchHistory {
  id: string;
  match_id: string;
  match_date: string;
  map_name?: string;
  team_name?: string;
  opponent_team_name?: string;
  match_result: 'win' | 'loss';
  competition_name?: string;
  competition_type?: string;
  kills?: number;
  deaths?: number;
  assists?: number;
  kd_ratio?: number;
  headshots?: number;
  headshots_percent?: number;
  mvps?: number;
  adr?: number;
  faceit_elo_change?: number;
}

// Helper function to map FACEIT statuses to display categories with time-based logic
const getFaceitStatusCategory = (status: string, startTime?: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  // Finished match statuses (always respect finished status)
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) {
    return 'finished';
  }
  
  // Time-based live status determination
  if (startTime) {
    const now = new Date();
    const matchStart = new Date(startTime);
    const hasStarted = now >= matchStart;
    
    if (hasStarted && !['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) {
      return 'live';
    }
  }
  
  // Default live status fallback for explicit live statuses
  if (['ongoing', 'running', 'live'].includes(lowerStatus)) {
    return 'live';
  }
  
  // Upcoming match statuses
  if (['upcoming', 'ready', 'scheduled', 'configured'].includes(lowerStatus)) {
    return 'upcoming';
  }
  
  return null;
};

// Helper function to determine header type with time-based logic
const getHeaderType = (status: string, startTime?: string): 'finished' | 'live' | 'upcoming' => {
  const normalizedStatus = status?.toLowerCase() || '';
  
  // Finished match statuses (always respect finished status)
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
    return 'finished';
  }
  
  // Time-based live status determination
  if (startTime) {
    const now = new Date();
    const matchStart = new Date(startTime);
    const hasStarted = now >= matchStart;
    
    if (hasStarted && !['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus)) {
      return 'live';
    }
  }
  
  // Default live status fallback for explicit live statuses
  if (['ongoing', 'running', 'live'].includes(normalizedStatus)) {
    return 'live';
  }
  
  // Default to upcoming
  return 'upcoming';
};

// Simplified and direct roster extraction function
const extractPlayersFromRoster = (rosterData: any, teamName: string): any[] => {
  console.log(`🔍 Extracting players for ${teamName} from roster:`, rosterData);
  
  if (!rosterData) {
    console.log(`⚠️ No roster data for ${teamName}`);
    return [];
  }
  
  // Handle array of players directly
  if (Array.isArray(rosterData)) {
    console.log(`✅ Found array roster for ${teamName} with ${rosterData.length} players`);
    
    return rosterData.map((player: any, index: number) => {
      console.log(`🎮 Processing player ${index + 1} for ${teamName}:`, player);
      
      // Map the database fields to expected component format
      const processedPlayer = {
        player_id: player.player_id || player.id || player.user_id || `player_${teamName}_${index}`,
        nickname: player.nickname || player.name || player.username || `Player ${index + 1}`,
        avatar: player.avatar || player.image_url || player.picture,
        skill_level: player.game_skill_level || player.skill_level || player.faceit_level || 1,
        membership: player.membership || player.faceit_subscription || 'free',
        elo: player.faceit_elo || player.elo || player.rating || 800,
        games: player.games || (player.lifetime && player.lifetime.Matches) || 0
      };
      
      console.log(`✅ Processed player for ${teamName}:`, processedPlayer);
      return processedPlayer;
    });
  }
  
  console.log(`⚠️ Roster for ${teamName} is not an array:`, typeof rosterData);
  return [];
};

// Helper function to safely convert Json to string array
const convertToStringArray = (jsonData: any): string[] => {
  if (!jsonData) return [];
  
  if (Array.isArray(jsonData)) {
    return jsonData.map(item => String(item));
  }
  
  return [];
};

// Helper function to validate recent_form values
const validateRecentForm = (form: any): 'unknown' | 'poor' | 'average' | 'good' | 'excellent' => {
  const validForms = ['unknown', 'poor', 'average', 'good', 'excellent'] as const;
  if (typeof form === 'string' && validForms.includes(form as any)) {
    return form as 'unknown' | 'poor' | 'average' | 'good' | 'excellent';
  }
  return 'unknown';
};

// Helper function to safely convert Json to Record<string, any>
const convertToMapStats = (jsonData: any): Record<string, any> => {
  if (!jsonData) return {};
  
  if (typeof jsonData === 'object' && jsonData !== null && !Array.isArray(jsonData)) {
    return jsonData as Record<string, any>;
  }
  
  return {};
};

// New function to fetch player match history
export const fetchPlayerMatchHistory = async (playerId: string): Promise<PlayerMatchHistory[]> => {
  try {
    console.log(`📚 Fetching match history for player: ${playerId}`);
    
    const { data: matchHistory, error } = await supabase
      .from('faceit_player_match_history')
      .select('*')
      .eq('player_id', playerId)
      .order('match_date', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching player match history:', error);
      return [];
    }

    console.log(`📊 Retrieved ${matchHistory?.length || 0} match history records for player ${playerId}`);
    
    return (matchHistory || []).map(match => ({
      id: match.id,
      match_id: match.match_id,
      match_date: match.match_date,
      map_name: match.map_name,
      team_name: match.team_name,
      opponent_team_name: match.opponent_team_name,
      match_result: match.match_result as 'win' | 'loss',
      competition_name: match.competition_name,
      competition_type: match.competition_type,
      kills: match.kills,
      deaths: match.deaths,
      assists: match.assists,
      kd_ratio: match.kd_ratio,
      headshots: match.headshots,
      headshots_percent: match.headshots_percent,
      mvps: match.mvps,
      adr: match.adr,
      faceit_elo_change: match.faceit_elo_change
    }));
  } catch (error) {
    console.error('Error in fetchPlayerMatchHistory:', error);
    return [];
  }
};

// New function to fetch enhanced player stats
export const fetchFaceitPlayerStats = async (playerIds: string[]): Promise<EnhancedFaceitPlayer[]> => {
  try {
    console.log(`🎮 Fetching enhanced stats for ${playerIds.length} players...`);
    
    const { data: players, error } = await supabase
      .from('faceit_player_stats')
      .select('*')
      .in('player_id', playerIds);

    if (error) {
      console.error('Error fetching FACEIT player stats:', error);
      return [];
    }

    console.log(`📊 Retrieved enhanced stats for ${players?.length || 0} players`);
    
    const enhancedPlayers = await Promise.all(
      (players || []).map(async (player) => {
        // Fetch match history for each player
        const matchHistory = await fetchPlayerMatchHistory(player.player_id);
        
        return {
          player_id: player.player_id,
          nickname: player.nickname,
          avatar: player.avatar,
          country: player.country,
          skill_level: player.skill_level,
          faceit_elo: player.faceit_elo,
          membership: player.membership,
          total_matches: player.total_matches,
          total_wins: player.total_wins,
          win_rate: player.win_rate,
          avg_kd_ratio: player.avg_kd_ratio,
          avg_headshots_percent: player.avg_headshots_percent,
          longest_win_streak: player.longest_win_streak,
          current_win_streak: player.current_win_streak,
          recent_results: convertToStringArray(player.recent_results),
          recent_form: validateRecentForm(player.recent_form),
          recent_form_string: player.recent_form_string,
          map_stats: convertToMapStats(player.map_stats),
          match_history: matchHistory,
          last_fetched_at: player.last_fetched_at // Include the last_fetched_at property
        };
      })
    );
    
    return enhancedPlayers;
  } catch (error) {
    console.error('Error in fetchFaceitPlayerStats:', error);
    return [];
  }
};

// New function to trigger enhanced player stats sync
export const triggerFaceitPlayerStatsSync = async (playerIds: string[]): Promise<boolean> => {
  try {
    console.log(`🔄 Triggering player stats sync for ${playerIds.length} players...`);
    const { data, error } = await supabase.functions.invoke('sync-faceit-player-stats', {
      body: { player_ids: playerIds }
    });
    
    if (error) {
      console.error('Error triggering FACEIT player stats sync:', error);
      return false;
    }

    console.log('FACEIT player stats sync triggered successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in triggerFaceitPlayerStatsSync:', error);
    return false;
  }
};

// New function to fetch specific match details - optimized for speed
export const fetchSupabaseFaceitMatchDetails = async (matchId: string): Promise<any | null> => {
  try {
    console.log(`🔍 Fetching FACEIT match details from database for: ${matchId}`);
    
    // Remove 'faceit_' prefix if present
    const cleanMatchId = matchId.startsWith('faceit_') ? matchId.replace('faceit_', '') : matchId;
    
    const { data: match, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .eq('match_id', cleanMatchId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching FACEIT match details:', error);
      return null;
    }

    if (!match) {
      console.log(`No match found for ID: ${cleanMatchId}`);
      return null;
    }

    console.log('📊 Raw match data from database:', JSON.stringify(match, null, 2));
    
    // Extract player IDs from match data
    const playerIds: string[] = [];
    const teams = match.teams as any;
    
    // Collect all player IDs from both teams
    if (teams?.faction1?.roster) {
      teams.faction1.roster.forEach((player: any) => {
        if (player.player_id) playerIds.push(player.player_id);
      });
    }
    if (teams?.faction2?.roster) {
      teams.faction2.roster.forEach((player: any) => {
        if (player.player_id) playerIds.push(player.player_id);
      });
    }

    console.log(`🎮 Found ${playerIds.length} players, fetching enhanced stats from database...`);
    
    // Fetch enhanced player statistics directly from database (no API calls)
    const enhancedPlayers = await fetchFaceitPlayerStats(playerIds);
    console.log(`✅ Retrieved enhanced stats for ${enhancedPlayers.length} players from database`);

    // Create a lookup map for enhanced player data
    const playerStatsMap = new Map<string, EnhancedFaceitPlayer>();
    enhancedPlayers.forEach(player => {
      playerStatsMap.set(player.player_id, player);
    });

    // Enhanced roster extraction with comprehensive stats
    const extractEnhancedPlayersFromRoster = (rosterData: any, teamName: string): any[] => {
      console.log(`🔍 Extracting enhanced players for ${teamName} from roster:`, rosterData);
      
      if (!rosterData || !Array.isArray(rosterData)) {
        console.log(`⚠️ No roster data for ${teamName}`);
        return [];
      }
      
      return rosterData.map((player: any, index: number) => {
        const enhancedStats = playerStatsMap.get(player.player_id);
        
        const processedPlayer = {
          player_id: player.player_id || player.id || player.user_id || `player_${teamName}_${index}`,
          nickname: player.nickname || player.name || player.username || `Player ${index + 1}`,
          avatar: player.avatar || player.image_url || player.picture,
          
          // Enhanced stats from database (fallback to basic data if not available)
          skill_level: enhancedStats?.skill_level || player.game_skill_level || player.skill_level || player.faceit_level || 1,
          faceit_elo: enhancedStats?.faceit_elo || player.faceit_elo || player.elo || player.rating || 800,
          membership: enhancedStats?.membership || player.membership || player.faceit_subscription || 'free',
          country: enhancedStats?.country || player.country,
          
          // Performance statistics (only available if enhanced stats exist)
          total_matches: enhancedStats?.total_matches || 0,
          total_wins: enhancedStats?.total_wins || 0,
          win_rate: enhancedStats?.win_rate || 0,
          kd_ratio: enhancedStats?.avg_kd_ratio || 0,
          avg_headshots_percent: enhancedStats?.avg_headshots_percent || 0,
          longest_win_streak: enhancedStats?.longest_win_streak || 0,
          current_win_streak: enhancedStats?.current_win_streak || 0,
          recent_form: enhancedStats?.recent_form || 'unknown',
          recent_form_string: enhancedStats?.recent_form_string || '',
          recent_results: enhancedStats?.recent_results || [],
          map_stats: enhancedStats?.map_stats || {},
          match_history: enhancedStats?.match_history || [],
          
          // Legacy fields for compatibility
          games: player.games || (player.lifetime && player.lifetime.Matches) || enhancedStats?.total_matches || 0,
          
          // Add data freshness indicator
          has_enhanced_stats: !!enhancedStats,
          last_updated: enhancedStats?.last_fetched_at || null
        };
        
        return processedPlayer;
      });
    };
    
    // Extract enhanced rosters
    let team1Roster: any[] = [];
    let team2Roster: any[] = [];
    
    if (teams?.faction1?.roster) {
      team1Roster = extractEnhancedPlayersFromRoster(teams.faction1.roster, 'Team 1');
    }
    if (teams?.faction2?.roster) {
      team2Roster = extractEnhancedPlayersFromRoster(teams.faction2.roster, 'Team 2');
    }
    
    console.log(`🎮 Enhanced roster extraction results (database-only):`);
    console.log(`   - Team 1: ${team1Roster.length} players`);
    console.log(`   - Team 2: ${team2Roster.length} players`);
    console.log(`   - Players with enhanced stats: ${team1Roster.concat(team2Roster).filter(p => p.has_enhanced_stats).length}`);
    
    // Guarantee a proper startTime: Prefer scheduled_at (if not null/invalid), else started_at, else configured_at, else current time
    function getStartTime(m: any) {
      if (m?.scheduled_at && !isNaN(new Date(m.scheduled_at).getTime())) {
        return m.scheduled_at;
      }
      if (m?.started_at && !isNaN(new Date(m.started_at).getTime())) {
        return m.started_at;
      }
      if (m?.configured_at && !isNaN(new Date(m.configured_at).getTime())) {
        return m.configured_at;
      }
      return m?.created_at || new Date().toISOString();
    }

    // Extract best_of from raw_data with proper type checking
    let bestOf = 3;
    if (match.raw_data && typeof match.raw_data === 'object' && match.raw_data !== null) {
      const rawData = match.raw_data as Record<string, any>;
      if (typeof rawData.best_of === 'number') {
        bestOf = rawData.best_of;
      }
    }
    if (match.faceit_data && typeof match.faceit_data === 'object' && match.faceit_data !== null) {
      const faceitData = match.faceit_data as Record<string, any>;
      if (typeof faceitData.best_of === 'number') {
        bestOf = faceitData.best_of;
      }
    }

    // 🔧 CRITICAL FIX: Extract results from raw_data or faceit_data
    let results = null;
    
    // Check raw_data first for results
    if (match.raw_data && typeof match.raw_data === 'object' && match.raw_data !== null) {
      const rawData = match.raw_data as Record<string, any>;
      if (rawData.results) {
        results = rawData.results;
        console.log('🏆 Found results in raw_data:', results);
      }
    }
    
    // Fallback to faceit_data if no results in raw_data
    if (!results && match.faceit_data && typeof match.faceit_data === 'object' && match.faceit_data !== null) {
      const faceitData = match.faceit_data as Record<string, any>;
      if (faceitData.results) {
        results = faceitData.results;
        console.log('🏆 Found results in faceit_data:', results);
      }
    }

    // Transform to expected format with enhanced data
    const transformedMatch = {
      id: `faceit_${match.match_id}`,
      teams: [
        {
          name: teams?.faction1?.name || teams?.team1?.name || 'Team 1',
          logo: teams?.faction1?.avatar || teams?.team1?.logo || '/placeholder.svg',
          id: teams?.faction1?.id || teams?.team1?.id || `team1_${match.match_id}`,
          roster: team1Roster
        },
        {
          name: teams?.faction2?.name || teams?.team2?.name || 'Team 2',
          logo: teams?.faction2?.avatar || teams?.team2?.logo || '/placeholder.svg',
          id: teams?.faction2?.id || teams?.team2?.id || `team2_${match.match_id}`,
          roster: team2Roster
        }
      ],
      startTime: getStartTime(match),
      tournament: match.competition_name || 'FACEIT Match',
      tournament_name: match.competition_name,
      season_name: match.competition_type,
      class_name: match.organized_by,
      esportType: 'csgo',
      bestOf: bestOf,
      source: 'amateur' as const,
      status: match.status, // 🔧 CRITICAL: Include status for proper header detection
      finished_at: match.finished_at, // 🔧 CRITICAL: Include finished_at for finished matches
      finishedTime: match.finished_at, // 🔧 CRITICAL: Legacy field for compatibility
      faceitData: {
        region: match.region,
        competitionType: match.competition_type,
        organizedBy: match.organized_by,
        calculateElo: match.calculate_elo,
        results: results // 🔧 CRITICAL: Include results data for winner/score display
      },
      faceitMatchDetails: {
        version: match.version,
        configuredAt: match.configured_at,
        finishedAt: match.finished_at,
        voting: match.voting
      }
    };
    
    console.log('✅ Fast match loading completed with results:', {
      hasResults: !!results,
      results: results,
      status: match.status,
      finishedAt: match.finished_at
    });
    
    return transformedMatch;
    
  } catch (error) {
    console.error('Error in fetchSupabaseFaceitMatchDetails:', error);
    return null;
  }
};

export const fetchSupabaseFaceitAllMatches = async (): Promise<MatchInfo[]> => {
  try {
    console.log('🔄 Fetching all FACEIT matches from Supabase...');
    
    // Use broader status filtering to include all relevant matches
    const { data: matches, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .in('status', ['upcoming', 'ongoing', 'finished', 'ready', 'scheduled', 'configured', 'running', 'live', 'completed', 'cancelled', 'aborted'])
      .order('scheduled_at', { ascending: true })
      .limit(500);

    if (error) {
      console.error('Error fetching FACEIT matches:', error);
      return [];
    }

    console.log(`📊 Found ${matches?.length || 0} FACEIT matches in database`);
    
    // Log status distribution for debugging
    if (matches && matches.length > 0) {
      const statusCounts: Record<string, number> = {};
      matches.forEach(match => {
        statusCounts[match.status] = (statusCounts[match.status] || 0) + 1;
      });
      console.log('📊 FACEIT match status distribution:', statusCounts);
    }

    // Filter out matches with TBC/TBD teams before transformation
    const filteredMatches = (matches || []).filter(match => {
      const teams = match.teams as any;
      const team1Name = (teams.faction1?.name || teams.team1?.name || '').toLowerCase();
      const team2Name = (teams.faction2?.name || teams.team2?.name || '').toLowerCase();
      return team1Name !== 'tbc' && team1Name !== 'tbd' && 
             team2Name !== 'tbc' && team2Name !== 'tbd';
    });

    console.log(`📊 After filtering TBC/TBD: ${filteredMatches.length} FACEIT matches (removed ${(matches?.length || 0) - filteredMatches.length})`);

    return filteredMatches.map(match => {
      const teams = match.teams as any;
      const rawData = match.raw_data as any;
      
      // 🔧 CRITICAL: Store the database match_id for routing
      const databaseMatchId = match.match_id;
      console.log(`🔍 Processing match with database match_id: ${databaseMatchId}`);
      
      // Extract best_of from raw_data or faceit_data, fallback to 3
      let bestOf = 3;
      if (match.raw_data && typeof match.raw_data === 'object' && match.raw_data !== null) {
        const rawData = match.raw_data as any;
        if (rawData.best_of) {
          bestOf = rawData.best_of;
        }
      }
      if (match.faceit_data && typeof match.faceit_data === 'object' && match.faceit_data !== null) {
        const faceitData = match.faceit_data as any;
        if (faceitData.best_of) {
          bestOf = faceitData.best_of;
        }
      }

      // Extract results from raw_data if available
      let results = null;
      if (rawData && rawData.results) {
        results = rawData.results;
        console.log(`🏆 Match ${databaseMatchId} has results:`, results);
      }

      const transformedMatch = {
        id: `faceit_${databaseMatchId}`, // 🔧 USE DATABASE MATCH_ID DIRECTLY
        teams: [
          {
            name: teams.faction1?.name || teams.team1?.name || 'Team 1',
            logo: teams.faction1?.avatar || teams.team1?.logo || '/placeholder.svg',
            id: teams.faction1?.id || teams.team1?.id || `team1_${databaseMatchId}`
          },
          {
            name: teams.faction2?.name || teams.team2?.name || 'Team 2',
            logo: teams.faction2?.avatar || teams.team2?.logo || '/placeholder.svg',
            id: teams.faction2?.id || teams.team2?.id || `team2_${databaseMatchId}`
          }
        ] as [any, any],
        startTime: match.scheduled_at || match.started_at || match.created_at,
        tournament: match.competition_name || 'FACEIT Match',
        esportType: match.game || 'cs2',
        bestOf: bestOf,
        source: 'amateur' as const,
        status: match.status, // CRITICAL: Include status for routing logic
        faceitData: {
          region: match.region,
          competitionType: match.competition_type,
          organizedBy: match.organized_by,
          calculateElo: match.calculate_elo,
          results: results // CRITICAL: Include results for winner display and routing
        },
        // 🔧 ADD: Store the original database match_id for easy access
        databaseMatchId: databaseMatchId
      } satisfies MatchInfo & { databaseMatchId: string };

      // Enhanced logging for debugging routing issues
      console.log(`🔍 Transformed match ${databaseMatchId}:`, {
        transformedId: transformedMatch.id,
        databaseMatchId: databaseMatchId,
        status: transformedMatch.status,
        hasResults: !!transformedMatch.faceitData?.results,
        teams: [teams.faction1?.name, teams.faction2?.name],
        routingData: {
          status: transformedMatch.status,
          results: transformedMatch.faceitData?.results,
          isFinished: transformedMatch.status === 'finished',
          willRouteToFinished: transformedMatch.status === 'finished' || transformedMatch.status === 'completed'
        }
      });

      return transformedMatch;
    });
  } catch (error) {
    console.error('Error in fetchSupabaseFaceitAllMatches:', error);
    return [];
  }
};

export const fetchSupabaseFaceitMatchesByDate = async (date: Date) => {
  try {
    console.log('🗓️ Fetching FACEIT matches for date:', date.toDateString());
    
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    
    const { data: matches, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .gte('scheduled_at', startDate.toISOString())
      .lte('scheduled_at', endDate.toISOString())
      .order('scheduled_at', { ascending: true });

    if (error) {
      console.error('Error fetching FACEIT matches by date:', error);
      return { live: [], upcoming: [], finished: [] };
    }

    console.log(`📊 Found ${matches?.length || 0} FACEIT matches for ${date.toDateString()}`);
    
    // Log status distribution for debugging
    if (matches && matches.length > 0) {
      const statusCounts: Record<string, number> = {};
      matches.forEach(match => {
        statusCounts[match.status] = (statusCounts[match.status] || 0) + 1;
      });
      console.log('📊 FACEIT date-filtered status distribution:', statusCounts);
    }

    const transformedMatches = (matches || []).map(match => {
      const teams = match.teams as any;
      const rawData = match.raw_data as any;
      
      // Extract best_of from raw_data or faceit_data, fallback to 3
      let bestOf = 3;
      if (match.raw_data && typeof match.raw_data === 'object' && match.raw_data !== null) {
        const rawData = match.raw_data as any;
        if (rawData.best_of) {
          bestOf = rawData.best_of;
        }
      }
      if (match.faceit_data && typeof match.faceit_data === 'object' && match.faceit_data !== null) {
        const faceitData = match.faceit_data as any;
        if (faceitData.best_of) {
          bestOf = faceitData.best_of;
        }
      }

      // Extract results from raw_data if available
      let results = null;
      if (rawData && rawData.results) {
        results = rawData.results;
      }

      return {
        id: `faceit_${match.match_id}`,
        teams: [
          {
            name: teams.faction1?.name || teams.team1?.name || 'Team 1',
            logo: teams.faction1?.avatar || teams.team1?.logo || '/placeholder.svg',
            id: teams.faction1?.id || teams.team1?.id || `team1_${match.match_id}`
          },
          {
            name: teams.faction2?.name || teams.team2?.name || 'Team 2',
            logo: teams.faction2?.avatar || teams.team2?.logo || '/placeholder.svg',
            id: teams.faction2?.id || teams.team2?.id || `team2_${match.match_id}`
          }
        ] as [any, any],
        startTime: match.scheduled_at || match.started_at || match.created_at,
        tournament: match.competition_name || 'FACEIT Match',
        esportType: match.game || 'cs2',
        bestOf: bestOf,
        source: 'amateur' as const,
        status: match.status, // Include status for routing logic
        faceitData: {
          region: match.region,
          competitionType: match.competition_type,
          organizedBy: match.organized_by,
          calculateElo: match.calculate_elo,
          results: results // Include results for winner display
        }
      } satisfies MatchInfo;
    });

    // Separate live, upcoming, and finished matches using time-based status mapping
    const live = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      const statusCategory = matchRecord ? getFaceitStatusCategory(matchRecord.status, matchRecord.scheduled_at) : null;
      return statusCategory === 'live';
    });

    const upcoming = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      const statusCategory = matchRecord ? getFaceitStatusCategory(matchRecord.status, matchRecord.scheduled_at) : null;
      return statusCategory === 'upcoming';
    });

    const finished = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      const statusCategory = matchRecord ? getFaceitStatusCategory(matchRecord.status, matchRecord.scheduled_at) : null;
      return statusCategory === 'finished';
    });

    console.log(`📊 FACEIT matches categorized: ${live.length} live, ${upcoming.length} upcoming, ${finished.length} finished`);
    
    // Log specific match details for debugging
    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const teams = match.teams as any;
        const team1Name = teams.faction1?.name || teams.team1?.name || 'Team 1';
        const team2Name = teams.faction2?.name || teams.team2?.name || 'Team 2';
        console.log(`🎮 FACEIT Match: ${team1Name} vs ${team2Name} - Status: ${match.status} - Category: ${getFaceitStatusCategory(match.status, match.scheduled_at)}`);
      });
    }
    
    return { live, upcoming, finished };
  } catch (error) {
    console.error('Error in fetchSupabaseFaceitMatchesByDate:', error);
    return { live: [], upcoming: [], finished: [] };
  }
};

// New function to fetch recent finished matches for homepage
export const fetchSupabaseFaceitFinishedMatches = async (limit: number = 10): Promise<MatchInfo[]> => {
  try {
    console.log('🏁 Fetching recent finished FACEIT matches...');
    
    const { data: matches, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .in('status', ['finished', 'completed', 'cancelled', 'aborted'])
      .order('finished_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching finished FACEIT matches:', error);
      return [];
    }

    console.log(`🏁 Found ${matches?.length || 0} finished FACEIT matches`);

    return (matches || []).map(match => {
      const teams = match.teams as any;
      const rawData = match.raw_data as any;
      
      // Extract best_of from raw_data or faceit_data, fallback to 3
      let bestOf = 3;
      if (match.raw_data && typeof match.raw_data === 'object' && match.raw_data !== null) {
        const rawData = match.raw_data as any;
        if (rawData.best_of) {
          bestOf = rawData.best_of;
        }
      }
      if (match.faceit_data && typeof match.faceit_data === 'object' && match.faceit_data !== null) {
        const faceitData = match.faceit_data as any;
        if (faceitData.best_of) {
          bestOf = faceitData.best_of;
        }
      }

      // Extract results from raw_data if available
      let results = null;
      if (rawData && rawData.results) {
        results = rawData.results;
      }

      return {
        id: `faceit_${match.match_id}`,
        teams: [
          {
            name: teams.faction1?.name || teams.team1?.name || 'Team 1',
            logo: teams.faction1?.avatar || teams.team1?.logo || '/placeholder.svg',
            id: teams.faction1?.id || teams.team1?.id || `team1_${match.match_id}`
          },
          {
            name: teams.faction2?.name || teams.team2?.name || 'Team 2',
            logo: teams.faction2?.avatar || teams.team2?.logo || '/placeholder.svg',
            id: teams.faction2?.id || teams.team2?.id || `team2_${match.match_id}`
          }
        ] as [any, any],
        startTime: match.scheduled_at || match.started_at || match.created_at,
        tournament: match.competition_name || 'FACEIT Match',
        esportType: match.game || 'cs2',
        bestOf: bestOf,
        source: 'amateur' as const,
        status: match.status,
        faceitData: {
          region: match.region,
          competitionType: match.competition_type,
          organizedBy: match.organized_by,
          calculateElo: match.calculate_elo,
          results: results
        }
      } satisfies MatchInfo;
    });
  } catch (error) {
    console.error('Error in fetchSupabaseFaceitFinishedMatches:', error);
    return [];
  }
};

export const triggerFaceitLiveSync = async (games?: string[]): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-live', {
      body: { games: games || ['cs2'] }
    });
    
    if (error) {
      console.error('Error triggering FACEIT live sync:', error);
      return false;
    }

    console.log('FACEIT live sync triggered successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in triggerFaceitLiveSync:', error);
    return false;
  }
};

export const triggerFaceitUpcomingSync = async (games?: string[]): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-upcoming', {
      body: { games: games || ['cs2'] }
    });
    
    if (error) {
      console.error('Error triggering FACEIT upcoming sync:', error);
      return false;
    }

    console.log('FACEIT upcoming sync triggered successfully:', data);
    return true;
  } catch (error) {
    console.error('Error in triggerFaceitUpcomingSync:', error);
    return false;
  }
};
