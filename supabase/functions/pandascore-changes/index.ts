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

  const PANDA_API_TOKEN = Deno.env.get('PANDA_SCORE_API_KEY')!
  const CHANGES_URL = 'https://api.pandascore.co/changes'

  const teamCache: Record<string, number[]> = {}

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
    await sleep(300)
    return playerIds
  }

  const res = await fetch(CHANGES_URL, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  })

  if (!res.ok) {
    console.error('Failed to fetch changes:', await res.text())
    return new Response('Error', { status: 500 })
  }

  const changes = await res.json()
  let totalProcessed = 0

  for (const item of changes) {
    if (item.type !== 'match') continue
    const match = item.object
    const match_id = match.id?.toString()
    if (!match_id) continue

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
      console.error(`❌ Failed to upsert match ${match_id}:`, error)
    } else {
      console.log(`✅ Upserted match ${match_id}`)
      totalProcessed++
    }
  }

  return new Response(JSON.stringify({ status: 'done', total: totalProcessed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
