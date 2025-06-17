
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
    console.log('⚙️ Setting up optimized SportDevs cron jobs...');
    
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

    // Remove old cron jobs if they exist
    const oldJobs = [
      'sportdevs-upcoming-matches-sync',
      'sportdevs-teams-sync',
      'sportdevs-tournaments-sync'
    ];

    for (const job of oldJobs) {
      await supabase.rpc('sql', {
        query: `SELECT cron.unschedule('${job}');`
      }).catch(() => {}); // Ignore errors if job doesn't exist
    }

    console.log('✅ Optimized SportDevs cron jobs configured (using centralized midnight sync)');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'SportDevs cron jobs optimized successfully',
        note: 'SportDevs syncing is now handled by the centralized midnight master sync and dynamic match-specific syncs'
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
