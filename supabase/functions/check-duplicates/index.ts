import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Input validation - only email required
const validateInput = (input: any) => {
  const errors: string[] = []

  if (!input.email || typeof input.email !== 'string') {
    errors.push('Email is required')
  } else {
    const email = input.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email) || email.length > 255) {
      errors.push('Invalid email format or too long (max 255 characters)')
    }
  }

  return errors
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('[check-duplicates] v2')

    const body = await req.json()
    const email = body.email?.trim()?.toLowerCase()

    const validationErrors = validateInput({ email })
    if (validationErrors.length > 0) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: validationErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!serviceRoleKey) {
      console.error('[check-duplicates] Missing SUPABASE_SERVICE_ROLE_KEY')
      // Fail open so signup flow isn't blocked, but log loudly.
      return new Response(JSON.stringify({ duplicates: { email: false }, warning: 'Server misconfigured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', serviceRoleKey)

    console.log('[check-duplicates] checking email:', email)

    // Admin API doesn't support querying by email directly, so we page through users.
    // We stop as soon as we find a match.
    const perPage = 1000
    let page = 1
    let emailExists = false

    for (let i = 0; i < 20; i++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })

      if (error) {
        console.error('[check-duplicates] listUsers error:', error)
        return new Response(JSON.stringify({ duplicates: { email: false } }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      emailExists = (data.users ?? []).some((u) => (u.email ?? '').toLowerCase() === email)
      if (emailExists) break

      const nextPage = (data as any).nextPage as number | null
      if (!nextPage) break
      page = nextPage
    }

    console.log('[check-duplicates] result:', { email: emailExists })

    return new Response(JSON.stringify({ duplicates: { email: emailExists } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[check-duplicates] unhandled error:', error)
    return new Response(JSON.stringify({ error: error.message ?? 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
