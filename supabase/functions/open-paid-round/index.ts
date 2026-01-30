import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { round_id } = await req.json();
    
    if (!round_id) {
      throw new Error('round_id is required');
    }

    console.log(`Opening paid round: ${round_id}`);

    // Get round details
    const { data: round, error: roundError } = await supabase
      .from('fantasy_rounds')
      .select('id, round_name, status')
      .eq('id', round_id)
      .single();

    if (roundError || !round) {
      throw new Error('Round not found');
    }

    if (round.status === 'open') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Round is already open'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update round status to open
    const { error: updateError } = await supabase
      .from('fantasy_rounds')
      .update({ status: 'open' })
      .eq('id', round_id);

    if (updateError) {
      throw updateError;
    }

    console.log(`Round ${round_id} opened successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Round opened successfully',
        round_name: round.round_name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error opening paid round:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
