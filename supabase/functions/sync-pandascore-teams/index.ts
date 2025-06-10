
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORTED_GAMES = ['cs2', 'lol', 'dota2', 'valorant', 'ow'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const logId = crypto.randomUUID();
  const startTime = Date.now();

  // Log sync start
  await supabase.from('pandascore_sync_logs').insert({
    id: logId,
    sync_type: 'teams',
    status: 'running',
    metadata: { games: SUPPORTED_GAMES }
  });

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    console.log('🔄 Starting PandaScore teams sync...');
    
    const apiKey = Deno.env.get('PANDA_SCORE_API_KEY');
    if (!apiKey) {
      throw new Error('PANDA_SCORE_API_KEY not configured');
    }

    for (const game of SUPPORTED_GAMES) {
      try {
        console.log(`📥 Syncing ${game} teams...`);
        
        // Get teams from recent matches first to sync relevant teams
        const { data: recentMatches } = await supabase
          .from('pandascore_matches')
          .select('teams')
          .eq('esport_type', game)
          .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
          .limit(100);

        const teamIds = new Set();
        recentMatches?.forEach(match => {
          const teams = match.teams as any;
          if (teams?.team1?.id) teamIds.add(teams.team1.id);
          if (teams?.team2?.id) teamIds.add(teams.team2.id);
        });

        console.log(`🎯 Found ${teamIds.size} team IDs to sync for ${game}`);

        // Fetch teams in batches
        for (const teamId of Array.from(teamIds)) {
          try {
            const response = await fetch(
              `https://api.pandascore.co/${game}/teams/${teamId}`,
              {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Accept': 'application/json'
                }
              }
            );

            if (!response.ok) {
              console.log(`Team ${teamId} not found or error:`, response.status);
              continue;
            }

            const team = await response.json();

            // Transform team data
            const transformedTeam = {
              team_id: team.id.toString(),
              esport_type: game,
              name: team.name,
              acronym: team.acronym,
              logo_url: team.image_url,
              slug: team.slug,
              players_data: team.players || [],
              raw_data: team,
              last_synced_at: new Date().toISOString()
            };

            // Upsert team data
            const { error: upsertError } = await supabase
              .from('pandascore_teams')
              .upsert(transformedTeam, {
                onConflict: 'team_id,esport_type',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`Error upserting team ${teamId}:`, upsertError);
              continue;
            }

            totalProcessed++;

            // Check if this was an insert or update
            const { data: existing } = await supabase
              .from('pandascore_teams')
              .select('created_at, updated_at')
              .eq('team_id', team.id.toString())
              .eq('esport_type', game)
              .single();

            if (existing && existing.created_at === existing.updated_at) {
              totalAdded++;
            } else {
              totalUpdated++;
            }

            // Rate limiting - be more conservative with team requests
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch (error) {
            console.error(`Error processing team ${teamId}:`, error);
          }
        }

      } catch (error) {
        console.error(`Error syncing ${game} teams:`, error);
      }
    }

    const duration = Date.now() - startTime;
    
    // Update sync log with success
    await supabase.from('pandascore_sync_logs').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      records_processed: totalProcessed,
      records_added: totalAdded,
      records_updated: totalUpdated
    }).eq('id', logId);

    console.log(`✅ PandaScore teams sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Update sync log with error
    await supabase.from('pandascore_sync_logs').update({
      status: 'failed',
      completed_at: new Date().toISOString(),
      duration_ms: duration,
      error_message: error.message,
      error_details: { error: error.toString() },
      records_processed: totalProcessed,
      records_added: totalAdded,
      records_updated: totalUpdated
    }).eq('id', logId);

    console.error('❌ PandaScore teams sync failed:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: totalProcessed
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
