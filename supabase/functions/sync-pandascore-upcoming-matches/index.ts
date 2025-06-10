
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
    sync_type: 'upcoming_matches',
    status: 'running',
    metadata: { games: SUPPORTED_GAMES }
  });

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    console.log('🔄 Starting PandaScore upcoming matches sync...');
    
    const apiKey = Deno.env.get('PANDA_SCORE_API_KEY');
    if (!apiKey) {
      throw new Error('PANDA_SCORE_API_KEY not configured');
    }

    for (const game of SUPPORTED_GAMES) {
      try {
        console.log(`📥 Syncing ${game} upcoming matches...`);
        
        // Fetch upcoming matches from PandaScore API
        const response = await fetch(
          `https://api.pandascore.co/${game}/matches/upcoming?per_page=50`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          console.error(`PandaScore API error for ${game}:`, response.status, response.statusText);
          continue;
        }

        const matches = await response.json();
        console.log(`📊 Retrieved ${matches.length} ${game} matches from PandaScore`);

        for (const match of matches) {
          try {
            // Transform PandaScore match data
            const transformedMatch = {
              match_id: match.id.toString(),
              esport_type: game,
              teams: {
                team1: {
                  id: match.opponents?.[0]?.opponent?.id,
                  name: match.opponents?.[0]?.opponent?.name || 'TBD',
                  logo: match.opponents?.[0]?.opponent?.image_url,
                  acronym: match.opponents?.[0]?.opponent?.acronym
                },
                team2: {
                  id: match.opponents?.[1]?.opponent?.id,
                  name: match.opponents?.[1]?.opponent?.name || 'TBD',
                  logo: match.opponents?.[1]?.opponent?.image_url,
                  acronym: match.opponents?.[1]?.opponent?.acronym
                }
              },
              start_time: match.begin_at || match.scheduled_at,
              end_time: match.end_at,
              tournament_id: match.tournament?.id?.toString(),
              tournament_name: match.tournament?.name,
              league_id: match.league?.id?.toString(),
              league_name: match.league?.name,
              serie_id: match.serie?.id?.toString(),
              serie_name: match.serie?.name,
              status: match.status || 'scheduled',
              match_type: match.match_type,
              number_of_games: match.number_of_games,
              raw_data: match,
              last_synced_at: new Date().toISOString()
            };

            // Upsert match data
            const { error: upsertError } = await supabase
              .from('pandascore_matches')
              .upsert(transformedMatch, {
                onConflict: 'match_id',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`Error upserting match ${match.id}:`, upsertError);
              continue;
            }

            totalProcessed++;
            
            // Check if this was an insert or update
            const { data: existing } = await supabase
              .from('pandascore_matches')
              .select('created_at, updated_at')
              .eq('match_id', match.id.toString())
              .single();

            if (existing && existing.created_at === existing.updated_at) {
              totalAdded++;
            } else {
              totalUpdated++;
            }

          } catch (error) {
            console.error(`Error processing match ${match.id}:`, error);
          }
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error syncing ${game} matches:`, error);
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

    console.log(`✅ PandaScore upcoming matches sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated`);

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

    console.error('❌ PandaScore upcoming matches sync failed:', error);
    
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
