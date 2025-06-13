
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FaceitPlayerDetails {
  player_id: string;
  nickname: string;
  avatar?: string;
  country?: string;
  games: {
    cs2?: {
      region?: string;
      game_player_id?: string;
      skill_level?: number;
      faceit_elo?: number;
      game_player_name?: string;
      skill_level_label?: string;
      games_hub?: any;
      regions?: any;
      game_profile_id?: string;
    };
  };
  settings?: {
    language?: string;
  };
  friends_ids?: string[];
  new_steam_id?: string;
  steam_id_64?: string;
  steam_nickname?: string;
  memberships?: string[];
  faceit_url?: string;
  membership_type?: string;
  cover_image?: string;
  platforms?: any;
  infractions?: any;
}

interface FaceitPlayerStats {
  player_id: string;
  game_id: string;
  lifetime: {
    Matches?: string;
    Wins?: string;
    'Win Rate %'?: string;
    'Average K/D Ratio'?: string;
    'Average Headshots %'?: string;
    'Longest Win Streak'?: string;
    'Current Win Streak'?: string;
    'Recent Results'?: string[];
  };
  segments?: Array<{
    label: string;
    img_small: string;
    img_regular: string;
    stats: {
      Matches?: string;
      Wins?: string;
      'Win Rate %'?: string;
      'Average K/D Ratio'?: string;
      'Average Headshots %'?: string;
      'K/D Ratio'?: string;
      'K/R Ratio'?: string;
      'Headshots %'?: string;
      'Headshots'?: string;
      'Kills'?: string;
      'Deaths'?: string;
      'Assists'?: string;
      'MVPs'?: string;
      'Triple Kills'?: string;
      'Quadro Kills'?: string;
      'Penta Kills'?: string;
    };
  }>;
}

interface FaceitPlayerHistory {
  items: Array<{
    match_id: string;
    game_id: string;
    region: string;
    match_type: string;
    game_mode: string;
    max_players: number;
    teams_size: number;
    teams: {
      faction1: {
        team_id: string;
        nickname: string;
        avatar?: string;
        type: string;
        players: Array<{
          player_id: string;
          nickname: string;
          avatar?: string;
          skill_level: number;
          game_player_id?: string;
          game_player_name?: string;
          faceit_url?: string;
        }>;
      };
      faction2: {
        team_id: string;
        nickname: string;
        avatar?: string;
        type: string;
        players: Array<{
          player_id: string;
          nickname: string;
          avatar?: string;
          skill_level: number;
          game_player_id?: string;
          game_player_name?: string;
          faceit_url?: string;
        }>;
      };
    };
    playing_players: string[];
    competition_id?: string;
    competition_name?: string;
    competition_type?: string;
    organizer_id?: string;
    status: string;
    started_at: number;
    finished_at: number;
    results: {
      winner: string;
      score: {
        faction1: number;
        faction2: number;
      };
    };
    maps: Array<{
      name: string;
      class_name: string;
      game_map_id: string;
      guid: string;
      image_sm: string;
      image_lg: string;
    }>;
  }>;
  start: number;
  end: number;
}

// Helper function to calculate recent form based on match results
function calculateRecentForm(recentResults: string[]): string {
  if (!recentResults || recentResults.length === 0) return 'unknown';
  
  const wins = recentResults.filter(result => result === '1').length;
  const total = recentResults.length;
  const winRate = wins / total;
  
  if (winRate >= 0.8) return 'excellent';
  if (winRate >= 0.6) return 'good';
  if (winRate >= 0.4) return 'average';
  return 'poor';
}

// Helper function to parse numeric values from FACEIT API strings
function parseNumericValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

