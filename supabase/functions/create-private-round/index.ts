import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateRoundRequest {
  round_name: string;
  start_date: string;
  end_date: string;
  budget_cap?: number;
  game_type?: string;
  game_source?: 'pro' | 'amateur' | 'both';
}

function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  return code;
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

    const body: CreateRoundRequest = await req.json();
    console.log('Creating private round with config:', body);

    // Validate input
    if (!body.round_name || !body.start_date || !body.end_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate budget_cap
    const budgetCap = body.budget_cap || 50;
    if (budgetCap < 30 || budgetCap > 200) {
      return new Response(
        JSON.stringify({ error: 'Budget must be between 30 and 200 credits' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate game_source
    const gameSource = body.game_source || 'both';
    if (!['pro', 'amateur', 'both'].includes(gameSource)) {
      return new Response(
        JSON.stringify({ error: 'Invalid game source' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    const now = new Date();

    if (startDate >= endDate) {
      return new Response(
        JSON.stringify({ error: 'End date must be after start date' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (endDate <= now) {
      return new Response(
        JSON.stringify({ error: 'End date must be in the future' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate unique join code
    let joinCode = generateJoinCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseClient
        .from('fantasy_rounds')
        .select('id')
        .eq('join_code', joinCode)
        .maybeSingle();

      if (!existing) break;
      
      joinCode = generateJoinCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate unique join code' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create the private round
    const { data: round, error: insertError } = await supabaseClient
      .from('fantasy_rounds')
      .insert({
        type: 'private',
        is_private: true,
        round_name: body.round_name,
        start_date: body.start_date,
        end_date: body.end_date,
        join_code: joinCode,
        created_by: user.id,
        status: 'open',
        budget_cap: budgetCap,
        game_source: gameSource,
        game_type: body.game_type || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating round:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create round' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Private round created successfully:', round.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        round,
        join_code: joinCode 
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
