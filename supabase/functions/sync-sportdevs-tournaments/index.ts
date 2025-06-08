
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supported esport types
const ESPORT_TYPES = ['csgo', 'dota2', 'lol', 'valorant', 'overwatch', 'rl'];

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
      sync_type: 'tournaments',
      status: 'running'
    })
    .select()
    .single();

  try {
    const apiKey = "GsZ3ovnDw0umMvL5p7SfPA";
    console.log('🏆 Starting SportDevs tournaments sync...');

    // Get unique tournament IDs from recent matches
    const { data: recentMatches } = await supabase
      .from('sportdevs_matches')
      .select('tournament_id, tournament_name, esport_type')
      .not('tournament_id', 'is', null)
      .gte('start_time', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

    if (!recentMatches) {
      console.log('📊 No recent matches with tournaments found');
      throw new Error('No recent matches with tournaments found');
    }

    const tournamentIds = new Set<string>();
    const tournamentData = new Map<string, { name: string, esportType: string }>();

    // Extract tournament IDs from matches
    recentMatches.forEach(match => {
      if (match.tournament_id) {
        tournamentIds.add(match.tournament_id);
        tournamentData.set(match.tournament_id, {
          name: match.tournament_name || 'Unknown Tournament',
          esportType: match.esport_type
        });
      }
    });

    console.log(`🎯 Found ${tournamentIds.size} unique tournaments to sync`);

    for (const tournamentId of tournamentIds) {
      try {
        totalProcessed++;
        const tournamentInfo = tournamentData.get(tournamentId);
        
        console.log(`🏆 Syncing tournament ${tournamentId} (${tournamentInfo?.esportType})...`);

        // Fetch tournament data from SportDevs API
        const response = await fetch(`https://esports.sportdevs.com/tournaments?id=eq.${tournamentId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`❌ Error fetching tournament ${tournamentId}: ${response.status}`);
          // Create basic tournament record from match data
          const basicTournamentData = {
            tournament_id: tournamentId,
            esport_type: tournamentInfo?.esportType || 'csgo',
            name: tournamentInfo?.name || 'Unknown Tournament',
            status: 'ongoing',
            raw_data: {},
            last_synced_at: new Date().toISOString()
          };

          await supabase
            .from('sportdevs_tournaments')
            .upsert(basicTournamentData, { 
              onConflict: 'tournament_id,esport_type',
              ignoreDuplicates: false 
            });
          
          continue;
        }

        const tournaments = await response.json();
        if (!tournaments || tournaments.length === 0) {
          console.log(`⚠️ No detailed data found for tournament ${tournamentId}, creating basic record`);
          
          // Create basic tournament record
          const basicTournamentData = {
            tournament_id: tournamentId,
            esport_type: tournamentInfo?.esportType || 'csgo',
            name: tournamentInfo?.name || 'Unknown Tournament',
            status: 'ongoing',
            raw_data: {},
            last_synced_at: new Date().toISOString()
          };

          const { error } = await supabase
            .from('sportdevs_tournaments')
            .upsert(basicTournamentData, { 
              onConflict: 'tournament_id,esport_type',
              ignoreDuplicates: false 
            });

          if (!error) totalAdded++;
          continue;
        }

        const tournament = tournaments[0];

        // Transform tournament data
        const formattedTournamentData = {
          tournament_id: tournamentId,
          esport_type: tournamentInfo?.esportType || 'csgo',
          name: tournament.name || tournamentInfo?.name || 'Unknown Tournament',
          status: tournament.status || 'ongoing',
          start_date: tournament.start_date ? new Date(tournament.start_date).toISOString() : null,
          end_date: tournament.end_date ? new Date(tournament.end_date).toISOString() : null,
          image_url: tournament.image_url,
          hash_image: tournament.hash_image,
          raw_data: tournament,
          last_synced_at: new Date().toISOString()
        };

        // Upsert tournament data
        const { error, data: upsertResult } = await supabase
          .from('sportdevs_tournaments')
          .upsert(formattedTournamentData, { 
            onConflict: 'tournament_id,esport_type',
            ignoreDuplicates: false 
          })
          .select('id, created_at, updated_at');

        if (error) {
          console.error(`❌ Error upserting tournament ${tournamentId}:`, error);
          continue;
        }

        if (upsertResult && upsertResult.length > 0) {
          const record = upsertResult[0];
          const createdAt = new Date(record.created_at).getTime();
          const updatedAt = new Date(record.updated_at).getTime();
          
          if (Math.abs(createdAt - updatedAt) < 1000) {
            totalAdded++;
          } else {
            totalUpdated++;
          }
        }

        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`❌ Error processing tournament ${tournamentId}:`, error);
        continue;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Tournaments sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated in ${duration}ms`);

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
            unique_tournaments_synced: tournamentIds.size
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
        unique_tournaments_synced: tournamentIds.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ SportDevs tournaments sync failed:', error);

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
