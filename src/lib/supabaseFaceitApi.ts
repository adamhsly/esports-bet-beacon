import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { startOfDay, endOfDay } from 'date-fns';

// Helper function to map FACEIT statuses to display categories
const getFaceitStatusCategory = (status: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  // Live match statuses
  if (['ongoing', 'running', 'live'].includes(lowerStatus)) {
    return 'live';
  }
  
  // Upcoming match statuses
  if (['upcoming', 'ready', 'scheduled', 'configured'].includes(lowerStatus)) {
    return 'upcoming';
  }
  
  // Finished match statuses
  if (['finished', 'completed', 'cancelled', 'aborted'].includes(lowerStatus)) {
    return 'finished';
  }
  
  return null;
};

// New function to fetch specific match details with roster data
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

    console.log('📊 Raw match data from database:', match);
    
    // Extract roster data from raw_data
    const rawData = match.raw_data as any;
    const teams = match.teams as any;
    
    let team1Roster: any[] = [];
    let team2Roster: any[] = [];
    
    // Extract rosters from raw_data if available
    if (rawData && rawData.teams) {
      if (rawData.teams.faction1 && rawData.teams.faction1.roster) {
        team1Roster = rawData.teams.faction1.roster.map((player: any) => ({
          player_id: player.player_id,
          nickname: player.nickname,
          avatar: player.avatar,
          skill_level: player.game_skill_level,
          membership: player.membership,
          elo: player.faceit_elo,
          games: player.games
        }));
      }
      
      if (rawData.teams.faction2 && rawData.teams.faction2.roster) {
        team2Roster = rawData.teams.faction2.roster.map((player: any) => ({
          player_id: player.player_id,
          nickname: player.nickname,
          avatar: player.avatar,
          skill_level: player.game_skill_level,
          membership: player.membership,
          elo: player.faceit_elo,
          games: player.games
        }));
      }
    }
    
    console.log(`🎮 Extracted rosters: Team 1 (${team1Roster.length} players), Team 2 (${team2Roster.length} players)`);
    
    // Transform to expected format
    const transformedMatch = {
      id: `faceit_${match.match_id}`,
      teams: [
        {
          name: teams.faction1?.name || teams.team1?.name || rawData?.teams?.faction1?.name || 'Team 1',
          logo: teams.faction1?.avatar || teams.team1?.logo || rawData?.teams?.faction1?.avatar || '/placeholder.svg',
          id: teams.faction1?.id || teams.team1?.id || `team1_${match.match_id}`,
          roster: team1Roster
        },
        {
          name: teams.faction2?.name || teams.team2?.name || rawData?.teams?.faction2?.name || 'Team 2',
          logo: teams.faction2?.avatar || teams.team2?.logo || rawData?.teams?.faction2?.avatar || '/placeholder.svg',
          id: teams.faction2?.id || teams.team2?.id || `team2_${match.match_id}`,
          roster: team2Roster
        }
      ],
      startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
      tournament: match.competition_name || 'FACEIT Match',
      tournament_name: match.competition_name,
      season_name: match.competition_type,
      class_name: match.organized_by,
      esportType: 'csgo',
      bestOf: rawData?.best_of || match.faceit_data?.best_of || 1,
      source: 'amateur' as const,
      faceitData: {
        region: match.region,
        competitionType: match.competition_type,
        organizedBy: match.organized_by,
        calculateElo: match.calculate_elo
      },
      faceitMatchDetails: {
        version: match.version,
        configuredAt: match.configured_at,
        finishedAt: match.finished_at,
        voting: match.voting
      }
    };
    
    console.log('✅ Transformed match details:', transformedMatch);
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
      .in('status', ['upcoming', 'ongoing', 'finished', 'ready', 'scheduled', 'configured', 'running', 'live'])
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

    return (matches || []).map(match => {
      const teams = match.teams as any;
      
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
        startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
        tournament: match.competition_name || 'FACEIT Match',
        esportType: match.game || 'cs2',
        bestOf: bestOf,
        source: 'amateur' as const,
        faceitData: {
          region: match.region,
          competitionType: match.competition_type,
          organizedBy: match.organized_by,
          calculateElo: match.calculate_elo
        }
      } satisfies MatchInfo;
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
      return { live: [], upcoming: [] };
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
        startTime: match.scheduled_at || match.started_at || new Date().toISOString(),
        tournament: match.competition_name || 'FACEIT Match',
        esportType: match.game || 'cs2',
        bestOf: bestOf,
        source: 'amateur' as const,
        faceitData: {
          region: match.region,
          competitionType: match.competition_type,
          organizedBy: match.organized_by,
          calculateElo: match.calculate_elo
        }
      } satisfies MatchInfo;
    });

    // Separate live and upcoming matches using correct status mapping
    const live = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      const statusCategory = matchRecord ? getFaceitStatusCategory(matchRecord.status) : null;
      return statusCategory === 'live';
    });

    const upcoming = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      const statusCategory = matchRecord ? getFaceitStatusCategory(matchRecord.status) : null;
      return statusCategory === 'upcoming';
    });

    console.log(`📊 FACEIT matches categorized: ${live.length} live, ${upcoming.length} upcoming`);
    
    // Log specific match details for debugging
    if (matches && matches.length > 0) {
      matches.forEach(match => {
        const teams = match.teams as any;
        const team1Name = teams.faction1?.name || teams.team1?.name || 'Team 1';
        const team2Name = teams.faction2?.name || teams.team2?.name || 'Team 2';
        console.log(`🎮 FACEIT Match: ${team1Name} vs ${team2Name} - Status: ${match.status} - Category: ${getFaceitStatusCategory(match.status)}`);
      });
    }
    
    return { live, upcoming };
  } catch (error) {
    console.error('Error in fetchSupabaseFaceitMatchesByDate:', error);
    return { live: [], upcoming: [] };
  }
};

export const triggerFaceitLiveSync = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-live');
    
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

export const triggerFaceitUpcomingSync = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-upcoming');
    
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
