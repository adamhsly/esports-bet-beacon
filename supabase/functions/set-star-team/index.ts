import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const body = await req.json()
    
    // Validate input
    if (!body.round_id || typeof body.round_id !== 'string') {
      throw new Error('Invalid round_id: must be a valid UUID string')
    }
    if (!body.team_id || typeof body.team_id !== 'string') {
      throw new Error('Invalid team_id: must be a non-empty string')
    }
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(body.round_id)) {
      throw new Error('Invalid round_id format: must be a valid UUID')
    }
    
    const { round_id, team_id } = body;
    
    console.log('Setting star team:', { round_id, team_id });

    // Call the RPC function to set star team
    const { data, error } = await supabaseClient.rpc('set_star_team', {
      p_round_id: round_id,
      p_team_id: team_id
    });

    if (error) {
      console.error('RPC error:', error);
      throw new Error(error.message || 'Failed to set star team');
    }

    console.log('Star team set successfully:', data);

    return new Response(
      JSON.stringify(data),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error setting star team:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})