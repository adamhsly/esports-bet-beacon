
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

  const startTime = Date.now();
  let totalProcessed = 0;
  let totalAdded = 0;
  let totalUpdated = 0;

  // Log sync start
  const { data: logEntry } = await supabase
    .from('sportdevs_sync_logs')
    .insert({
      sync_type: 'teams',
      status: 'running'
    })
    .select()
    .single();

  try {
    const apiKey = "GsZ3ovnDw0umMvL5p7SfPA";
    console.log('🏢 Starting SportDevs teams sync...');

    // Get unique team IDs from recent matches to sync their data
    const { data: recentMatches } = await supabase
      .from('sportdevs_matches')
      .select('teams, esport_type')
      .gte('start_time', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()); // Last 7 days

    if (!recentMatches) {
      console.log('📊 No recent matches found to extract teams from');
      throw new Error('No recent matches found');
    }

    const teamIds = new Set<string>();
    const teamEsportMap = new Map<string, string>();

    // Extract team IDs from matches
    recentMatches.forEach(match => {
      const teams = match.teams;
      if (teams?.team1?.id) {
        teamIds.add(teams.team1.id);
        teamEsportMap.set(teams.team1.id, match.esport_type);
      }
      if (teams?.team2?.id) {
        teamIds.add(teams.team2.id);
        teamEsportMap.set(teams.team2.id, match.esport_type);
      }
    });

    console.log(`🎯 Found ${teamIds.size} unique teams to sync`);

    for (const teamId of teamIds) {
      try {
        totalProcessed++;
        const esportType = teamEsportMap.get(teamId);
        
        console.log(`🏢 Syncing team ${teamId} (${esportType})...`);

        // Fetch team data from SportDevs API
        const response = await fetch(`https://esports.sportdevs.com/teams?id=eq.${teamId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`❌ Error fetching team ${teamId}: ${response.status}`);
          continue;
        }

        const teams = await response.json();
        if (!teams || teams.length === 0) {
          console.log(`⚠️ No data found for team ${teamId}`);
          continue;
        }

        const team = teams[0];

        // Fetch players for this team
        let playersData = [];
        try {
          const playersResponse = await fetch(`https://esports.sportdevs.com/players-by-team?team_id=eq.${teamId}`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json'
            }
          });

          if (playersResponse.ok) {
            const playersResult = await playersResponse.json();
            if (playersResult && playersResult.length > 0 && playersResult[0].players) {
              playersData = playersResult[0].players;
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not fetch players for team ${teamId}:`, error);
        }

        // Transform team data
        const teamData = {
          team_id: teamId,
          esport_type: esportType || 'csgo',
          name: team.name,
          logo_url: team.image_url,
          hash_image: team.hash_image,
          players_data: playersData,
          raw_data: team,
          last_synced_at: new Date().toISOString()
        };

        // Upsert team data
        const { error, data: upsertResult } = await supabase
          .from('sportdevs_teams')
          .upsert(teamData, { 
            onConflict: 'team_id,esport_type',
            ignoreDuplicates: false 
          })
          .select('id, created_at, updated_at');

        if (error) {
          console.error(`❌ Error upserting team ${teamId}:`, error);
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
        console.error(`❌ Error processing team ${teamId}:`, error);
        continue;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Teams sync completed: ${totalProcessed} processed, ${totalAdded} added, ${totalUpdated} updated in ${duration}ms`);

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
            unique_teams_synced: teamIds.size
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
        unique_teams_synced: teamIds.size
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ SportDevs teams sync failed:', error);

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
