
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supported esport types
const ESPORT_TYPES = ['csgo', 'dota2', 'lol', 'valorant', 'overwatch', 'rl'];

// Map our esport types to SportDevs API game identifiers
const mapEsportTypeToGameId = (esportType: string): string => {
  const mapping: Record<string, string> = {
    csgo: "csgo",
    dota2: "dota2", 
    lol: "lol",
    valorant: "valorant",
    overwatch: "overwatch",
    rl: "rl"
  };
  return mapping[esportType] || "csgo";
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  // Log sync start
  const { data: logEntry } = await supabase
    .from('sportdevs_sync_logs')
    .insert({
      sync_type: 'live_matches',
      status: 'running'
    })
    .select()
    .single();

  try {
    // Get API key from Supabase secrets
    const apiKey = Deno.env.get('SPORTDEVS_API_KEY');
    if (!apiKey) {
      throw new Error('SPORTDEVS_API_KEY not found in environment variables');
    }
    
    console.log('🔴 Starting SportDevs live matches sync with API key...');

    for (const esportType of ESPORT_TYPES) {
      try {
        console.log(`🎮 Syncing live matches for ${esportType}...`);
        
        const gameId = mapEsportTypeToGameId(esportType);
        const url = `https://api.sportdevs.com/v1/esports/${gameId}/matches/live`;
        console.log(`📡 Calling API: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        console.log(`📊 Response status for ${esportType}: ${response.status}`);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error(`❌ Unauthorized for ${esportType}: Check API key`);
          } else if (response.status === 404) {
            console.log(`ℹ️ No live matches endpoint for ${esportType} (404 - might be expected)`);
          } else {
            console.error(`❌ Error fetching ${esportType} live matches: ${response.status} ${response.statusText}`);
          }
          continue;
        }

        const matches = await response.json();
        console.log(`📊 Found ${matches.length} live matches for ${esportType}`);

        if (!Array.isArray(matches)) {
          console.error(`❌ Invalid response format for ${esportType}: expected array, got ${typeof matches}`);
          continue;
        }

        for (const match of matches) {
          totalProcessed++;
          
          // Transform match data
          const matchData = {
            match_id: match.id || `${esportType}_${Date.now()}_${Math.random()}`,
            teams: {
              team1: {
                id: match.opponents?.[0]?.id || match.team1?.id,
                name: match.opponents?.[0]?.name || match.team1?.name || 'TBD',
                logo: match.opponents?.[0]?.image_url || match.team1?.logo || '/placeholder.svg'
              },
              team2: {
                id: match.opponents?.[1]?.id || match.team2?.id,
                name: match.opponents?.[1]?.name || match.team2?.name || 'TBD', 
                logo: match.opponents?.[1]?.image_url || match.team2?.logo || '/placeholder.svg'
              }
            },
            start_time: match.start_time || match.scheduled_at || new Date().toISOString(),
            tournament_id: match.tournament?.id || match.league?.id,
            tournament_name: match.tournament?.name || match.league?.name || match.competition?.name || 'Unknown Tournament',
            status: 'live',
            esport_type: esportType,
            best_of: match.format?.best_of || match.best_of || 3,
            raw_data: match,
            last_synced_at: new Date().toISOString()
          };

          // Upsert match data
          const { error, data: upsertResult } = await supabase
            .from('sportdevs_matches')
            .upsert(matchData, { 
              onConflict: 'match_id',
              ignoreDuplicates: false 
            })
            .select('id, created_at, updated_at');

          if (error) {
            console.error(`❌ Error upserting match ${matchData.match_id}:`, error);
            continue;
          }

          if (upsertResult && upsertResult.length > 0) {
            const record = upsertResult[0];
            const createdAt = new Date(record.created_at).getTime();
            const updatedAt = new Date(record.updated_at).getTime();
            
            if (Math.abs(createdAt - updatedAt) < 1000) {
              totalAdded++;
              console.log(`✅ Added new live match: ${matchData.match_id}`);
            } else {
              totalUpdated++;
              console.log(`🔄 Updated live match: ${matchData.match_id}`);
            }
          }
        }

        // Add delay between esport types to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`❌ Error processing ${esportType}:`, error);
        continue;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Live matches sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated in ${duration}ms`);

    // Update log entry with success
    if (logEntry) {
      await supabase
        .from('sportdevs_sync_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          records_processed: totalProcessed,
          records_added: totalAdded,
          records_updated: totalUpdated,
          metadata: { 
            esports_synced: ESPORT_TYPES.length,
            api_key_used: !!apiKey
          }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated,
        duration_ms: duration,
        esports_synced: ESPORT_TYPES.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ SportDevs live matches sync failed:', error);

    if (logEntry) {
      await supabase
        .from('sportdevs_sync_logs')
        .update({
          status: 'error',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          records_processed: totalProcessed,
          records_added: totalAdded,
          records_updated: totalUpdated,
          error_message: error.message,
          error_details: { stack: error.stack }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed: totalProcessed,
        added: totalAdded,
        updated: totalUpdated
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
