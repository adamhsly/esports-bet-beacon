
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
    console.log('🔧 Dynamic cron management function called - scheduling logic removed');
    console.log('ℹ️  This function is now available for external cron management');

    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Fetch upcoming matches for monitoring purposes only
    const { data: upcomingMatches } = await supabase
      .from('faceit_matches')
      .select('match_id, scheduled_at, status')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', fifteenMinutesFromNow.toISOString())
      .not('status', 'in', '(finished,completed,cancelled,aborted)');

    const { data: pandaScoreMatches } = await supabase
      .from('pandascore_matches')
      .select('match_id, start_time, status')
      .gte('start_time', now.toISOString())
      .lte('start_time', fifteenMinutesFromNow.toISOString())
      .not('status', 'in', '(finished,completed,cancelled)');

    const { data: sportDevsMatches } = await supabase
      .from('sportdevs_matches')
      .select('match_id, start_time, status')
      .gte('start_time', now.toISOString())
      .lte('start_time', fifteenMinutesFromNow.toISOString())
      .not('status', 'in', '(finished,completed,cancelled)');

    const allUpcomingMatches = [
      ...(upcomingMatches || []).map(m => ({ ...m, source: 'faceit' })),
      ...(pandaScoreMatches || []).map(m => ({ ...m, source: 'pandascore', scheduled_at: m.start_time })),
      ...(sportDevsMatches || []).map(m => ({ ...m, source: 'sportdevs', scheduled_at: m.start_time }))
    ];

    console.log(`📊 Found ${allUpcomingMatches.length} matches starting within 15 minutes`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dynamic cron management function available - scheduling logic removed',
        stats: {
          upcoming_matches: allUpcomingMatches.length,
          faceit: upcomingMatches?.length || 0,
          pandascore: pandaScoreMatches?.length || 0,
          sportdevs: sportDevsMatches?.length || 0
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in dynamic cron management:', error);
    
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
