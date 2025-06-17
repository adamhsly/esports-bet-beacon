
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
    console.log('🕒 Managing dynamic cron jobs for active matches...');
    
    const projectRef = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0];
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!projectRef || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    const now = new Date();
    const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);

    // Get matches starting within 15 minutes that aren't finished
    const { data: upcomingMatches, error: faceitError } = await supabase
      .from('faceit_matches')
      .select('match_id, scheduled_at, status')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', fifteenMinutesFromNow.toISOString())
      .not('status', 'in', '(finished,completed,cancelled,aborted)');

    const { data: pandaScoreMatches, error: pandaError } = await supabase
      .from('pandascore_matches')
      .select('match_id, start_time, status')
      .gte('start_time', now.toISOString())
      .lte('start_time', fifteenMinutesFromNow.toISOString())
      .not('status', 'in', '(finished,completed,cancelled)');

    const { data: sportDevsMatches, error: sportError } = await supabase
      .from('sportdevs_matches')
      .select('match_id, start_time, status')
      .gte('start_time', now.toISOString())
      .lte('start_time', fifteenMinutesFromNow.toISOString())
      .not('status', 'in', '(finished,completed,cancelled)');

    if (faceitError || pandaError || sportError) {
      console.error('Error fetching upcoming matches:', { faceitError, pandaError, sportError });
    }

    const allUpcomingMatches = [
      ...(upcomingMatches || []).map(m => ({ ...m, source: 'faceit' })),
      ...(pandaScoreMatches || []).map(m => ({ ...m, source: 'pandascore', scheduled_at: m.start_time })),
      ...(sportDevsMatches || []).map(m => ({ ...m, source: 'sportdevs', scheduled_at: m.start_time }))
    ];

    console.log(`📋 Found ${allUpcomingMatches.length} matches starting within 15 minutes`);

    // Create/update cron jobs for upcoming matches
    for (const match of allUpcomingMatches) {
      const cronJobName = `sync-${match.source}-match-${match.match_id}`;
      
      console.log(`⚙️ Setting up 5-minute sync for ${match.source} match ${match.match_id}`);
      
      // Remove existing cron job if it exists
      await supabase.rpc('sql', {
        query: `SELECT cron.unschedule('${cronJobName}');`
      }).catch(() => {}); // Ignore errors if job doesn't exist

      // Create new 5-minute sync job
      let syncFunctionName = '';
      switch (match.source) {
        case 'faceit':
          syncFunctionName = 'sync-faceit-live';
          break;
        case 'pandascore':
          syncFunctionName = 'sync-pandascore-matches';
          break;
        case 'sportdevs':
          syncFunctionName = 'sync-sportdevs-live';
          break;
      }

      await supabase.rpc('sql', {
        query: `
          SELECT cron.schedule(
            '${cronJobName}',
            '*/5 * * * *',
            $$
            SELECT net.http_post(
              url := 'https://${projectRef}.supabase.co/functions/v1/${syncFunctionName}',
              headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
              body := '{"match_id": "${match.match_id}"}'::jsonb
            ) as request_id;
            $$
          );
        `
      });
    }

    // Clean up cron jobs for finished matches
    const { data: finishedMatches } = await supabase
      .from('faceit_matches')
      .select('match_id')
      .in('status', ['finished', 'completed', 'cancelled', 'aborted']);

    const { data: finishedPandaMatches } = await supabase
      .from('pandascore_matches')
      .select('match_id')
      .in('status', ['finished', 'completed', 'cancelled']);

    const { data: finishedSportMatches } = await supabase
      .from('sportdevs_matches')
      .select('match_id')
      .in('status', ['finished', 'completed', 'cancelled']);

    const allFinishedMatches = [
      ...(finishedMatches || []).map(m => ({ ...m, source: 'faceit' })),
      ...(finishedPandaMatches || []).map(m => ({ ...m, source: 'pandascore' })),
      ...(finishedSportMatches || []).map(m => ({ ...m, source: 'sportdevs' }))
    ];

    console.log(`🧹 Cleaning up ${allFinishedMatches.length} finished match cron jobs`);

    for (const match of allFinishedMatches) {
      const cronJobName = `sync-${match.source}-match-${match.match_id}`;
      await supabase.rpc('sql', {
        query: `SELECT cron.unschedule('${cronJobName}');`
      }).catch(() => {}); // Ignore errors if job doesn't exist
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dynamic cron jobs managed successfully',
        stats: {
          upcoming_matches: allUpcomingMatches.length,
          cleaned_up_jobs: allFinishedMatches.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error managing dynamic cron jobs:', error);
    
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
