import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { startOfDay, endOfDay } from 'date-fns';

// Helper function to map PandaScore statuses to display categories
const getPandaScoreStatusCategory = (status: string): 'live' | 'upcoming' | 'finished' | null => {
  const lowerStatus = status.toLowerCase();
  
  // Live match statuses
  if (['running', 'live', 'ongoing'].includes(lowerStatus)) {
    return 'live';
  }
  
  // Upcoming match statuses
  if (['not_started', 'upcoming', 'scheduled'].includes(lowerStatus)) {
    return 'upcoming';
  }
  
  // Finished match statuses
  if (['finished', 'completed', 'cancelled', 'postponed', 'forfeit'].includes(lowerStatus)) {
    return 'finished';
  }
  
  return null;
};

// Enhanced function to fetch roster data from tournament if missing
const fetchMissingRosterData = async (tournamentId: string, teamIds: string[]): Promise<any> => {
  console.log(`🔍 Attempting to fetch missing roster data for tournament ${tournamentId}, teams:`, teamIds);
  
  try {
    // This would call the PandaScore tournament rosters API
    // For now, we'll return empty data but the structure is ready
    return {
      team1Players: [],
      team2Players: []
    };
  } catch (error) {
    console.error('Error fetching missing roster data:', error);
    return {
      team1Players: [],
      team2Players: []
    };
  }
};

