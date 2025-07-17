import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PANDA_API_KEY = Deno.env.get('PANDA_SCORE_API_KEY')!
  const CHANGES_URL = 'https://api.pandascore.co/changes'

  try {
    // Fetch changes from PandaScore
    const res = await fetch(CHANGES_URL, {
      headers: { Authorization: `Bearer ${PANDA_API_KEY}` },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('❌ PandaScore fetch error:', errText)
      return new Response('Failed to fetch PandaScore changes', { status: 500 })
    }

    const payload = await res.json()

    if (!Array.isArray(payload)) {
      console.error('❌ Payload is not an array:', payload)
      return new Response('Invalid payload structure', { status: 500 })
    }

    let updatedCount = 0

    for (const change of payload) {
      if (change.type !== 'match') continue

      const match = change.object
      const matchId = match?.id?.toString()
      if (!matchId) continue

      const { data: existing, error: fetchError } = await supabase
        .from('pandascore_matches')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle()

      if (fetchError) {
        console.error(`❌ Error fetching match ${matchId}:`, fetchError)
        continue
      }

      if (!existing) continue // Skip if no record exists

      // Define map from API fields to DB columns
      const fieldMap: Record<string, string> = {
        begin_at: 'start_time',
        end_at: 'end_time',
        modified_at: 'modified_at',
        winner_id: 'winner_id',
        winner_type: 'winner_type',
        status: 'status',
        number_of_games: 'number_of_games',
        match_type: 'match_type',
        rescheduled: 'rescheduled',
        detailed_stats: 'detailed_stats',
        forfeit: 'forfeit',
        draw: 'draw',
        slug: 'slug',
        original_scheduled_at: 'original_scheduled_at',
        streams_list: 'streams_list',
      }

      const updatedFields: Record<string, any> = {}

      for (const apiKey in fieldMap) {
        const dbKey = fieldMap[apiKey]
        const newValue = match[apiKey]
        const oldValue = existing[dbKey]

        if (
          newValue !== undefined &&
          JSON.stringify(newValue) !== JSON.stringify(oldValue)
        ) {
          updatedFields[dbKey] = newValue
        }
      }

      if (Object.keys(updatedFields).length > 0) {
        updatedFields.updated_at = new Date().toISOString()

        const { error: updateError } = await supabase
          .from('pandascore_matches')
          .update(updatedFields)
          .eq('match_id', matchId)

        if (updateError) {
          console.error(`❌ Failed to update match ${matchId}`, updateError)
        } else {
          console.log(`✅ Updated match ${matchId}`, updatedFields)
          updatedCount++
        }
      }
    }

    return new Response(
      JSON.stringify({ status: 'ok', updated: updatedCount }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('❌ Unexpected error:', err)
    return new Response('Unexpected server error', { status: 500 })
  }
})
