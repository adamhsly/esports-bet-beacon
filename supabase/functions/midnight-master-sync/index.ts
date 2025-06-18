
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    console.log('🌙 Starting midnight master sync of all endpoints...');
    
    const projectRef = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0];
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!projectRef || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    const syncResults = [];

    // Define all sync functions to run
    const syncFunctions = [
      'sync-faceit-upcoming',
      'sync-faceit-live',
      'sync-pandascore-matches',
      'sync-pandascore-tournaments',
      'sync-sportdevs-upcoming-matches',
      'sync-sportdevs-live',
      'sync-sportdevs-teams',
      'sync-sportdevs-tournaments'
    ];

    console.log(`📋 Running ${syncFunctions.length} sync functions...`);

    // Run all sync functions sequentially to avoid rate limits
    for (const functionName of syncFunctions) {
      try {
        console.log(`🔄 Syncing ${functionName}...`);
        
        const { data, error } = await supabase.functions.invoke(functionName);
        
        if (error) {
          console.error(`❌ Error in ${functionName}:`, error);
          syncResults.push({
            function: functionName,
            success: false,
            error: error.message
          });
        } else {
          console.log(`✅ ${functionName} completed successfully`);
          syncResults.push({
            function: functionName,
            success: true,
            data: data
          });
        }

        // Wait 2 seconds between sync functions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Exception in ${functionName}:`, error);
        syncResults.push({
          function: functionName,
          success: false,
          error: error.message
        });
      }
    }

    // After all endpoint syncs, sync player data for all active players
    console.log('🎮 Starting comprehensive player data sync...');
    
    try {
      // Get all unique player IDs from recent Faceit matches (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentMatches, error: matchError } = await supabase
        .from('faceit_matches')
        .select('teams')
        .gte('scheduled_at', sevenDaysAgo.toISOString());

      if (matchError) {
        console.error('❌ Error fetching recent matches for player sync:', matchError);
      } else {
        // Extract all unique player IDs from match rosters
        const playerIds = new Set<string>();
        
        (recentMatches || []).forEach(match => {
          const teams = match.teams as any;
          
          // Extract player IDs from both teams
          if (teams?.faction1?.roster) {
            teams.faction1.roster.forEach((player: any) => {
              if (player.player_id) playerIds.add(player.player_id);
            });
          }
          if (teams?.faction2?.roster) {
            teams.faction2.roster.forEach((player: any) => {
              if (player.player_id) playerIds.add(player.player_id);
            });
          }
        });

        const uniquePlayerIds = Array.from(playerIds);
        console.log(`🎯 Found ${uniquePlayerIds.length} unique players to sync`);

        if (uniquePlayerIds.length > 0) {
          // Sync player stats in batches to avoid rate limiting
          const batchSize = 50;
          let playerSyncResults = [];
          
          for (let i = 0; i < uniquePlayerIds.length; i += batchSize) {
            const batch = uniquePlayerIds.slice(i, i + batchSize);
            console.log(`🔄 Syncing player batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniquePlayerIds.length/batchSize)} (${batch.length} players)...`);
            
            const { data: playerSyncData, error: playerSyncError } = await supabase.functions.invoke('sync-faceit-player-stats', {
              body: { player_ids: batch }
            });
            
            if (playerSyncError) {
              console.error(`❌ Error in player stats sync batch ${Math.floor(i/batchSize) + 1}:`, playerSyncError);
              playerSyncResults.push({
                batch: Math.floor(i/batchSize) + 1,
                success: false,
                error: playerSyncError.message
              });
            } else {
              console.log(`✅ Player stats sync batch ${Math.floor(i/batchSize) + 1} completed successfully`);
              playerSyncResults.push({
                batch: Math.floor(i/batchSize) + 1,
                success: true,
                data: playerSyncData
              });
            }
            
            // Wait between batches to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          syncResults.push({
            function: 'sync-faceit-player-stats',
            success: true,
            data: {
              total_players: uniquePlayerIds.length,
              batches_processed: playerSyncResults.length,
              batch_results: playerSyncResults
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Error in player data sync:', error);
      syncResults.push({
        function: 'sync-faceit-player-stats',
        success: false,
        error: error.message
      });
    }

    const successCount = syncResults.filter(r => r.success).length;
    const errorCount = syncResults.filter(r => !r.success).length;

    console.log(`🎯 Midnight sync completed: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Midnight master sync completed',
        summary: {
          total_functions: syncFunctions.length + 1, // +1 for player stats sync
          successful: successCount,
          failed: errorCount
        },
        details: syncResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in midnight master sync:', error);
    
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
