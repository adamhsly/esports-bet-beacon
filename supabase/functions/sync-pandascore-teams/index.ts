import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPPORTED_GAMES = ['cs2', 'lol', 'dota2', 'valorant', 'ow'];

/**
 * Helper to robustly extract all team IDs from teams field.
 */
function extractTeamIds(teamsField: any): string[] {
  let ids: string[] = [];
  if (!teamsField) return ids;

  // If shape: { team1: {id:123,...}, team2: {id:456,...}}
  if (typeof teamsField === 'object' && ('team1' in teamsField || 'team2' in teamsField)) {
    if (teamsField.team1?.id) ids.push(teamsField.team1.id.toString());
    if (teamsField.team2?.id) ids.push(teamsField.team2.id.toString());
  } 
  // If shape: [ {id:123,...}, {id:456,...} ]
  else if (Array.isArray(teamsField)) {
    teamsField.forEach((team) => {
      if (team?.id) ids.push(team.id.toString());
    });
  } 
  // If other shape, try to scan for numeric ids as a fallback
  else if (typeof teamsField === 'object') {
    Object.values(teamsField).forEach((val) => {
      if (typeof val === 'object' && val?.id) ids.push(val.id.toString());
    });
  }
  // Remove blanks, "TBD", "team1", "team2" and duplicates
  return [
    ...new Set(
      ids
        .map(id => (id || '').toString().trim())
        .filter(Boolean)
        .filter(id => /^[0-9]+$/.test(id)) // numeric only
        .filter(id => id !== "TBD" && id !== "team1" && id !== "team2")
    )
  ];
}

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

        // 1. Get teams from matches in the last 30 days, plus next 7 days
        let teamIds = new Set<string>();
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const { data: recentMatches, error: matchErr } = await supabase
          .from('pandascore_matches')
          .select('teams')
          .eq('esport_type', game)
          .gte('start_time', thirtyDaysAgo)
          .lte('start_time', sevenDaysFromNow)
          .limit(200);

        if (matchErr) {
          console.error(`Error fetching matches for ${game}:`, matchErr);
        } else {
          for (const match of recentMatches ?? []) {
            // Log actual teams field for debugging
            console.log(`Match teams for ${game}:`, match.teams);
            const ids = extractTeamIds(match.teams);
            if (ids.length === 0) {
              console.warn(`No team IDs extracted from teams:`, match.teams);
            }
            ids.forEach(id => {
              // Only push numeric team IDs (already filtered in extractTeamIds)
              teamIds.add(id);
            });
          }
        }

        // 2. Get teams from tournaments (from recent tournaments)
        const { data: recentTournaments, error: tournErr } = await supabase
          .from('pandascore_tournaments')
          .select('raw_data')
          .eq('esport_type', game)
          .gte('start_date', thirtyDaysAgo)
          .limit(100);

        if (!tournErr && recentTournaments) {
          for (const t of recentTournaments) {
            const tRaw = t.raw_data;
            // Some tournaments have teams or participants arrays
            if (Array.isArray(tRaw?.teams)) {
              for (const team of tRaw.teams) {
                if (team?.id && /^[0-9]+$/.test(team.id.toString())) {
                  teamIds.add(team.id.toString());
                }
              }
            }
            if (Array.isArray(tRaw?.participants)) {
              for (const team of tRaw.participants) {
                if (team?.id && /^[0-9]+$/.test(team.id.toString())) {
                  teamIds.add(team.id.toString());
                }
              }
            }
          }
        }

        // Log what we have so far
        console.log(`🎯 Extracted ${teamIds.size} unique team IDs for ${game} from matches/tournaments:`, Array.from(teamIds));

        // 3. Fallback: If still < 10 teams, fallback to fetching first 25 teams from PandaScore API directly (seed the table)
        if (teamIds.size < 10) {
          console.warn(`⚠️  Fewer than 10 teams found for ${game}. Fallback to fetching teams list from PandaScore...`);
          const fallbackUrl = `https://api.pandascore.co/${game}/teams?page=1&per_page=25`;
          const resp = await fetch(
            fallbackUrl,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              }
            }
          );
          if (resp.ok) {
            const fallbackTeams = await resp.json();
            for (const t of fallbackTeams) {
              if (t?.id && /^[0-9]+$/.test(t.id.toString())) {
                teamIds.add(t.id.toString());
              }
            }
          } else {
            console.error(`Error in fallback fetch for teams (${game}):`, resp.status, await resp.text());
          }
          console.log(`🎯 After fallback: now have ${teamIds.size} team IDs for ${game}:`, Array.from(teamIds));
        }

        // 4. If still none, log and skip
        if (teamIds.size === 0) {
          console.error(`❌ No teams found to sync for ${game}. Skipping.`);
          continue;
        }

        // 5. Fetch and upsert teams
        for (const teamId of Array.from(teamIds)) {
          try {
            const url = `https://api.pandascore.co/${game}/teams/${teamId}`;
            console.log(`Fetching team from ${url}`);
            const response = await fetch(
              url,
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
              .maybeSingle();

            if (existing && existing.created_at === existing.updated_at) {
              totalAdded++;
            } else {
              totalUpdated++;
            }

            // Respect API rate limits on team requests
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
