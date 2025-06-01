
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

  try {
    const url = new URL(req.url);
    const matchId = url.searchParams.get('matchId');

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'Missing matchId parameter' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`🔍 Fetching match details for: ${matchId}`);

    // First try to get from database
    const { data: dbMatch, error: dbError } = await supabase
      .from('faceit_matches')
      .select('*')
      .eq('match_id', matchId)
      .single();

    if (dbMatch && !dbError) {
      console.log(`✅ Found match in database: ${matchId}`);
      return new Response(
        JSON.stringify({
          success: true,
          source: 'database',
          match: dbMatch
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not in database, fetch from FACEIT API
    const faceitApiKey = Deno.env.get('FACEIT_API_KEY');
    if (!faceitApiKey) {
      throw new Error('FACEIT_API_KEY not found in secrets');
    }

    console.log(`🌐 Fetching from FACEIT API: ${matchId}`);

    const response = await fetch(`https://open.faceit.com/data/v4/matches/${matchId}`, {
      headers: {
        'Authorization': `Bearer ${faceitApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`FACEIT API error: ${response.status} ${response.statusText}`);
    }

    const faceitMatch = await response.json();

    // Store in database for future requests
    const matchData = {
      match_id: faceitMatch.match_id,
      game: faceitMatch.game,
      region: faceitMatch.region,
      competition_name: faceitMatch.competition_name,
      competition_type: faceitMatch.competition_type,
      organized_by: faceitMatch.organized_by,
      status: faceitMatch.status,
      started_at: faceitMatch.started_at ? new Date(faceitMatch.started_at).toISOString() : null,
      finished_at: faceitMatch.finished_at ? new Date(faceitMatch.finished_at).toISOString() : null,
      configured_at: faceitMatch.configured_at ? new Date(faceitMatch.configured_at).toISOString() : null,
      calculate_elo: faceitMatch.calculate_elo,
      version: faceitMatch.version,
      teams: faceitMatch.teams,
      voting: faceitMatch.voting || null,
      faceit_data: {
        region: faceitMatch.region,
        competition_type: faceitMatch.competition_type,
        organized_by: faceitMatch.organized_by,
        calculate_elo: faceitMatch.calculate_elo
      },
      raw_data: faceitMatch
    };

    const { error: insertError } = await supabase
      .from('faceit_matches')
      .upsert(matchData, { onConflict: 'match_id' });

    if (insertError) {
      console.error('Error storing match in database:', insertError);
    }

    console.log(`✅ Retrieved and stored match details: ${matchId}`);

    return new Response(
      JSON.stringify({
        success: true,
        source: 'api',
        match: matchData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error fetching match details:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
