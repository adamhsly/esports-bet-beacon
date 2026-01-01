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
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { round_id } = await req.json();
    if (!round_id) {
      throw new Error('round_id is required');
    }

    // Get reservation count
    const { count } = await adminClient
      .from('round_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', round_id);

    // Get round status
    const { data: round } = await adminClient
      .from('fantasy_rounds')
      .select('status, minimum_reservations')
      .eq('id', round_id)
      .single();

    // Get pick count (submitted entries)
    const { count: pickCount } = await adminClient
      .from('fantasy_round_picks')
      .select('*', { count: 'exact', head: true })
      .eq('round_id', round_id);

    return new Response(
      JSON.stringify({
        count: count || 0,
        pick_count: pickCount || 0,
        is_open: round?.status === 'open',
        minimum_reservations: round?.minimum_reservations || 30,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get reservation count error:', error);
    return new Response(
      JSON.stringify({ count: 0, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
