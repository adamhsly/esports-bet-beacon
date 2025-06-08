
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
    console.log('⚙️ Setting up SportDevs cron jobs...');
    
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

    // Schedule upcoming matches sync every 15 minutes
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'sportdevs-upcoming-matches-sync',
          '*/15 * * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/sync-sportdevs-upcoming-matches',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    // Schedule teams sync every 2 hours
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'sportdevs-teams-sync',
          '0 */2 * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/sync-sportdevs-teams',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    // Schedule tournaments sync every 6 hours
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'sportdevs-tournaments-sync',
          '0 */6 * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/sync-sportdevs-tournaments',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    console.log('✅ SportDevs cron jobs set up successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SportDevs cron jobs configured successfully',
        schedules: {
          upcoming_matches: 'Every 15 minutes',
          teams: 'Every 2 hours',
          tournaments: 'Every 6 hours'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error setting up SportDevs cron jobs:', error);
    
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