// Helper function to safely parse integer values
function parseIntValue(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value.replace(/[^0-9]/g, ''), 10);
  return isNaN(parsed) ? 0 : parsed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const faceitApiKey = Deno.env.get('FACEIT_API_KEY');
    if (!faceitApiKey) {
      throw new Error('FACEIT_API_KEY not found in secrets');
    }

    const { player_ids } = await req.json();
    if (!player_ids || !Array.isArray(player_ids)) {
      throw new Error('player_ids array is required');
    }

    console.log(`🎮 Starting enhanced player stats sync for ${player_ids.length} players...`);

    let processed = 0;
    let added = 0;
    let updated = 0;
    let errors = 0;

    for (const playerId of player_ids) {
      try {
        console.log(`📊 Processing player: ${playerId}`);

        // Check if player data is fresh (less than 24 hours old)
        const { data: existingPlayer } = await supabase
          .from('faceit_player_stats')
          .select('last_fetched_at')
          .eq('player_id', playerId)
          .maybeSingle();

        const shouldFetch = !existingPlayer || 
          new Date().getTime() - new Date(existingPlayer.last_fetched_at).getTime() > 24 * 60 * 60 * 1000;

        if (!shouldFetch) {
          console.log(`⏭️ Skipping ${playerId} - data is fresh`);
          continue;
        }

        // Fetch player details
        console.log(`🔍 Fetching player details for: ${playerId}`);
        const playerDetailsResponse = await fetch(`https://open.faceit.com/data/v4/players/${playerId}`, {
          headers: {
            'Authorization': `Bearer ${faceitApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!playerDetailsResponse.ok) {
          console.error(`❌ Failed to fetch player details for ${playerId}: ${playerDetailsResponse.status}`);
          errors++;
          continue;
        }

        const playerDetails: FaceitPlayerDetails = await playerDetailsResponse.json();

        // Fetch player CS2 statistics
        console.log(`📈 Fetching CS2 stats for: ${playerId}`);
        const playerStatsResponse = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`, {
          headers: {
            'Authorization': `Bearer ${faceitApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        let playerStats: FaceitPlayerStats | null = null;
        if (playerStatsResponse.ok) {
          playerStats = await playerStatsResponse.json();
        } else {
          console.warn(`⚠️ No CS2 stats available for player ${playerId}: ${playerStatsResponse.status}`);
        }

        // Fetch player match history (last 20 matches)
        console.log(`📚 Fetching match history for: ${playerId}`);
        const playerHistoryResponse = await fetch(`https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=20`, {
          headers: {
            'Authorization': `Bearer ${faceitApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        let playerHistory: FaceitPlayerHistory | null = null;
        if (playerHistoryResponse.ok) {
          playerHistory = await playerHistoryResponse.json();
        } else {
          console.warn(`⚠️ No match history available for player ${playerId}: ${playerHistoryResponse.status}`);
        }

        // Process and store the data
        const cs2Game = playerDetails.games?.cs2;
        const lifetime = playerStats?.lifetime;
        const segments = playerStats?.segments || [];

        // Build map statistics from segments
        const mapStats: Record<string, any> = {};
        segments.forEach(segment => {
          if (segment.label && segment.stats) {
            mapStats[segment.label] = {
              matches: parseIntValue(segment.stats.Matches),
              wins: parseIntValue(segment.stats.Wins),
              winRate: parseNumericValue(segment.stats['Win Rate %']),
              kdRatio: parseNumericValue(segment.stats['Average K/D Ratio'] || segment.stats['K/D Ratio']),
              headshotsPercent: parseNumericValue(segment.stats['Average Headshots %'] || segment.stats['Headshots %']),
              kills: parseIntValue(segment.stats.Kills),
              deaths: parseIntValue(segment.stats.Deaths),
              assists: parseIntValue(segment.stats.Assists),
              mvps: parseIntValue(segment.stats.MVPs)
            };
          }
        });

        // Extract recent results from history
        const recentResults = playerHistory?.items.map(match => {
          const playerTeam = match.teams.faction1.players.some(p => p.player_id === playerId) ? 'faction1' : 'faction2';
          const wonMatch = match.results.winner === playerTeam;
          return wonMatch ? '1' : '0';
        }) || lifetime?.['Recent Results'] || [];

        const playerData = {
          player_id: playerId,
          nickname: playerDetails.nickname,
          avatar: playerDetails.avatar,
          country: playerDetails.country,
          skill_level: cs2Game?.skill_level || 0,
          faceit_elo: cs2Game?.faceit_elo || 0,
          membership: playerDetails.membership_type || 'free',
          total_matches: parseIntValue(lifetime?.Matches),
          total_wins: parseIntValue(lifetime?.Wins),
          win_rate: parseNumericValue(lifetime?.['Win Rate %']),
          avg_kd_ratio: parseNumericValue(lifetime?.['Average K/D Ratio']),
          avg_headshots_percent: parseNumericValue(lifetime?.['Average Headshots %']),
          longest_win_streak: parseIntValue(lifetime?.['Longest Win Streak']),
          current_win_streak: parseIntValue(lifetime?.['Current Win Streak']),
          recent_results: recentResults,
          recent_form: calculateRecentForm(recentResults),
          map_stats: mapStats,
          last_fetched_at: new Date().toISOString()
        };

        console.log(`💾 Storing enhanced data for: ${playerDetails.nickname}`);

        // Upsert player data
        const { data: upsertResult, error } = await supabase
          .from('faceit_player_stats')
          .upsert(playerData, { 
            onConflict: 'player_id',
            ignoreDuplicates: false 
          })
          .select('id');

        if (error) {
          console.error(`❌ Error upserting player ${playerId}:`, error);
          errors++;
          continue;
        }

        if (upsertResult && upsertResult.length > 0) {
          const { data: existingCheck } = await supabase
            .from('faceit_player_stats')
            .select('created_at, updated_at')
            .eq('player_id', playerId)
            .single();

          if (existingCheck) {
            const createdAt = new Date(existingCheck.created_at).getTime();
            const updatedAt = new Date(existingCheck.updated_at).getTime();
            
            if (Math.abs(createdAt - updatedAt) < 1000) {
              added++;
            } else {
              updated++;
            }
          }
        }

        processed++;

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error processing player ${playerId}:`, error);
        errors++;
      }
    }

    console.log(`✅ Player stats sync completed: ${processed} processed, ${added} added, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        added,
        updated,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Player stats sync failed:', error);

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