// Enhanced function to fetch specific PandaScore match details with roster fallback
export const fetchSupabasePandaScoreMatchDetails = async (matchId: string): Promise<any | null> => {
  try {
    console.log(`🔍 Fetching PandaScore match details from database for: ${matchId}`);
    
    // Remove 'pandascore_' prefix if present
    const cleanMatchId = matchId.startsWith('pandascore_') ? matchId.replace('pandascore_', '') : matchId;
    
    const { data: match, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .eq('match_id', cleanMatchId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching PandaScore match details:', error);
      return null;
    }

    if (!match) {
      console.log(`No PandaScore match found for ID: ${cleanMatchId}`);
      return null;
    }

    console.log('📊 Raw PandaScore match data from database:', JSON.stringify(match, null, 2));
    
    // Extract teams data
    const teamsData = match.teams as any;
    
    // Check if we need to fetch missing roster data
    const team1HasPlayers = teamsData?.team1?.players && teamsData.team1.players.length > 0;
    const team2HasPlayers = teamsData?.team2?.players && teamsData.team2.players.length > 0;
    
    let enhancedTeamsData = teamsData;
    
    if ((!team1HasPlayers || !team2HasPlayers) && match.tournament_id) {
      console.log(`⚠️ Missing player data detected, attempting roster fallback for tournament ${match.tournament_id}`);
      
      const teamIds = [
        teamsData?.team1?.id?.toString(),
        teamsData?.team2?.id?.toString()
      ].filter(Boolean);
      
      const rosterData = await fetchMissingRosterData(match.tournament_id, teamIds);
      
      // Merge any found roster data
      if (rosterData.team1Players.length > 0 && !team1HasPlayers) {
        enhancedTeamsData.team1.players = rosterData.team1Players;
        console.log(`✅ Enhanced team1 with ${rosterData.team1Players.length} players from roster fallback`);
      }
      
      if (rosterData.team2Players.length > 0 && !team2HasPlayers) {
        enhancedTeamsData.team2.players = rosterData.team2Players;
        console.log(`✅ Enhanced team2 with ${rosterData.team2Players.length} players from roster fallback`);
      }
    }
    
    // 🔧 CRITICAL FIX: Extract results from raw_data
    let results = null;
    
    // Check raw_data for results
    if (match.raw_data && typeof match.raw_data === 'object' && match.raw_data !== null) {
      const rawData = match.raw_data as Record<string, any>;
      if (rawData.results) {
        results = rawData.results;
        console.log('🏆 Found results in raw_data:', results);
      } else if (rawData.games && Array.isArray(rawData.games)) {
        // Check if match is finished by looking at games
        const finishedGames = rawData.games.filter((game: any) => game.finished);
        if (finishedGames.length > 0) {
          // Calculate overall winner based on game wins
          const team1Wins = finishedGames.filter((game: any) => game.winner?.id === enhancedTeamsData?.team1?.id).length;
          const team2Wins = finishedGames.filter((game: any) => game.winner?.id === enhancedTeamsData?.team2?.id).length;
          
          results = {
            winner: team1Wins > team2Wins ? 'team1' : 'team2',
            score: {
              team1: team1Wins,
              team2: team2Wins
            }
          };
          console.log('🏆 Calculated results from games:', results);
        }
      }
    }

    // Guarantee a proper startTime
    function getStartTime(m: any) {
      if (m?.start_time && !isNaN(new Date(m.start_time).getTime())) {
        return m.start_time;
      }
      if (m?.scheduled_at && !isNaN(new Date(m.scheduled_at).getTime())) {
        return m.scheduled_at;
      }
      return new Date().toISOString();
    }

    // Transform to expected format with enhanced roster data
    const transformedMatch = {
      id: `pandascore_${match.match_id}`,
      teams: [
        {
          name: enhancedTeamsData?.team1?.name || 'Team 1',
          logo: enhancedTeamsData?.team1?.logo || '/placeholder.svg',
          id: enhancedTeamsData?.team1?.id || `team1_${match.match_id}`,
          roster: enhancedTeamsData?.team1?.players || []
        },
        {
          name: enhancedTeamsData?.team2?.name || 'Team 2',
          logo: enhancedTeamsData?.team2?.logo || '/placeholder.svg',
          id: enhancedTeamsData?.team2?.id || `team2_${match.match_id}`,
          roster: enhancedTeamsData?.team2?.players || []
        }
      ],
      startTime: getStartTime(match),
      tournament: match.tournament_name || match.league_name || match.serie_name || 'PandaScore Match',
      tournament_name: match.tournament_name,
      league_name: match.league_name,
      serie_name: match.serie_name,
      esportType: match.esport_type || 'csgo',
      bestOf: match.number_of_games || 3,
      source: 'professional' as const,
      status: match.status,
      finished_at: match.end_time,
      finishedTime: match.end_time,
      results: results,
      // Enhanced debugging info
      _debug: {
        hasTeam1Players: enhancedTeamsData?.team1?.players?.length || 0,
        hasTeam2Players: enhancedTeamsData?.team2?.players?.length || 0,
        usedRosterFallback: (!team1HasPlayers || !team2HasPlayers) && match.tournament_id
      }
    };
    
    console.log('✅ PandaScore match loading completed with roster data:', {
      hasResults: !!results,
      results: results,
      status: match.status,
      finishedAt: match.end_time,
      team1Players: transformedMatch.teams[0].roster.length,
      team2Players: transformedMatch.teams[1].roster.length,
      usedRosterFallback: transformedMatch._debug.usedRosterFallback
    });
    
    return transformedMatch;
    
  } catch (error) {
    console.error('Error in fetchSupabasePandaScoreMatchDetails:', error);
    return null;
  }
};

export const fetchSupabasePandaScoreAllMatches = async (): Promise<MatchInfo[]> => {
  try {
    console.log('🔄 Fetching all PandaScore matches from Supabase...');
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .in('status', ['not_started', 'running', 'finished', 'completed', 'cancelled', 'postponed', 'forfeit', 'upcoming', 'scheduled', 'live', 'ongoing'])
      .order('start_time', { ascending: true })
      .limit(500);

    if (error) {
      console.error('Error fetching PandaScore matches:', error);
      return [];
    }

    console.log(`📊 Found ${matches?.length || 0} PandaScore matches in database`);
    
    return (matches || []).map(match => {
      const teamsData = match.teams as any;
      const rawData = match.raw_data as any;
      
      // Extract results from raw_data if available
      let results = null;
      if (rawData && rawData.results) {
        results = rawData.results;
        console.log(`🏆 Match ${match.match_id} has results:`, results);
      }

      const transformedMatch = {
        id: `pandascore_${match.match_id}`,
        teams: [
          {
            name: teamsData?.team1?.name || 'Team 1',
            logo: teamsData?.team1?.logo || '/placeholder.svg',
            id: teamsData?.team1?.id || `team1_${match.match_id}`
          },
          {
            name: teamsData?.team2?.name || 'Team 2',
            logo: teamsData?.team2?.logo || '/placeholder.svg',
            id: teamsData?.team2?.id || `team2_${match.match_id}`
          }
        ] as [any, any],
        startTime: match.start_time || new Date().toISOString(),
        tournament: match.tournament_name || match.league_name || match.serie_name || 'PandaScore Match',
        esportType: match.esport_type || 'csgo',
        bestOf: match.number_of_games || 3,
        source: 'professional' as const,
        status: match.status
      } satisfies MatchInfo;

      return transformedMatch;
    });
  } catch (error) {
    console.error('Error in fetchSupabasePandaScoreAllMatches:', error);
    return [];
  }
};

export const fetchSupabasePandaScoreMatchesByDate = async (date: Date) => {
  try {
    console.log('🗓️ Fetching PandaScore matches for date:', date.toDateString());
    
    const startDate = startOfDay(date);
    const endDate = endOfDay(date);
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching PandaScore matches by date:', error);
      return { live: [], upcoming: [], finished: [] };
    }

    console.log(`📊 Found ${matches?.length || 0} PandaScore matches for ${date.toDateString()}`);

    const transformedMatches = (matches || []).map(match => {
      const teamsData = match.teams as any;
      const rawData = match.raw_data as any;
      
      // Extract results from raw_data if available
      let results = null;
      if (rawData && rawData.results) {
        results = rawData.results;
      }

      return {
        id: `pandascore_${match.match_id}`,
        teams: [
          {
            name: teamsData?.team1?.name || 'Team 1',
            logo: teamsData?.team1?.logo || '/placeholder.svg',
            id: teamsData?.team1?.id || `team1_${match.match_id}`
          },
          {
            name: teamsData?.team2?.name || 'Team 2',
            logo: teamsData?.team2?.logo || '/placeholder.svg',
            id: teamsData?.team2?.id || `team2_${match.match_id}`
          }
        ] as [any, any],
        startTime: match.start_time || new Date().toISOString(),
        tournament: match.tournament_name || match.league_name || match.serie_name || 'PandaScore Match',
        esportType: match.esport_type || 'csgo',
        bestOf: match.number_of_games || 3,
        source: 'professional' as const,
        status: match.status
      } satisfies MatchInfo;
    });

    // Separate live, upcoming, and finished matches
    const live = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('pandascore_', ''));
      const statusCategory = matchRecord ? getPandaScoreStatusCategory(matchRecord.status) : null;
      return statusCategory === 'live';
    });

    const upcoming = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('pandascore_', ''));
      const statusCategory = matchRecord ? getPandaScoreStatusCategory(matchRecord.status) : null;
      return statusCategory === 'upcoming';
    });

    const finished = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('pandascore_', ''));
      const statusCategory = matchRecord ? getPandaScoreStatusCategory(matchRecord.status) : null;
      return statusCategory === 'finished';
    });

    console.log(`📊 PandaScore matches categorized: ${live.length} live, ${upcoming.length} upcoming, ${finished.length} finished`);
    
    return { live, upcoming, finished };
  } catch (error) {
    console.error('Error in fetchSupabasePandaScoreMatchesByDate:', error);
    return { live: [], upcoming: [], finished: [] };
  }
};

