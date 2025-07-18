
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FaceitChampionship {
  championship_id: string;
  name: string;
  game: string;
  status: string;
  type: string;
}

interface FaceitMatch {
  match_id: string;
  game: string;
  region: string;
  competition_name: string;
  competition_type: string;
  organized_by: string;
  status: string;
  started_at: string | number;
  scheduled_at?: string | number;
  finished_at?: string | number;
  configured_at: string | number;
  calculate_elo: boolean;
  version: number;
  teams: {
    faction1: {
      name: string;
      avatar?: string;
      roster: Array<{
        player_id: string;
        nickname: string;
        avatar?: string;
      }>;
    };
    faction2: {
      name: string;
      avatar?: string;
      roster: Array<{
        player_id: string;
        nickname: string;
        avatar?: string;
      }>;
    };
  };
  voting?: {
    map?: {
      pick: string[];
    };
  };
}

interface FaceitChampionshipsResponse {
  items: FaceitChampionship[];
  start: number;
  end: number;
}

interface FaceitMatchesResponse {
  items: FaceitMatch[];
  start: number;
  end: number;
}

// Helper function to convert Faceit timestamp (Unix seconds) to ISO string
function convertFaceitTimestamp(timestamp: string | number | undefined): string | null {
  if (!timestamp) return null;
  
  // If it's already a string that looks like an ISO date, return it
  if (typeof timestamp === 'string' && timestamp.includes('T')) {
    return timestamp;
  }
  
  // Convert to number if it's a string
  const unixSeconds = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  
  // Check if it's a valid Unix timestamp (should be a reasonable number)
  if (isNaN(unixSeconds) || unixSeconds <= 0) {
    return null;
  }
  
  // Convert from seconds to milliseconds and create ISO string
  return new Date(unixSeconds * 1000).toISOString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const startTime = Date.now();
  let processed = 0;
  let added = 0;
  let updated = 0;
  let championshipsProcessed = 0;
  const playerIds = new Set<string>();
  
  // Parse request body for games parameter
  let games = ['cs2']; // Default to cs2
  try {
    const body = await req.json();
    if (body.games && Array.isArray(body.games)) {
      games = body.games;
    }
  } catch (error) {
    // If no body or invalid JSON, use default
    console.log('Using default games list:', games);
  }

  console.log(`🎮 Games to sync: ${games.join(', ')}`);

  // Log sync start
  const { data: logEntry } = await supabase
    .from('faceit_sync_logs')
    .insert({
      sync_type: 'upcoming',
      status: 'running'
    })
    .select()
    .single();

  try {
    const faceitApiKey = Deno.env.get('FACEIT_API_KEY');
    if (!faceitApiKey) {
      throw new Error('FACEIT_API_KEY not found in secrets');
    }

    console.log('🔄 Starting FACEIT upcoming matches sync (ongoing and upcoming championships)...');

    const allUpcomingMatches: FaceitMatch[] = [];
    const allMatchStatuses = new Set();
    // Map for championship_id -> championship details (including stream url)
    const championshipDetailsMap = new Map<string, any>();
    let totalChampionshipsFound = 0;

    // Process each game
    for (const game of games) {
      console.log(`🎮 Processing game: ${game.toUpperCase()}`);
      
      // Step 1: Fetch both ongoing and upcoming championships for this game
      const championshipTypes = ['ongoing', 'upcoming'];
      
      for (const type of championshipTypes) {
        console.log(`📋 Fetching ${type} ${game.toUpperCase()} championships...`);
        const championshipsUrl = new URL('https://open.faceit.com/data/v4/championships');
        championshipsUrl.searchParams.set('game', game);
        championshipsUrl.searchParams.set('type', type);

        const championshipsResponse = await fetch(championshipsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${faceitApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!championshipsResponse.ok) {
          const errorText = await championshipsResponse.text();
          console.error(`FACEIT Championships API error for ${game} (${type}):`, errorText);
          continue; // Skip this type and continue with others
        }

        const championshipsData: FaceitChampionshipsResponse = await championshipsResponse.json();
        console.log(`📋 Retrieved ${championshipsData.items.length} ${type} championships for ${game.toUpperCase()}`);
        totalChampionshipsFound += championshipsData.items.length;

        // Debug: Log championship details
        championshipsData.items.forEach(champ => {
          console.log(`🏆 Championship: ${champ.name} (${champ.championship_id}) - Status: ${champ.status}, Type: ${champ.type}, Game: ${champ.game}`);
        });

        // Step 2: For each championship, fetch ALL matches and championship details
        for (const championship of championshipsData.items) {
          championshipsProcessed++;
          // Fetch detailed championship info (for stream URL and raw data)
          let championshipDetails = null;
          try {
            const champResp = await fetch(
              `https://open.faceit.com/data/v4/championships/${championship.championship_id}`,
              {
                headers: {
                  'Authorization': `Bearer ${faceitApiKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            if (champResp.ok) {
              championshipDetails = await champResp.json();
            }
          } catch (err) {
            console.warn(`⚠️ Could not fetch championship details for ${championship.championship_id}`, err);
          }
          championshipDetailsMap.set(championship.championship_id, championshipDetails);

          console.log(`🏆 Processing championship: ${championship.name} (${championship.championship_id})`);

          try {
            const matchesResponse = await fetch(`https://open.faceit.com/data/v4/championships/${championship.championship_id}/matches`, {
              headers: {
                'Authorization': `Bearer ${faceitApiKey}`,
                'Content-Type': 'application/json'
              }
            });

            if (!matchesResponse.ok) {
              console.error(`❌ Error fetching matches for championship ${championship.championship_id}: ${matchesResponse.status}`);
              continue;
            }

            const matchesData: FaceitMatchesResponse = await matchesResponse.json();
            console.log(`🎮 Found ${matchesData.items.length} total matches in ${championship.name}`);

            // Debug: Log all match statuses we encounter
            matchesData.items.forEach(match => {
              allMatchStatuses.add(match.status);
              const teams = match.teams ? `${match.teams.faction1.name} vs ${match.teams.faction2.name}` : 'N/A';
              const scheduledTime = convertFaceitTimestamp(match.scheduled_at);
              console.log(`  • ${match.match_id} | ${match.status} | ${teams} | Scheduled: ${scheduledTime} | Game: ${match.game}`);
            });

            // Filter for upcoming/scheduled matches only
            const upcomingMatches = matchesData.items.filter(match => {
              const status = match.status.toLowerCase();
              const isUpcomingStatus = status === 'scheduled' || status === 'ready' || status === 'upcoming' || status === 'configured';
              const notStarted = !match.started_at || new Date(convertFaceitTimestamp(match.started_at) || 0) > new Date();
              const notFinished = !match.finished_at;
              
              return isUpcomingStatus && notStarted && notFinished;
            });

            console.log(`📅 Found ${upcomingMatches.length} upcoming matches in ${championship.name}`);
            allUpcomingMatches.push(...upcomingMatches);

            // Add delay between requests to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

          } catch (error) {
            console.error(`❌ Error processing championship ${championship.championship_id}:`, error);
            continue;
          }
        }

        // Add delay between championship types to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 150));
      }

      // Add delay between games to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`📊 All match statuses found: ${Array.from(allMatchStatuses).join(', ')}`);
    console.log(`🎯 Total upcoming matches found across all games: ${allUpcomingMatches.length}`);

    // Step 3: Process and store matches
    for (const match of allUpcomingMatches) {
      processed++;
      
      // Extract stream URL and raw championship data from championship details for this match
      let championship_stream_url: string | null = null;
      let championship_raw_data: any = null;
      if (match.competition_name) {
        // Find the championship using competition_name to get championship_id
        for (const [championshipId, details] of championshipDetailsMap.entries()) {
          if (details && details.name === match.competition_name) {
            championship_raw_data = details;
            if (details.stream_url || details.url) {
              championship_stream_url = details.stream_url || details.url;
            }
            break;
          }
        }
      }

      // Extract player IDs from match rosters
      if (match.teams?.faction1?.roster) {
        match.teams.faction1.roster.forEach(player => {
          if (player.player_id) playerIds.add(player.player_id);
        });
      }
      if (match.teams?.faction2?.roster) {
        match.teams.faction2.roster.forEach(player => {
          if (player.player_id) playerIds.add(player.player_id);
        });
      }
      
      const matchData = {
        match_id: match.match_id,
        game: match.game,
        region: match.region,
        competition_name: match.competition_name,
        competition_type: match.competition_type,
        organized_by: match.organized_by,
        status: 'upcoming',
        started_at: convertFaceitTimestamp(match.started_at),
        scheduled_at: convertFaceitTimestamp(match.scheduled_at),
        finished_at: convertFaceitTimestamp(match.finished_at),
        configured_at: convertFaceitTimestamp(match.configured_at),
        calculate_elo: match.calculate_elo,
        version: match.version,
        teams: match.teams,
        voting: match.voting || null,
        faceit_data: {
          region: match.region,
          competition_type: match.competition_type,
          organized_by: match.organized_by,
          calculate_elo: match.calculate_elo
        },
        raw_data: match,
        championship_stream_url: championship_stream_url,
        championship_raw_data: championship_raw_data
      };

      console.log(`💾 Storing match: ${match.match_id} - ${match.teams.faction1.name} vs ${match.teams.faction2.name} | Scheduled: ${matchData.scheduled_at} | Game: ${match.game}`);

      const { error, data: upsertResult } = await supabase
        .from('faceit_matches')
        .upsert(matchData, { 
          onConflict: 'match_id',
          ignoreDuplicates: false 
        })
        .select('id');

      if (error) {
        console.error(`❌ Error upserting upcoming match ${match.match_id}:`, error);
        continue;
      }

      if (upsertResult && upsertResult.length > 0) {
        const { data: existingMatch } = await supabase
          .from('faceit_matches')
          .select('created_at, updated_at')
          .eq('match_id', match.match_id)
          .single();

        if (existingMatch) {
          const createdAt = new Date(existingMatch.created_at).getTime();
          const updatedAt = new Date(existingMatch.updated_at).getTime();
          
          if (Math.abs(createdAt - updatedAt) < 1000) {
            added++;
          } else {
            updated++;
          }
        }
      }
    }

    // Step 4: Trigger enhanced player stats sync for collected player IDs
    if (playerIds.size > 0) {
      console.log(`🎮 Triggering enhanced player stats sync for ${playerIds.size} unique players...`);
      
      try {
        const playerStatsResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-faceit-player-stats`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            player_ids: Array.from(playerIds)
          })
        });

        if (playerStatsResponse.ok) {
          const statsResult = await playerStatsResponse.json();
          console.log(`✅ Player stats sync completed:`, statsResult);
        } else {
          console.warn(`⚠️ Player stats sync failed: ${playerStatsResponse.status}`);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to trigger player stats sync:`, error);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Upcoming sync completed: ${processed} processed, ${added} added, ${updated} updated in ${duration}ms`);
    console.log(`📊 Championships processed: ${championshipsProcessed} across ${games.length} games`);

    // Update log entry with success
    if (logEntry) {
      await supabase
        .from('faceit_sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          matches_processed: processed,
          matches_added: added,
          matches_updated: updated,
          metadata: { 
            championships_processed: championshipsProcessed,
            total_championships_found: totalChampionshipsFound,
            games_processed: games,
            upcoming_matches_found: allUpcomingMatches.length,
            match_statuses: Array.from(allMatchStatuses),
            unique_players_found: playerIds.size
          }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        added,
        updated,
        duration_ms: duration,
        championships_processed: championshipsProcessed,
        total_championships_found: totalChampionshipsFound,
        games_processed: games,
        upcoming_matches_found: allUpcomingMatches.length,
        unique_players_found: playerIds.size,
        debug_info: {
          match_statuses: Array.from(allMatchStatuses)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ FACEIT upcoming sync failed:', error);

    if (logEntry) {
      await supabase
        .from('faceit_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          matches_processed: processed,
          matches_added: added,
          matches_updated: updated,
          error_message: error.message,
          error_details: { stack: error.stack, championships_processed: championshipsProcessed, games_attempted: games }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed,
        added,
        updated,
        championships_processed: championshipsProcessed,
        games_attempted: games
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
