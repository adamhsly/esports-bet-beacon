import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation - only email required
const validateInput = (input: any) => {
  const errors: string[] = [];
  
  if (!input.email || typeof input.email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email.trim()) || input.email.length > 255) {
      errors.push('Invalid email format or too long (max 255 characters)');
    }
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
    const email = body.email?.trim();
    
    // Validate input
    const validationErrors = validateInput({ email });
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: validationErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    console.log('Checking email duplicate for:', email)

    // Check if email exists in auth.users via profiles or directly
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      console.error('Error checking duplicates:', error)
      // If profiles table doesn't have email column, just return no duplicate
      return new Response(JSON.stringify({ duplicates: { email: false } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const emailExists = !!data

    console.log('Email duplicate check result:', emailExists)

    return new Response(JSON.stringify({ duplicates: { email: emailExists } }), {
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
