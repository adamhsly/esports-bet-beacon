import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PANDA_API_TOKEN = Deno.env.get('PANDA_SCORE_API_TOKEN') // Add this to your Supabase env
  const PANDA_MATCHES_URL = 'https://api.pandascore.co/valorant/matches/upcoming?per_page=5' // customize as needed

  // --- Fetch matches ---
  const pandaResponse = await fetch(PANDA_MATCHES_URL, {
    headers: {
      Authorization: `Bearer ${PANDA_API_TOKEN}`,
    },
  })

  if (!pandaResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch from PandaScore' }),
      { status: 500 }
    )
  }

  const matches = await pandaResponse.json()

  // --- Upsert each match ---
  for (const match of matches) {
    const mapped = {
      match_id: match.id.toString(),
      esport_type: match.videogame?.name ?? null,
      slug: match.slug,
      draw: match.draw,
      forfeit: match.forfeit,
      start_time: match.begin_at,
      end_time: match.end_at,
      original_scheduled_at: match.original_scheduled_at,
      rescheduled: match.rescheduled,
      detailed_stats: match.detailed_stats,
      winner_id: match.winner_id?.toString() ?? null,
      winner_type: match.winner_type ?? null,
      videogame_id: match.videogame?.id?.toString() ?? null,
      videogame_name: match.videogame?.name ?? null,
      stream_url_1: match.streams_list?.[0]?.raw_url ?? null,
      stream_url_2: match.streams_list?.[1]?.raw_url ?? null,
      modified_at: match.modified_at,
      status: match.status,
      match_type: match.match_type,
      number_of_games: match.number_of_games,
      tournament_id: match.tournament?.id?.toString() ?? null,
      tournament_name: match.tournament?.name ?? null,
      league_id: match.league?.id?.toString() ?? null,
      league_name: match.league?.name ?? null,
      serie_id: match.serie?.id?.toString() ?? null,
      serie_name: match.serie?.name ?? null,
      teams: match.opponents ?? [],
      raw_data: match,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('pandascore_matches')
      .upsert(mapped, { onConflict: ['match_id'] }) // prevent duplicates

    if (error) {
      console.error(`Insert failed for match ${match.id}:`, error)
    }
  }

  return new Response(JSON.stringify({ status: 'done', count: matches.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
