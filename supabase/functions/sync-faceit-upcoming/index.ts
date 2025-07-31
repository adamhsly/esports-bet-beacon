import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function convertFaceitTimestamp(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp === "string" && timestamp.includes("T")) return timestamp;
  const unixSeconds = typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(unixSeconds) || unixSeconds <= 0) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

serve(async (req) => {
  console.log("🟢 Function triggered");

  if (req.method === "OPTIONS") {
    console.log("↪️ OPTIONS request received");
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const faceitApiKey = Deno.env.get("FACEIT_API_KEY");
  if (!faceitApiKey) {
    console.error("❌ FACEIT_API_KEY not set");
    return new Response("FACEIT_API_KEY not set", { status: 500 });
  }

  let games = ["csgo", "dota2", "valorant", "lol", "r6s", "overwatch"];
  try {
    const body = await req.json();
    if (body.games && Array.isArray(body.games)) {
      games = body.games;
      console.log("🎮 Using custom games list:", games);
    }
  } catch (err) {
    console.warn("⚠️ Failed to parse request body or no custom games specified");
  }

  const { data: logEntry } = await supabase
    .from("faceit_sync_logs")
    .insert({ sync_type: "upcoming", status: "running" })
    .select()
    .single();

  const allUpcomingMatches = [];
  const allMatchStatuses = new Set();
  const championshipDetailsMap = new Map();

  const now = new Date();

  for (const game of games) {
    for (const type of ["ongoing", "upcoming"]) {
      console.log(`🎯 Fetching championships for ${game.toUpperCase()} (${type.toUpperCase()})`);
      const championshipsUrl = new URL("https://open.faceit.com/data/v4/championships");
      championshipsUrl.searchParams.set("game", game);
      championshipsUrl.searchParams.set("type", type);

      const response = await fetch(championshipsUrl, {
        headers: { Authorization: `Bearer ${faceitApiKey}` },
      });

      if (!response.ok) {
        console.warn(`⚠️ Failed to fetch championships for ${game} (${type})`);
        continue;
      }

      const { items: championships } = await response.json();
      console.log(`🏆 Found ${championships.length} championships for ${game} (${type})`);

      for (const championship of championships) {
        const champId = championship.championship_id;
        console.log(`🔎 Processing championship: ${champId}`);

        const champDetailsResp = await fetch(
          `https://open.faceit.com/data/v4/championships/${champId}`,
          { headers: { Authorization: `Bearer ${faceitApiKey}` } }
        );
        const details = champDetailsResp.ok ? await champDetailsResp.json() : null;
        championshipDetailsMap.set(champId, details);

        const matchesResp = await fetch(
          `https://open.faceit.com/data/v4/championships/${champId}/matches`,
          { headers: { Authorization: `Bearer ${faceitApiKey}` } }
        );

        if (!matchesResp.ok) {
          console.warn(`⚠️ Failed to fetch matches for championship ${champId}`);
          continue;
        }

        const { items: matches } = await matchesResp.json();
        console.log(`📦 Found ${matches.length} matches for championship ${champId}`);

        for (const match of matches) {
          const status = (match.status || "").toLowerCase();
          const scheduledAt = convertFaceitTimestamp(match.scheduled_at);
          const startedAt = convertFaceitTimestamp(match.started_at);
          const finishedAt = convertFaceitTimestamp(match.finished_at);

          allMatchStatuses.add(status);

          const allowedStatuses = [
            "scheduled", "ready", "upcoming", "configured", "ongoing", "started", "finished"
          ];

          if (!allowedStatuses.includes(status)) {
            console.log(`🚫 Skipping ${match.match_id}: unknown status "${status}"`);
            continue;
          }

          if (finishedAt && new Date(finishedAt) <= now) {
            console.log(`📌 Skipping ${match.match_id}: already finished at ${finishedAt}`);
            continue;
          }

          console.log(`✅ Including match ${match.match_id} (status: ${status})`);
          allUpcomingMatches.push({ match, championshipDetails: details });
        }
      }
    }
  }

  let added = 0;
  let updated = 0;

  console.log(`📝 Processing ${allUpcomingMatches.length} upcoming matches...`);

  for (const { match, championshipDetails } of allUpcomingMatches) {
    const matchData = {
      match_id: match.match_id,
      game: match.game,
      region: match.region,
      competition_name: match.competition_name,
      competition_type: match.competition_type,
      organized_by: match.organized_by,
      status: "upcoming",
      started_at: convertFaceitTimestamp(match.started_at),
      scheduled_at: convertFaceitTimestamp(match.scheduled_at),
      finished_at: convertFaceitTimestamp(match.finished_at),
      configured_at: convertFaceitTimestamp(match.configured_at),
      calculate_elo: match.calculate_elo,
      version: match.version,
      teams: match.teams,
      voting: match.voting || null,
      faceit_data: {
        region: match.region,
        competition_type: match.competition_type,
        organized_by: match.organized_by,
        calculate_elo: match.calculate_elo,
      },
      raw_data: match,
      championship_stream_url: championshipDetails?.stream_url || championshipDetails?.url || null,
      championship_raw_data: championshipDetails || null,
    };

    console.log(`📤 Upserting match ${match.match_id}...`);

    const { error } = await supabase
      .from("faceit_matches")
      .upsert(matchData, { onConflict: "match_id", ignoreDuplicates: false });

    if (error) {
      console.error(`❌ Error upserting match ${match.match_id}:`, error);
      continue;
    }

    const { data: existingMatch } = await supabase
      .from("faceit_matches")
      .select("created_at, updated_at")
      .eq("match_id", match.match_id)
      .single();

    if (existingMatch) {
      const createdAt = new Date(existingMatch.created_at).getTime();
      const updatedAt = new Date(existingMatch.updated_at).getTime();
      if (Math.abs(createdAt - updatedAt) < 1000) {
        added++;
      } else {
        updated++;
      }
    }
  }

  console.log(`🎯 Matches processed: ${allUpcomingMatches.length}`);
  console.log(`➕ Added: ${added}`);
  console.log(`🔁 Updated: ${updated}`);
  console.log(`📋 Match statuses encountered:`, Array.from(allMatchStatuses));

  await supabase
    .from("faceit_sync_logs")
    .update({
      status: "success",
      completed_at: new Date().toISOString(),
      matches_processed: allUpcomingMatches.length,
      matches_added: added,
      matches_updated: updated,
    })
    .eq("id", logEntry.id);

  return new Response(
    JSON.stringify({
      success: true,
      matches_processed: allUpcomingMatches.length,
      matches_added: added,
      matches_updated: updated,
      match_statuses: Array.from(allMatchStatuses),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
