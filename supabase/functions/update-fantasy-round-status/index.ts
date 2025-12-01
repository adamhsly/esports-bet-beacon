import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🕐 Checking for expired fantasy rounds...');

    // Call the database function to update expired rounds
    const { data, error } = await supabase.rpc('update_expired_fantasy_rounds');

    if (error) {
      console.error('❌ Error updating fantasy round status:', error);
      throw error;
    }

    const roundsUpdated = data || 0;
    console.log(`✅ Updated ${roundsUpdated} fantasy rounds (scheduled→open + open→closed)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${roundsUpdated} rounds (scheduled→open + open→closed)`,
        rounds_updated: roundsUpdated
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in update-fantasy-round-status:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update fantasy round status', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});