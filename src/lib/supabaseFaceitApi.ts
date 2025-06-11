
import { supabase } from '@/integrations/supabase/client';
import { MatchInfo } from '@/components/MatchCard';
import { startOfDay, endOfDay } from 'date-fns';

export const fetchSupabaseFaceitAllMatches = async (): Promise<MatchInfo[]> => {
  try {
    console.log('🔄 Fetching all FACEIT matches from Supabase...');
    
    const { data: matches, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .in('status', ['READY', 'ONGOING', 'FINISHED'])
      .order('scheduled_at', { ascending: true })
      .limit(500);

    if (error) {
      console.error('Error fetching FACEIT matches:', error);
      return [];
    }

    console.log(`📊 Found ${matches?.length || 0} FACEIT matches in database`);

    return (matches || []).map(match => {
      const teams = match.teams as any;
      
      // Extract best_of from raw_data or faceit_data, fallback to 3
      let bestOf = 3;
      if (match.raw_data?.best_of) {
        bestOf = match.raw_data.best_of;
      } else if (match.faceit_data?.best_of) {
        bestOf = match.faceit_data.best_of;
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

    const transformedMatches = (matches || []).map(match => {
      const teams = match.teams as any;
      
      // Extract best_of from raw_data or faceit_data, fallback to 3
      let bestOf = 3;
      if (match.raw_data?.best_of) {
        bestOf = match.raw_data.best_of;
      } else if (match.faceit_data?.best_of) {
        bestOf = match.faceit_data.best_of;
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

    // Separate live and upcoming matches based on status
    const live = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      return matchRecord?.status === 'ONGOING';
    });

    const upcoming = transformedMatches.filter(match => {
      const matchRecord = matches?.find(m => m.match_id === match.id.replace('faceit_', ''));
      return matchRecord?.status === 'READY';
    });

    console.log(`📊 Split into ${live.length} live and ${upcoming.length} upcoming FACEIT matches`);
    
    return { live, upcoming };
  } catch (error) {
    console.error('Error in fetchSupabaseFaceitMatchesByDate:', error);
    return { live: [], upcoming: [] };
  }
};
