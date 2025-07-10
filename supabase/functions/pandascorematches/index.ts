import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PANDA_API_TOKEN = Deno.env.get('PANDA_SCORE_API_KEY')
  const BASE_URL = 'https://api.pandascore.co/matches'
  const PER_PAGE = 50
  let page = 1
  let totalFetched = 0

  // Helper to extract player IDs from players array
  function extractPlayerIds(players: any[]) {
    if (!players) return []
    return players.map((p) => p.id).filter(Boolean)
  }

  // Optional: log total matches header
  const testRes = await fetch(`${BASE_URL}?per_page=1`, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  })
  const total = testRes.headers.get('X-Total')
  console.log(`Total matches available: ${total}`)

  while (true) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}&sort=modified_at`

    console.log(`Fetching page ${page}: ${url}`)
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${PANDA_API_TOKEN}`,
      },
    })

    if (!res.ok) {
      console.error(`PandaScore error on page ${page}:`, await res.text())
      break
    }

    const text = await res.text()
    let matches
    try {
      matches = JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse JSON:', e)
      break
    }

    console.log(`Fetched ${matches.length} matches on page ${page}`)
    if (matches.length === 0) {
      console.log('No more matches, stopping.')
      break
    }

    for (const match of matches) {
      const match_id = match.id?.toString()
      if (!match_id) {
        console.log('Skipping match with missing ID:', match)
        continue
      }

      // Check existing record for modified_at timestamp
      const { data: existing, error: fetchError } = await supabase
        .from('pandascore_matches')
        .select('modified_at')
        .eq('match_id', match_id)
        .maybeSingle()

      if (fetchError) {
        console.error(`Error fetching existing match ${match_id}:`, fetchError)
      }

      const modifiedRemote = new Date(match.modified_at)
      const modifiedLocal = existing?.modified_at ? new Date(existing.modified_at) : null

      // Optional: Skip if not modified (uncomment if desired)
      // if (modifiedLocal && modifiedRemote <= modifiedLocal) {
      //   console.log(`Skipping match ${match_id}: not modified`)
      //   continue
      // }

      // Extract player IDs for each team (assuming opponents array has players)
      const teamAPlayerIds = extractPlayerIds(match.opponents?.[0]?.players ?? [])
      const teamBPlayerIds = extractPlayerIds(match.opponents?.[1]?.players ?? [])

      const mapped = {
        match_id,
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
        team_a_player_ids: teamAPlayerIds,
        team_b_player_ids: teamBPlayerIds,
        raw_data: match,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        created_at: existing ? undefined : new Date().toISOString(),
      }

      const { error } = await supabase
        .from('pandascore_matches')
        .upsert(mapped, { onConflict: ['match_id'] })

      if (error) {
        console.error(`Insert failed for match ${match_id}:`, error)
      } else {
        console.log(`Upserted match ${match_id}`)
        totalFetched++
      }
    }

    page++
    await sleep(1000) // avoid hitting rate limits
  }

  return new Response(JSON.stringify({ status: 'done', total: totalFetched }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
