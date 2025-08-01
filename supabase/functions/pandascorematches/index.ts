import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetries(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 1000
): Promise<Response> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(url, options)
    if (res.ok) return res

    if (res.status >= 500 && res.status < 600) {
      console.warn(`API server error (${res.status}), attempt ${attempt} of ${retries}. Retrying in ${delay}ms...`)
      await sleep(delay)
      delay *= 2 // exponential backoff
      continue
    }

    // Other errors return immediately
    return res
  }
  throw new Error(`Failed to fetch ${url} after ${retries} attempts`)
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const PANDA_API_TOKEN = Deno.env.get('PANDA_SCORE_API_KEY')
  const BASE_URL = 'https://api.pandascore.co/matches/upcoming'
  const PER_PAGE = 50

  // Team player cache
  const teamCache: Record<string, number[]> = {}

  // Fetch player IDs from the /teams/{id} endpoint
  async function getTeamPlayerIds(teamId: number): Promise<number[]> {
    if (!teamId) return []

    if (teamCache[teamId]) return teamCache[teamId]

    const res = await fetch(`https://api.pandascore.co/teams/${teamId}`, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    })

    if (!res.ok) {
      console.error(`Failed to fetch team ${teamId}:`, await res.text())
      return []
    }

    const data = await res.json()
    const playerIds = (data.players ?? []).map((p: any) => p.id).filter(Boolean)
    teamCache[teamId] = playerIds
    await sleep(300) // Avoid hitting rate limit
    return playerIds
  }

  // **Reset sync state at start**
  const { error: resetError } = await supabase
    .from('pandascore_sync_state')
    .upsert({
      id: 'matches',
      last_page: 0,
      max_page: 0,
      last_synced_at: new Date().toISOString(),
    }, { onConflict: ['id'] })

  if (resetError) {
    console.error('Failed to reset sync state at start:', resetError)
  } else {
    console.log('Reset sync state to last_page=0 and max_page=0 at start')
  }

  // Get sync state (after reset)
  const { data: syncState, error: syncStateError } = await supabase
    .from('pandascore_sync_state')
    .select('last_page, max_page')
    .eq('id', 'matches')
    .maybeSingle()

  if (syncStateError) {
    console.error('Failed to fetch sync state:', syncStateError)
  }

  let page = (syncState?.last_page ?? 0) + 1
  let totalFetched = 0
  let totalPages = syncState?.max_page ?? 0

  // Fetch total matches to calculate max_page
  const testRes = await fetchWithRetries(`${BASE_URL}?per_page=1`, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  })

  if (!testRes.ok) {
    console.error('Failed to fetch total matches:', await testRes.text())
    return new Response(JSON.stringify({ status: 'error', message: 'Failed to fetch total matches' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const total = testRes.headers.get('X-Total')
  console.log(`Total matches available: ${total}`)

  if (total) {
    totalPages = Math.ceil(parseInt(total, 10) / PER_PAGE)
    console.log(`Total pages calculated: ${totalPages}`)

    // Update max_page in DB if needed
    if (!syncState || !syncState.max_page || syncState.max_page !== totalPages) {
      const { error: updateMaxPageError } = await supabase
        .from('pandascore_sync_state')
        .upsert({
          id: 'matches',
          max_page: totalPages,
          last_page: 0,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: ['id'] })

      if (updateMaxPageError) {
        console.error('Failed to update max_page:', updateMaxPageError)
      } else {
        console.log(`Updated max_page to ${totalPages} in sync state table`)
      }
    }
  }

  while (true) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${page}&sort=modified_at`
    console.log(`Fetching page ${page}: ${url}`)

    let res: Response
    try {
      res = await fetchWithRetries(url, {
        headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
      })
    } catch (e) {
      console.error(`Fetch error on page ${page}:`, e)
      break
    }

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

    if (!Array.isArray(matches) || matches.length === 0) {
      console.log(`No matches found on page ${page}, stopping fetch loop.`)
      break
    }

    for (const match of matches) {
      const match_id = match.id?.toString()
      if (!match_id) continue

      // Check for required non-null fields (start_time, esport_type, teams)
      if (!match.begin_at) {
        console.log(`Skipping match ${match_id} because start_time (begin_at) is missing.`)
        continue
      }
      if (!match.videogame?.name) {
        console.log(`Skipping match ${match_id} because esport_type (videogame.name) is missing.`)
        continue
      }
      if (!match.opponents || !Array.isArray(match.opponents) || match.opponents.length === 0) {
        console.log(`Skipping match ${match_id} because teams (opponents) is missing or empty.`)
        continue
      }

      const { data: existing, error: fetchError } = await supabase
        .from('pandascore_matches')
        .select('modified_at')
        .eq('match_id', match_id)
        .maybeSingle()

      if (fetchError) {
        console.error(`Error checking match ${match_id}:`, fetchError)
        continue
      }

      const modifiedRemote = new Date(match.modified_at)
      const modifiedLocal = existing?.modified_at ? new Date(existing.modified_at) : null

      // Skip unmodified matches
      if (modifiedLocal && modifiedRemote <= modifiedLocal) continue

      const teamAId = match.opponents?.[0]?.opponent?.id
      const teamBId = match.opponents?.[1]?.opponent?.id

      const teamAPlayerIds = await getTeamPlayerIds(teamAId)
      const teamBPlayerIds = await getTeamPlayerIds(teamBId)

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
        status: match.status ?? 'scheduled',
        match_type: match.match_type,
        number_of_games: match.number_of_games ?? 3,
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
        console.error(`Failed to upsert match ${match_id}:`, error)
      } else {
        console.log(`Upserted match ${match_id}`)
        totalFetched++
      }
    }

    console.log(`📝 Updating sync state → last_page: ${page}, max_page: ${totalPages}`)

    const { error: syncUpdateError } = await supabase
      .from('pandascore_sync_state')
      .upsert({
        id: 'matches',
        last_page: page,
        max_page: totalPages,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: ['id'] })

    if (syncUpdateError) {
      console.error(`❌ Failed to update sync state for page ${page}:`, syncUpdateError)
    }

    page++
    if (page > totalPages) {
      console.log(`🔄 Reached max page (${totalPages}), resetting to page 1`)
      page = 1
    }

    await sleep(1000)
  }

  return new Response(JSON.stringify({ status: 'done', total: totalFetched }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
