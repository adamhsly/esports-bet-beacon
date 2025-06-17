
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
    console.log('🕒 Setting up optimized FACEIT cron jobs...');
    
    const projectRef = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0];
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!projectRef || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    // Enable required extensions
    await supabase.rpc('sql', {
      query: `
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        CREATE EXTENSION IF NOT EXISTS pg_net;
      `
    });

    // Remove old cron jobs
    const oldJobs = [
      'faceit-live-sync',
      'faceit-upcoming-sync',
      'sportdevs-upcoming-matches-sync',
      'sportdevs-teams-sync',
      'sportdevs-tournaments-sync'
    ];

    for (const job of oldJobs) {
      await supabase.rpc('sql', {
        query: `SELECT cron.unschedule('${job}');`
      }).catch(() => {}); // Ignore errors if job doesn't exist
    }

    // Schedule midnight master sync (runs all endpoints once daily at 00:00)
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'midnight-master-sync',
          '0 0 * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/midnight-master-sync',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    // Schedule dynamic cron manager (runs every 3 minutes to manage match-specific syncs)
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'dynamic-cron-manager',
          '*/3 * * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/manage-dynamic-cron',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    console.log('✅ Optimized FACEIT and match-specific cron jobs set up successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Optimized cron jobs configured successfully',
        schedules: {
          midnight_master_sync: 'Daily at 00:00 (all endpoints)',
          dynamic_cron_manager: 'Every 3 minutes (manages match-specific 5-min syncs)',
          match_specific_syncs: 'Every 5 minutes for matches starting within 15 minutes'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error setting up optimized cron jobs:', error);
    
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
