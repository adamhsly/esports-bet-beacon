import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JoinRoundRequest {
  code: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const body: JoinRoundRequest = await req.json();
    const joinCode = body.code?.toUpperCase().trim();

    console.log('Attempting to join round with code:', joinCode);

    if (!joinCode) {
      return new Response(
        JSON.stringify({ error: 'Join code is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Look up the round by join code
    const { data: round, error: roundError } = await supabaseClient
      .from('fantasy_rounds')
      .select('*')
      .eq('join_code', joinCode)
      .eq('is_private', true)
      .maybeSingle();

    if (roundError) {
      console.error('Error fetching round:', roundError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch round' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!round) {
      return new Response(
        JSON.stringify({ error: 'Invalid join code' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if round is joinable
    if (round.status !== 'open') {
      return new Response(
        JSON.stringify({ error: 'This round is no longer open for joining' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const now = new Date();
    const endDate = new Date(round.end_date);

    if (endDate <= now) {
      return new Response(
        JSON.stringify({ error: 'This round has already ended' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if user has already joined this round
    const { data: existingPick } = await supabaseClient
      .from('fantasy_round_picks')
      .select('id')
      .eq('round_id', round.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingPick) {
      return new Response(
        JSON.stringify({ 
          error: 'You have already joined this round',
          round 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('User can join round:', round.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        round 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
