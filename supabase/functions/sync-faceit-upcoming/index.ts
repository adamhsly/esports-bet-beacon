
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface FaceitResponse {
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

  // Log sync start
  const { data: logEntry } = await supabase
    .from('faceit_sync_logs')
    .insert({
      sync_type: 'upcoming',
      status: 'running'
    })
    .select()
    .single();

  try {
    const faceitApiKey = Deno.env.get('FACEIT_API_KEY');
    if (!faceitApiKey) {
      throw new Error('FACEIT_API_KEY not found in secrets');
    }

    console.log('🔄 Starting FACEIT upcoming matches sync...');

    // Use correct status parameter - FACEIT API uses 'SCHEDULED' not 'upcoming'
    const response = await fetch('https://open.faceit.com/data/v4/matches?game=cs2&status=SCHEDULED&limit=50', {
      headers: {
        'Authorization': `Bearer ${faceitApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('FACEIT API error response:', errorText);
      throw new Error(`FACEIT API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: FaceitResponse = await response.json();
    console.log(`📥 Retrieved ${data.items.length} upcoming matches from FACEIT`);

    for (const match of data.items) {
      processed++;
      
      // Convert status to our database format
      const matchData = {
        match_id: match.match_id,
        game: match.game,
        region: match.region,
        competition_name: match.competition_name,
        competition_type: match.competition_type,
        organized_by: match.organized_by,
        status: 'upcoming', // Convert SCHEDULED to upcoming for our database
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
        console.error(`❌ Error upserting match ${match.match_id}:`, error);
        continue;
      }

      if (upsertResult && upsertResult.length > 0) {
        // Check if this was an insert or update
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
    console.log(`✅ Sync completed: ${processed} processed, ${added} added, ${updated} updated in ${duration}ms`);

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
          metadata: { total_available: data.items.length }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        added,
        updated,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ FACEIT upcoming sync failed:', error);

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
          error_details: { stack: error.stack }
        })
        .eq('id', logEntry.id);
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processed,
        added,
        updated
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
