
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
    console.log('🕒 Setting up FACEIT cron jobs...');
    
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

    // Schedule live matches sync every 2 minutes
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'faceit-live-sync',
          '*/2 * * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/sync-faceit-live',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    // Schedule upcoming matches sync every 10 minutes
    await supabase.rpc('sql', {
      query: `
        SELECT cron.schedule(
          'faceit-upcoming-sync',
          '*/10 * * * *',
          $$
          SELECT net.http_post(
            url := 'https://${projectRef}.supabase.co/functions/v1/sync-faceit-upcoming',
            headers := '{"Content-Type": "application/json", "Authorization": "Bearer ${anonKey}"}'::jsonb,
            body := '{}'::jsonb
          ) as request_id;
          $$
        );
      `
    });

    console.log('✅ FACEIT cron jobs set up successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'FACEIT cron jobs configured successfully',
        schedules: {
          live: 'Every 2 minutes',
          upcoming: 'Every 10 minutes'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error setting up FACEIT cron jobs:', error);
    
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
