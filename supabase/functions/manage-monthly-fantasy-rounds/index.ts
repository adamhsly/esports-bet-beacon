import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { addMonths } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (_req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const startDate = now.toISOString();
    const endDate = addMonths(now, 1).toISOString(); // +1 month

    // 1️⃣ Close any open monthly rounds
    const { data: closedRounds, error: closeError } = await supabase
      .from('fantasy_rounds')
      .update({ status: 'closed' })
      .eq('type', 'monthly')
      .eq('status', 'open')
      .select();

    if (closeError) throw closeError;

    console.log(`🔒 Closed ${closedRounds?.length || 0} open monthly rounds`);

    // 2️⃣ Create a new monthly round
    const { data: newRound, error: insertError } = await supabase
      .from('fantasy_rounds')
      .insert({
        type: 'monthly',
        start_date: startDate,
        end_date: endDate,
        status: 'open',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`🆕 Created new monthly round: ${newRound.id} (${startDate} → ${endDate})`);

    return new Response(
      JSON.stringify({
        success: true,
        closed_rounds: closedRounds?.length || 0,
        new_round: newRound,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Monthly Fantasy Rounds Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