// New function to fetch recent finished matches for homepage
export const fetchSupabasePandaScoreFinishedMatches = async (limit: number = 10): Promise<MatchInfo[]> => {
  try {
    console.log('🏁 Fetching recent finished PandaScore matches...');
    
    const { data: matches, error } = await supabase
      .from('pandascore_matches')
      .select('*')
      .in('status', ['finished', 'completed', 'cancelled', 'postponed', 'forfeit'])
      .order('end_time', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching finished PandaScore matches:', error);
      return [];
    }

    console.log(`🏁 Found ${matches?.length || 0} finished PandaScore matches`);

    return (matches || []).map(match => {
      const teamsData = match.teams as any;
      const rawData = match.raw_data as any;
      
      // Extract results from raw_data if available
      let results = null;
      if (rawData && rawData.results) {
        results = rawData.results;
      }

      return {
        id: `pandascore_${match.match_id}`,
        teams: [
          {
            name: teamsData?.team1?.name || 'Team 1',
            logo: teamsData?.team1?.logo || '/placeholder.svg',
            id: teamsData?.team1?.id || `team1_${match.match_id}`
          },
          {
            name: teamsData?.team2?.name || 'Team 2',
            logo: teamsData?.team2?.logo || '/placeholder.svg',
            id: teamsData?.team2?.id || `team2_${match.match_id}`
          }
        ] as [any, any],
        startTime: match.start_time || new Date().toISOString(),
        tournament: match.tournament_name || match.league_name || match.serie_name || 'PandaScore Match',
        esportType: match.esport_type || 'csgo',
        bestOf: match.number_of_games || 3,
        source: 'professional' as const,
        status: match.status
      } satisfies MatchInfo;
    });
  } catch (error) {
    console.error('Error in fetchSupabasePandaScoreFinishedMatches:', error);
    return [];
  }
};
