
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
    sync_type: 'tournaments',
    status: 'running',
    metadata: { games: SUPPORTED_GAMES }
  });

  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  try {
    console.log('🔄 Starting PandaScore tournaments sync...');
    
    const apiKey = Deno.env.get('PANDA_SCORE_API_KEY');
    if (!apiKey) {
      throw new Error('PANDA_SCORE_API_KEY not configured');
    }

    for (const game of SUPPORTED_GAMES) {
      try {
        console.log(`📥 Syncing ${game} tournaments (running + upcoming)...`);

        // Fetch BOTH running and upcoming tournaments
        const endpoints = ['running', 'upcoming'] as const;
        const allTournaments: any[] = [];

        for (const ep of endpoints) {
          const response = await fetch(
            `https://api.pandascore.co/${game}/tournaments/${ep}?per_page=50`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              }
            }
          );

          if (!response.ok) {
            console.error(`PandaScore API error for ${game}/${ep}:`, response.status, response.statusText);
            continue;
          }

          const batch = await response.json();
          console.log(`📊 Retrieved ${batch.length} ${game} ${ep} tournaments`);
          allTournaments.push(...batch);
        }

        // Deduplicate by tournament id
        const seen = new Set<string>();
        const tournaments = allTournaments.filter((t: any) => {
          const id = String(t.id);
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });

        for (const tournament of tournaments) {
          try {
            // Transform tournament data
            const transformedTournament = {
              tournament_id: tournament.id.toString(),
              esport_type: game,
              name: tournament.name,
              slug: tournament.slug,
              league_id: tournament.league?.id?.toString(),
              league_name: tournament.league?.name,
              serie_id: tournament.serie?.id?.toString(),
              serie_name: tournament.serie?.name,
              start_date: tournament.begin_at,
              end_date: tournament.end_at,
              image_url: tournament.league?.image_url,
              status: tournament.tier,
              raw_data: tournament,
              last_synced_at: new Date().toISOString()
            };

            // Upsert tournament data
            const { error: upsertError } = await supabase
              .from('pandascore_tournaments')
              .upsert(transformedTournament, {
                onConflict: 'tournament_id,esport_type',
                ignoreDuplicates: false
              });

            if (upsertError) {
              console.error(`Error upserting tournament ${tournament.id}:`, upsertError);
              continue;
            }

            totalProcessed++;

            // Check if this was an insert or update
            const { data: existing } = await supabase
              .from('pandascore_tournaments')
              .select('created_at, updated_at')
              .eq('tournament_id', tournament.id.toString())
              .eq('esport_type', game)
              .single();

            if (existing && existing.created_at === existing.updated_at) {
              totalAdded++;
            } else {
              totalUpdated++;
            }

          } catch (error) {
            console.error(`Error processing tournament ${tournament.id}:`, error);
          }
        }

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error syncing ${game} tournaments:`, error);
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

    console.log(`✅ PandaScore tournaments sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated`);

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

    console.error('❌ PandaScore tournaments sync failed:', error);
    
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
