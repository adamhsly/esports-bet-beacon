import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { addDays, setHours, setMinutes, setSeconds, setMilliseconds } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const startDate = setMilliseconds(setSeconds(setMinutes(setHours(now, 9), 0), 0), 0);
    const endDate = setMilliseconds(setSeconds(setMinutes(setHours(addDays(startDate, 1), 9), 0), 0), 0);

    // 1️⃣ Close any open daily rounds
    const { data: closedRounds, error: closeError } = await supabase
      .from('fantasy_rounds')
      .update({ status: 'closed' })
      .eq('type', 'daily')
      .eq('status', 'open')
      .select();

    if (closeError) throw closeError;

    console.log(`🔒 Closed ${closedRounds?.length || 0} open daily rounds`);

    // 2️⃣ Create a new daily round
    const { data: newRound, error: insertError } = await supabase
      .from('fantasy_rounds')
      .insert({
        type: 'daily',
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'open',
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`🆕 Created new daily round: ${newRound.id} (${startDate.toISOString()} → ${endDate.toISOString()})`);

    return new Response(
      JSON.stringify({
        success: true,
        closed_rounds: closedRounds?.length || 0,
        new_round: newRound,
      }),
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('❌ Daily Fantasy Rounds Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
