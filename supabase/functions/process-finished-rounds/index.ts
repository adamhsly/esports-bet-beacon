import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Processing finished fantasy rounds...');

    // Step 1: Update round statuses
    const { data: updateData, error: updateError } = await supabase.functions.invoke(
      'update-fantasy-round-status'
    );

    if (updateError) {
      console.error('Error updating round status:', updateError);
      throw updateError;
    }

    console.log('✅ Round statuses updated:', updateData);

    // Step 2: Award winners
    const { data: awardData, error: awardError } = await supabase.functions.invoke(
      'award-fantasy-winners'
    );

    if (awardError) {
      console.error('Error awarding winners:', awardError);
      throw awardError;
    }

    console.log('✅ Winners awarded:', awardData);

    return new Response(
      JSON.stringify({
        success: true,
        status_update: updateData,
        winners_awarded: awardData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error in process-finished-rounds:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
