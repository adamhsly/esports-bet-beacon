import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('⚙️ Setting up match status update cron job...');

    // Remove existing cron job if it exists
    const { error: unscheduleError } = await supabase.rpc('cron_unschedule', {
      jobname: 'auto-match-status-updater'
    });

    if (unscheduleError && !unscheduleError.message.includes('could not find')) {
      console.error('❌ Error unscheduling existing cron job:', unscheduleError);
    } else {
      console.log('🗑️ Cleaned up existing cron job (if any)');
    }

    // Create new cron job to run every 2 minutes
    const cronJobSql = `
      SELECT cron.schedule(
        'auto-match-status-updater',
        '*/2 * * * *',
        $$
        SELECT
          net.http_post(
            url:='${supabaseUrl}/functions/v1/auto-match-status-updater',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}"}'::jsonb,
            body:='{"timestamp": "' || now() || '"}'::jsonb
          ) as request_id;
        $$
      );
    `;

    const { error: scheduleError } = await supabase.rpc('exec_sql', {
      sql: cronJobSql
    });

    if (scheduleError) {
      console.error('❌ Error scheduling cron job:', scheduleError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to schedule cron job',
        details: scheduleError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Successfully set up match status update cron job (runs every 2 minutes)');

    // Test the function immediately to ensure it works
    console.log('🧪 Testing the match status updater function...');
    
    const { data: testResult, error: testError } = await supabase.functions.invoke('auto-match-status-updater', {
      body: { test: true }
    });

    if (testError) {
      console.error('❌ Test invocation failed:', testError);
    } else {
      console.log('✅ Test invocation successful:', testResult);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Match status update cron job set up successfully',
      schedule: 'Every 2 minutes (*/2 * * * *)',
      testResult: testError ? { error: testError.message } : testResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Error in setup-match-status-cron:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});