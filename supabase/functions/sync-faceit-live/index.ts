
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

    // Step 1: Fetch ALL CS2 championships (removed limit)
    console.log('📋 Fetching ALL CS2 championships...');
    const championshipsResponse = await fetch('https://open.faceit.com/data/v4/championships?game=cs2', {
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
    console.log(`📋 Retrieved ${championshipsData.items.length} total championships`);

    // Debug: Log championship statuses and types
    const championshipStatuses = new Set();
    const championshipTypes = new Set();
    championshipsData.items.forEach(champ => {
      championshipStatuses.add(champ.status);
      championshipTypes.add(champ.type);
    });
    console.log(`📊 Championship statuses found: ${Array.from(championshipStatuses).join(', ')}`);
    console.log(`📊 Championship types found: ${Array.from(championshipTypes).join(', ')}`);

    // Filter for active/ongoing championships
    const activeChampionships = championshipsData.items.filter(champ => 
      champ.status.toLowerCase() === 'ongoing' || 
      champ.status.toLowerCase() === 'active' || 
      champ.status.toLowerCase() === 'live'
    );
    console.log(`🎯 Filtered to ${activeChampionships.length} active championships`);

    const allLiveMatches: FaceitMatch[] = [];
    const allMatchStatuses = new Set();

    // Step 2: For each active championship, fetch matches
    for (const championship of activeChampionships) {
      championshipsProcessed++;
      console.log(`🏆 Processing championship: ${championship.name} (${championship.championship_id}) - Status: ${championship.status}`);

      try {
        const matchesResponse = await fetch(`https://open.faceit.com/data/v4/championships/${championship.championship_id}/matches`, {
          headers: {
            'Authorization': `Bearer ${faceitApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!matchesResponse.ok) {
          console.error(`❌ Error fetching matches for championship ${championship.championship_id}: ${matchesResponse.status}`);
          continue;
        }

        const matchesData: FaceitMatchesResponse = await matchesResponse.json();
        console.log(`🎮 Found ${matchesData.items.length} total matches in ${championship.name}`);

        // Debug: Collect all match statuses
        matchesData.items.forEach(match => {
          allMatchStatuses.add(match.status);
        });

        // Broader filtering for live matches
        const liveMatches = matchesData.items.filter(match => {
          const status = match.status.toLowerCase();
          const isLiveStatus = status === 'running' || status === 'ongoing' || status === 'live' || status === 'started';
          const hasStarted = match.started_at && new Date(match.started_at) <= new Date();
          const notFinished = !match.finished_at;
          const isCS = match.game === 'cs2' || match.game === 'csgo';
          
          console.log(`🔍 Match ${match.match_id}: status=${match.status}, started=${!!match.started_at}, finished=${!!match.finished_at}, game=${match.game}`);
          
          return isCS && isLiveStatus && hasStarted && notFinished;
        });

        console.log(`🔴 Found ${liveMatches.length} live matches in ${championship.name}`);
        if (liveMatches.length > 0) {
          console.log(`✨ Live matches details:`, liveMatches.map(m => ({
            id: m.match_id,
            status: m.status,
            started: m.started_at,
            teams: `${m.teams.faction1.name} vs ${m.teams.faction2.name}`
          })));
        }
        
        allLiveMatches.push(...liveMatches);

        // Add delay between requests to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Error processing championship ${championship.championship_id}:`, error);
        continue;
      }
    }

    console.log(`📊 All match statuses found: ${Array.from(allMatchStatuses).join(', ')}`);
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
        status: 'ongoing',
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

      console.log(`💾 Storing match: ${match.match_id} - ${match.teams.faction1.name} vs ${match.teams.faction2.name}`);

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
        const { data: existingMatch } = await supabase
          .from('faceit_matches')
          .select('created_at, updated_at')
          .eq('match_id', match.match_id)
          .single();

        if (existingMatch) {
          const createdAt = new Date(existingMatch.created_at).getTime();
          const updatedAt = new Date(existingMatch.updated_at).getTime();
          
          if (Math.abs(createdAt - updatedAt) < 1000) {
            added++;
          } else {
            updated++;
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Live sync completed: ${processed} processed, ${added} added, ${updated} updated in ${duration}ms`);
    console.log(`📊 Championships processed: ${championshipsProcessed} out of ${activeChampionships.length} active`);

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
            active_championships: activeChampionships.length,
            live_matches_found: allLiveMatches.length,
            championship_statuses: Array.from(championshipStatuses),
            match_statuses: Array.from(allMatchStatuses)
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
        active_championships: activeChampionships.length,
        live_matches_found: allLiveMatches.length,
        debug_info: {
          championship_statuses: Array.from(championshipStatuses),
          match_statuses: Array.from(allMatchStatuses)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ FACEIT live sync failed:', error);

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
