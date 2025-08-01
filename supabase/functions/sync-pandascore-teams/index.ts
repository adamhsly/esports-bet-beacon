// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async () => {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const PANDA_API_TOKEN = Deno.env.get("PANDA_SCORE_API_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PANDA_API_TOKEN) {
    return new Response(JSON.stringify({ error: "Missing environment variables." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const BASE_URL = "https://api.pandascore.co/teams";
  const PER_PAGE = 50;

  // Step 1: Fetch total team count and calculate max pages
  const countRes = await fetch(`${BASE_URL}?per_page=1`, {
    headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
  });

  if (!countRes.ok) {
    return new Response(JSON.stringify({ error: "Failed to count teams." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const totalTeams = Number(countRes.headers.get("X-Total") ?? 0);
  const maxPages = Math.ceil(totalTeams / PER_PAGE);

  // Step 2: Load last sync state
  const { data: syncState } = await supabase
    .from("pandascore_sync_state")
    .select("last_page")
    .eq("id", "teams")
    .maybeSingle();

  let lastPage = (syncState?.last_page ?? 0) + 1;
  let totalFetched = 0;

  while (lastPage <= maxPages) {
    const url = `${BASE_URL}?per_page=${PER_PAGE}&page=${lastPage}`;
    console.log(`🔄 Fetching teams: Page ${lastPage}`);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PANDA_API_TOKEN}` },
    });

    if (!res.ok) {
      console.error(`❌ Failed page ${lastPage}:`, await res.text());
      break;
    }

    const teams = await res.json();
    if (!Array.isArray(teams)) break;

    for (const team of teams) {
      const mapped = {
        team_id: team.id?.toString(),
        esport_type: team.videogame?.name ?? "unknown",
        name: team.name ?? "unknown",
        acronym: team.acronym ?? null,
        logo_url: team.image_url ?? null,
        slug: team.slug ?? null,
        updated_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
        created_at: new Date().toISOString(), // ignored if already exists
      };

      const { error } = await supabase
        .from("pandascore_teams")
        .upsert(mapped, { onConflict: ["team_id", "esport_type"] });

      if (error) {
        console.error(`❌ Error upserting team ${team.name}:`, error);
      } else {
        totalFetched++;
      }
    }

    // Update sync state after each page
    const { error: syncError } = await supabase
      .from("pandascore_sync_state")
      .upsert(
        {
          id: "teams",
          last_page: lastPage,
          max_page: maxPages,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: ["id"] }
      );

    if (syncError) console.error("❌ Failed to update sync state:", syncError);

    lastPage++;
    await sleep(500); // rate limit cushion
  }

  // Reset page back to 0 after full sync
  await supabase
    .from("pandascore_sync_state")
    .upsert({ id: "teams", last_page: 0, last_synced_at: new Date().toISOString() }, { onConflict: ["id"] });

  return new Response(
    JSON.stringify({ message: "✅ Teams sync complete", total_fetched: totalFetched }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
