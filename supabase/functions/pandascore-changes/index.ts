import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PANDASCORE_API_TOKEN = Deno.env.get("PANDA_SCORE_API_TOKEN")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (_req) => {
  try {
    const res = await fetch("https://api.pandascore.co/changes", {
      headers: {
        Authorization: `Bearer ${PANDASCORE_API_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Failed to fetch changes:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch changes", details: errorText }),
        { status: 500, headers: corsHeaders }
      );
    }

    const payload = await res.json();

    if (!Array.isArray(payload)) {
      console.error("❌ Invalid response format. Expected an array.", payload);
      return new Response(
        JSON.stringify({ error: "Invalid response format", details: payload }),
        { status: 500, headers: corsHeaders }
      );
    }

    const updatedMatches: number[] = [];

    for (const change of payload) {
      if (change.type === "tournament" && Array.isArray(change.object?.matches)) {
        for (const match of change.object.matches) {
          const matchId = match.id;

          const { data: existingMatch, error: fetchError } = await supabase
            .from("pandascore_matches")
            .select("*")
            .eq("match_id", matchId)
            .maybeSingle();

          if (fetchError) {
            console.error(`❌ Error fetching match ${matchId}`, fetchError);
            continue;
          }

          if (!existingMatch) {
            console.log(`⚠️ Match ${matchId} not found in DB. Skipping.`);
            continue;
          }

          const dbModified = new Date(existingMatch.modified_at).getTime();
          const apiModified = new Date(match.modified_at).getTime();

          if (apiModified > dbModified) {
            const { error: updateError } = await supabase
              .from("pandascore_matches")
              .update({
                name: match.name,
                status: match.status,
                begin_at: match.begin_at,
                end_at: match.end_at,
                winner_id: match.winner_id,
                scheduled_at: match.scheduled_at,
                original_scheduled_at: match.original_scheduled_at,
                modified_at: match.modified_at,
                slug: match.slug,
                streams_list: match.streams_list,
                number_of_games: match.number_of_games,
                rescheduled: match.rescheduled,
                match_type: match.match_type,
              })
              .eq("match_id", matchId);

            if (updateError) {
              console.error(`❌ Failed to update match ${matchId}`, updateError);
              continue;
            }

            console.log(`✅ Match ${matchId} updated`);
            updatedMatches.push(matchId);
          } else {
            console.log(`⏭️ Match ${matchId} unchanged`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${updatedMatches.length} updated match(es).`,
        updatedMatches,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error.message || error.toString() }),
      { status: 500, headers: corsHeaders }
    );
  }
});
