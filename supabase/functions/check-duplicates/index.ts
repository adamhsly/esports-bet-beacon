import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation schema
const validateInput = (input: any) => {
  const errors: string[] = [];
  
  if (!input.email || typeof input.email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email) || input.email.length > 255) {
      errors.push('Invalid email format or too long (max 255 characters)');
    }
  }
  
  if (!input.username || typeof input.username !== 'string') {
    errors.push('Username is required');
  } else {
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(input.username) || input.username.length < 3 || input.username.length > 50) {
      errors.push('Username must be 3-50 characters and contain only letters, numbers, hyphens, and underscores');
    }
  }
  
  if (input.full_name && typeof input.full_name === 'string' && input.full_name.length > 100) {
    errors.push('Full name must be less than 100 characters');
  }
  
  return errors;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    
    // Validate input
    const validationErrors = validateInput(body);
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: validationErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, username, full_name } = body;

    // Use anon key instead of service role key for proper RLS enforcement
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log('Checking duplicates for:', { email, username, full_name })

    const { data, error } = await supabaseClient.rpc('check_registration_duplicates', {
      p_email: email,
      p_username: username,
      p_full_name: full_name
    })

    if (error) {
      console.error('Error checking duplicates:', error)
      throw error
    }

    console.log('Duplicate check result:', data)

    return new Response(JSON.stringify({ duplicates: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error in check-duplicates function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})