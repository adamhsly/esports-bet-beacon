
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
  started_at: string;
  finished_at?: string;
  configured_at: string;
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

  // Log sync start
  const { data: logEntry } = await supabase
    .from('faceit_sync_logs')
    .insert({
      sync_type: 'live',
      status: 'running'
    })
    .select()
    .single();

  try {
    const faceitApiKey = Deno.env.get('FACEIT_API_KEY');
    if (!faceitApiKey) {
      throw new Error('FACEIT_API_KEY not found in secrets');
    }

    console.log('🔴 Starting FACEIT live matches sync (championship-based)...');

    // Step 1: Fetch CS2 championships
    console.log('📋 Fetching CS2 championships...');
    const championshipsResponse = await fetch('https://open.faceit.com/data/v4/championships?game=cs2&limit=20', {
      headers: {
        'Authorization': `Bearer ${faceitApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!championshipsResponse.ok) {
      const errorText = await championshipsResponse.text();
      console.error('FACEIT Championships API error:', errorText);
      throw new Error(`FACEIT Championships API error: ${championshipsResponse.status} ${championshipsResponse.statusText} - ${errorText}`);
    }

    const championshipsData: FaceitChampionshipsResponse = await championshipsResponse.json();
    console.log(`📋 Retrieved ${championshipsData.items.length} championships`);

    const allLiveMatches: FaceitMatch[] = [];

    // Step 2: For each championship, fetch matches
    for (const championship of championshipsData.items) {
      championshipsProcessed++;
      console.log(`🏆 Processing championship: ${championship.name} (${championship.championship_id})`);

      try {
        const matchesResponse = await fetch(`https://open.faceit.com/data/v4/championships/${championship.championship_id}/matches?limit=50`, {
          headers: {
            'Authorization': `Bearer ${faceitApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!matchesResponse.ok) {
          console.error(`❌ Error fetching matches for championship ${championship.championship_id}: ${matchesResponse.status}`);
          continue; // Skip this championship and continue with others
        }

        const matchesData: FaceitMatchesResponse = await matchesResponse.json();
        console.log(`🎮 Found ${matchesData.items.length} matches in ${championship.name}`);

        // Filter for live matches (status RUNNING or similar, and started)
        const liveMatches = matchesData.items.filter(match => {
          const isRunning = match.status.toLowerCase() === 'running' || match.status.toLowerCase() === 'ongoing';
          const hasStarted = match.started_at && new Date(match.started_at) <= new Date();
          const notFinished = !match.finished_at;
          
          return (match.game === 'cs2' || match.game === 'csgo') && isRunning && hasStarted && notFinished;
        });

        console.log(`🔴 Found ${liveMatches.length} live matches in ${championship.name}`);
        allLiveMatches.push(...liveMatches);

        // Add small delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`❌ Error processing championship ${championship.championship_id}:`, error);
        continue; // Continue with next championship
      }
    }

    console.log(`🎯 Total live matches found across all championships: ${allLiveMatches.length}`);

    // Step 3: Process and store matches
    for (const match of allLiveMatches) {
      processed++;
      
      const matchData = {
        match_id: match.match_id,
        game: match.game,
        region: match.region,
        competition_name: match.competition_name,
        competition_type: match.competition_type,
        organized_by: match.organized_by,
        status: 'ongoing', // Set to ongoing for live matches
        started_at: match.started_at ? new Date(match.started_at).toISOString() : null,
        finished_at: match.finished_at ? new Date(match.finished_at).toISOString() : null,
        configured_at: match.configured_at ? new Date(match.configured_at).toISOString() : null,
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
        raw_data: match
      };

      const { error, data: upsertResult } = await supabase
        .from('faceit_matches')
        .upsert(matchData, { 
          onConflict: 'match_id',
          ignoreDuplicates: false 
        })
        .select('id');

      if (error) {
        console.error(`❌ Error upserting live match ${match.match_id}:`, error);
        continue;
      }

      if (upsertResult && upsertResult.length > 0) {
        // Check if this was an insert or update by comparing created_at and updated_at
        const { data: existingMatch } = await supabase
          .from('faceit_matches')
          .select('created_at, updated_at')
          .eq('match_id', match.match_id)
          .single();

        if (existingMatch) {
          const createdAt = new Date(existingMatch.created_at).getTime();
          const updatedAt = new Date(existingMatch.updated_at).getTime();
          
          if (Math.abs(createdAt - updatedAt) < 1000) { // Within 1 second = new insert
            added++;
          } else {
            updated++;
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Live sync completed: ${processed} processed, ${added} added, ${updated} updated in ${duration}ms`);
    console.log(`📊 Championships processed: ${championshipsProcessed}`);

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
            total_championships: championshipsData.items.length,
            live_matches_found: allLiveMatches.length 
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
        live_matches_found: allLiveMatches.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ FACEIT live sync failed:', error);

    // Update log entry with error
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
          error_details: { stack: error.stack, championships_processed: championshipsProcessed }
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
        championships_processed: championshipsProcessed
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
