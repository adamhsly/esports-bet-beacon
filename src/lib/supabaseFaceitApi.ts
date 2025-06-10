
import { supabase } from "@/integrations/supabase/client";
import { MatchInfo } from "@/components/MatchCard";

// Transform database match to MatchInfo format
function transformDatabaseMatch(dbMatch: any): MatchInfo {
  // Choose the appropriate time field based on match status and availability
  let startTime: string;
  
  if (dbMatch.status === 'upcoming' && dbMatch.scheduled_at) {
    // For upcoming matches, use scheduled_at if available
    startTime = dbMatch.scheduled_at;
  } else if (dbMatch.started_at) {
    // For live/finished matches, use started_at if available
    startTime = dbMatch.started_at;
  } else if (dbMatch.scheduled_at) {
    // Fallback to scheduled_at if started_at is not available
    startTime = dbMatch.scheduled_at;
  } else {
    // Final fallback to current time (should rarely happen now)
    startTime = new Date().toISOString();
  }

  return {
    id: `faceit_${dbMatch.match_id}`,
    teams: [
      {
        name: dbMatch.teams.faction1.name,
        logo: dbMatch.teams.faction1.avatar || '/placeholder.svg',
        id: `faceit_team_${dbMatch.match_id}_1`
      },
      {
        name: dbMatch.teams.faction2.name,
        logo: dbMatch.teams.faction2.avatar || '/placeholder.svg',
        id: `faceit_team_${dbMatch.match_id}_2`
      }
    ],
    startTime,
    tournament: dbMatch.competition_name || 'FACEIT Match',
    tournament_name: dbMatch.competition_name,
    season_name: dbMatch.competition_type,
    class_name: dbMatch.organized_by,
    esportType: 'csgo',
    bestOf: 1,
    source: 'amateur' as const,
    faceitData: {
      region: dbMatch.region,
      competitionType: dbMatch.competition_type,
      organizedBy: dbMatch.organized_by,
      calculateElo: dbMatch.calculate_elo
    }
  };
}

export async function fetchSupabaseFaceitLiveMatches(): Promise<MatchInfo[]> {
  console.log('🔴 Fetching FACEIT live matches from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .eq('status', 'ongoing')
      .eq('game', 'cs2')
      .order('started_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching live matches from Supabase:', error);
      return [];
    }

    console.log(`📊 Raw FACEIT live matches from DB:`, data?.length || 0);
    
    if (!data || data.length === 0) {
      console.log('📝 No live matches found in database. This could mean:');
      console.log('   - No matches are currently live');
      console.log('   - The sync functions haven\'t run yet');
      console.log('   - The FACEIT API sync is failing');
      return [];
    }

    const matches = data.map(transformDatabaseMatch);
    console.log(`✅ Retrieved ${matches.length} live matches from Supabase`);
    return matches;
  } catch (error) {
    console.error('❌ Error in fetchSupabaseFaceitLiveMatches:', error);
    return [];
  }
}

export async function fetchSupabaseFaceitUpcomingMatches(): Promise<MatchInfo[]> {
  console.log('📅 Fetching FACEIT upcoming matches from Supabase...');
  
  try {
    const { data, error } = await supabase
      .from('faceit_matches')
      .select('*')
      .eq('status', 'upcoming')
      .eq('game', 'cs2')
      .order('started_at', { ascending: true })
      .limit(20);

    if (error) {
      console.error('❌ Error fetching upcoming matches from Supabase:', error);
      return [];
    }

    console.log(`📊 Raw FACEIT upcoming matches from DB:`, data?.length || 0);
    
    if (!data || data.length === 0) {
      console.log('📝 No upcoming matches found in database. This could mean:');
      console.log('   - No matches are scheduled');
      console.log('   - The sync functions haven\'t run yet');
      console.log('   - The FACEIT API sync is failing');
      return [];
    }

    const matches = data.map(transformDatabaseMatch);
    console.log(`✅ Retrieved ${matches.length} upcoming matches from Supabase`);
    return matches;
  } catch (error) {
    console.error('❌ Error in fetchSupabaseFaceitUpcomingMatches:', error);
    return [];
  }
}

export async function fetchSupabaseFaceitMatchDetails(matchId: string): Promise<MatchInfo | null> {
  console.log(`🔍 Fetching FACEIT match details from Supabase: ${matchId}`);
  
  const cleanMatchId = matchId.startsWith('faceit_') ? matchId.replace('faceit_', '') : matchId;
  
  try {
    // First try database
    const { data: dbMatch, error: dbError } = await supabase
      .from('faceit_matches')
      .select('*')
      .eq('match_id', cleanMatchId)
      .single();

    if (dbMatch && !dbError) {
      console.log(`✅ Found match in Supabase database: ${cleanMatchId}`);
      return transformDatabaseMatch(dbMatch);
    }

    // If not in database, call edge function to fetch from API
    const { data, error } = await supabase.functions.invoke('get-faceit-match-details', {
      body: { matchId: cleanMatchId }
    });

    if (error) {
      console.error('❌ Error calling match details function:', error);
      return null;
    }

    if (data.success && data.match) {
      console.log(`✅ Retrieved match details via edge function: ${cleanMatchId}`);
      return transformDatabaseMatch(data.match);
    }

    return null;
  } catch (error) {
    console.error(`❌ Error fetching match details for ${cleanMatchId}:`, error);
    return null;
  }
}

// Manual sync trigger functions with improved error handling
export async function triggerFaceitLiveSync(): Promise<boolean> {
  console.log('🔴 Triggering FACEIT live sync...');
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-live');
    
    if (error) {
      console.error('❌ Error triggering live sync:', error);
      return false;
    }

    console.log('✅ Live sync triggered successfully:', data);
    return data?.success || false;
  } catch (error) {
    console.error('❌ Error in triggerFaceitLiveSync:', error);
    return false;
  }
}

export async function triggerFaceitUpcomingSync(): Promise<boolean> {
  console.log('📅 Triggering FACEIT upcoming sync...');
  try {
    const { data, error } = await supabase.functions.invoke('sync-faceit-upcoming');
    
    if (error) {
      console.error('❌ Error triggering upcoming sync:', error);
      return false;
    }

    console.log('✅ Upcoming sync triggered successfully:', data);
    return data?.success || false;
  } catch (error) {
    console.error('❌ Error in triggerFaceitUpcomingSync:', error);
    return false;
  }
}

// New function to set up automatic syncing
export async function setupFaceitCronJobs(): Promise<boolean> {
  console.log('🕒 Setting up FACEIT cron jobs...');
  try {
    const { data, error } = await supabase.functions.invoke('setup-faceit-cron');
    
    if (error) {
      console.error('❌ Error setting up cron jobs:', error);
      return false;
    }

    console.log('✅ Cron jobs set up successfully:', data);
    return data?.success || false;
  } catch (error) {
    console.error('❌ Error in setupFaceitCronJobs:', error);
    return false;
  }
}
