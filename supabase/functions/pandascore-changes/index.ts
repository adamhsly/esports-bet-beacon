// File: supabase/functions/update-match-changes/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const PANDA_SCORE_API_KEY = Deno.env.get("PANDA_SCORE_API_KEY");
    if (!PANDA_SCORE_API_KEY) {
      throw new Error("Missing PANDA_SCORE_API_KEY");
    }

    const response = await fetch("https://api.pandascore.co/changes", {
      headers: {
        Authorization: `Bearer ${PANDA_SCORE_API_KEY}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PandaScore API error: ${errorText}`);
    }

    const payload = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error("Expected payload to be an array");
    }

    const updatedMatches: number[] = [];

    for (const change of payload) {
      if (change.type !== "match") continue;

      const match = change.object;
      const match_id = match.id;

      const { data: existingMatch, error: fetchError } = await supabase
        .from("pandascore_matches")
        .select("*")
        .eq("match_id", match_id.toString())
        .maybeSingle();

      if (fetchError) {
        console.error(`Failed to fetch match ${match_id}:`, fetchError);
        continue;
      }

      // Skip if match does not exist in DB
      if (!existingMatch) continue;

      // Only update fields that changed
      const updatedFields: Record<string, any> = {};
      for (const key in match) {
        if (
          key in existingMatch &&
          JSON.stringify(match[key]) !== JSON.stringify(existingMatch[key])
        ) {
          updatedFields[key] = match[key];
        }
      }

      if (Object.keys(updatedFields).length === 0) continue;

      updatedFields.match_id = match_id.toString(); // Required for upsert
      updatedFields.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("pandascore_matches")
        .upsert(updatedFields, { onConflict: ["match_id"] });

      if (updateError) {
        console.error(`Error updating match ${match_id}:`, updateError);
      } else {
        console.log(`✅ Updated match ${match_id}`);
        updatedMatches.push(match_id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, updated_matches: updatedMatches }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("❌ Function error:", err);
    return new Response(
      JSON.stringify({ error: true, message: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
