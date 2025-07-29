import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    console.log('🔧 Setting up FACEIT live data cron jobs...');

    // Set up cron job for live matches sync every 30 seconds
    const { data: liveCron, error: liveCronError } = await supabase
      .from('pg_cron')
      .upsert({
        jobname: 'faceit_live_sync',
        schedule: '*/30 * * * * *', // Every 30 seconds
        command: `SELECT net.http_post(
          url:='${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-faceit-live',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}"}',
          body:='{"games": ["cs2", "dota2"]}'
        );`
      }, { onConflict: 'jobname' });

    if (liveCronError) {
      console.error('❌ Error setting up live sync cron:', liveCronError);
    } else {
      console.log('✅ Live sync cron job set up successfully');
    }

    // Set up cron job for individual live match updates every 15 seconds
    const { data: matchCron, error: matchCronError } = await supabase
      .from('pg_cron')
      .upsert({
        jobname: 'faceit_live_match_updates',
        schedule: '*/15 * * * * *', // Every 15 seconds
        command: `
        DO $$
        DECLARE
          live_match_id TEXT;
        BEGIN
          -- Loop through all live matches and sync them
          FOR live_match_id IN 
            SELECT match_id 
            FROM faceit_matches 
            WHERE status IN ('ongoing', 'live', 'LIVE', 'ONGOING')
            LIMIT 10
          LOOP
            PERFORM net.http_post(
              url:='${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-faceit-live-match',
              headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}"}',
              body:='{"matchId": "' || live_match_id || '"}'
            );
          END LOOP;
        END $$;`
      }, { onConflict: 'jobname' });

    if (matchCronError) {
      console.error('❌ Error setting up live match updates cron:', matchCronError);
    } else {
      console.log('✅ Live match updates cron job set up successfully');
    }

    // Trigger initial sync
    console.log('🚀 Triggering initial live sync...');
    
    const initialSyncResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-faceit-live`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ games: ['cs2', 'dota2'] })
    });

    let initialSyncResult = 'Failed to parse response';
    if (initialSyncResponse.ok) {
      try {
        const syncData = await initialSyncResponse.json();
        initialSyncResult = `Success: ${syncData.processed || 0} matches processed`;
        console.log('✅ Initial sync completed:', syncData);
      } catch (e) {
        initialSyncResult = 'Success but failed to parse response';
      }
    } else {
      console.error('❌ Initial sync failed:', initialSyncResponse.status);
      initialSyncResult = `Failed with status ${initialSyncResponse.status}`;
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'FACEIT live cron jobs set up successfully',
      cronJobs: {
        liveSync: !liveCronError,
        liveMatchUpdates: !matchCronError
      },
      initialSync: initialSyncResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error setting up FACEIT live cron:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});