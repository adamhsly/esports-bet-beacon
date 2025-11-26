import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT token to maintain auth context
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    );

    const { round_id, old_team_id, new_team_id, points_at_swap } = await req.json();

    // Validate inputs
    if (!round_id || typeof round_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid round_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!old_team_id || typeof old_team_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid old_team_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!new_team_id || typeof new_team_id !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid new_team_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof points_at_swap !== 'number' || points_at_swap < 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid points_at_swap' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Setting team swap:', { round_id, old_team_id, new_team_id, points_at_swap });

    // Call the set_team_swap RPC function
    const { data, error } = await supabase.rpc('set_team_swap', {
      p_round_id: round_id,
      p_old_team_id: old_team_id,
      p_new_team_id: new_team_id,
      p_points_at_swap: points_at_swap
    });

    if (error) {
      console.error('Error from set_team_swap RPC:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Team swap result:', data);

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in set-team-swap function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
