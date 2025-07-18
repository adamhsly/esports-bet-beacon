import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js"

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  const PANDA_API_TOKEN = Deno.env.get("PANDA_SCORE_API_KEY")
  const BASE_URL = "https://api.pandascore.co/changes"
  const PER_PAGE = 50

  // Track sync state
  const { data: syncState, error: syncStateError } = await supabase
    .from("pandascore_sync_state")
    .select("last_page")
    .eq("id", "match_changes")
    .maybeSingle()

  let page = (syncState?.last_page ?? 0) + 1
  let totalUpserted = 0

  while (true) {
    const url = `${BASE_URL}?type=match&page[size]=${PER_PAGE}&page[number]=${page}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    })

    if (!res.ok) {
      const err = await res.text()
      console.error(`Failed to fetch changes:`, err)
      break
    }

    const changes = await res.json()

    if (!Array.isArray(changes) || changes.length === 0) {
      console.log("✅ No more changes.")
      page = 0 // reset for next run
      break
    }

    for (const change of changes) {
      const match = change.object
      const match_id = match.id?.toString()
      if (!match_id) continue

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
        tournament_id: match.tournament_id?.toString() ?? null,
        tournament_name: match.tournament?.name ?? null,
        league_id: match.league_id?.toString() ?? null,
        league_name: match.league?.name ?? null,
        serie_id: match.serie_id?.toString() ?? null,
        serie_name: match.serie?.name ?? null,
        teams: match.opponents ?? [],
        raw_data: match,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("pandascore_matches")
        .upsert(mapped, { onConflict: ["match_id"] })

      if (error) {
        console.error(`❌ Failed to upsert match ${match_id}:`, error)
      } else {
        console.log(`✅ Upserted match ${match_id}`)
        totalUpserted++
      }
    }

    // Update sync state
    const { error: syncError } = await supabase
      .from("pandascore_sync_state")
      .upsert({
        id: "match_changes",
        last_page: page,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: ["id"] })

    if (syncError) {
      console.error("❌ Failed to update sync state:", syncError)
    }

    page++
    await sleep(500) // to avoid hitting rate limit
  }

  return new Response(
    JSON.stringify({ status: "done", total: totalUpserted }),
    { headers: { "Content-Type": "application/json" } }
  )
})
