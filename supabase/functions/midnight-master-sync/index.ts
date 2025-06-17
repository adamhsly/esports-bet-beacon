
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
    console.log('🌙 Starting midnight master sync of all endpoints...');
    
    const projectRef = Deno.env.get('SUPABASE_URL')?.split('//')[1]?.split('.')[0];
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!projectRef || !anonKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }

    const syncResults = [];

    // Define all sync functions to run
    const syncFunctions = [
      'sync-faceit-upcoming',
      'sync-faceit-live',
      'sync-pandascore-matches',
      'sync-pandascore-tournaments',
      'sync-sportdevs-upcoming-matches',
      'sync-sportdevs-live',
      'sync-sportdevs-teams',
      'sync-sportdevs-tournaments'
    ];

    console.log(`📋 Running ${syncFunctions.length} sync functions...`);

    // Run all sync functions sequentially to avoid rate limits
    for (const functionName of syncFunctions) {
      try {
        console.log(`🔄 Syncing ${functionName}...`);
        
        const { data, error } = await supabase.functions.invoke(functionName);
        
        if (error) {
          console.error(`❌ Error in ${functionName}:`, error);
          syncResults.push({
            function: functionName,
            success: false,
            error: error.message
          });
        } else {
          console.log(`✅ ${functionName} completed successfully`);
          syncResults.push({
            function: functionName,
            success: true,
            data: data
          });
        }

        // Wait 2 seconds between sync functions to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error(`❌ Exception in ${functionName}:`, error);
        syncResults.push({
          function: functionName,
          success: false,
          error: error.message
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const errorCount = syncResults.filter(r => !r.success).length;

    console.log(`🎯 Midnight sync completed: ${successCount} successful, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Midnight master sync completed',
        summary: {
          total_functions: syncFunctions.length,
          successful: successCount,
          failed: errorCount
        },
        details: syncResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in midnight master sync:', error);
    
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
