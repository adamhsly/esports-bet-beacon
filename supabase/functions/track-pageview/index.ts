import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const { page_url, referrer, id, fully_loaded } = body;
    
    console.log(`[track-pageview] Request received:`, JSON.stringify({ page_url: page_url?.substring(0, 100), referrer, id, fully_loaded }));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // If id is provided, update the existing record to mark as fully loaded
    if (id && fully_loaded === true) {
      console.log(`[track-pageview] Attempting to mark ${id} as fully_loaded`);
      
      const { data: updateData, error } = await supabase
        .from("page_views")
        .update({ fully_loaded: true })
        .eq("id", id)
        .select();

      if (error) {
        console.error(`[track-pageview] Failed to update page view ${id}:`, error);
        return new Response(
          JSON.stringify({ error: "Failed to update page view" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[track-pageview] Successfully marked ${id} as fully_loaded. Rows updated: ${updateData?.length ?? 0}`);
      return new Response(
        JSON.stringify({ success: true, updated: updateData?.length ?? 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Otherwise, create a new page view record
    if (!page_url || typeof page_url !== "string") {
      return new Response(
        JSON.stringify({ error: "page_url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize referrer: if it contains tiktok.com, set to "tiktok"
    let normalizedReferrer = referrer || null;
    if (normalizedReferrer && typeof normalizedReferrer === "string") {
      if (normalizedReferrer.toLowerCase().includes("tiktok.com")) {
        normalizedReferrer = "tiktok";
      }
    }

    const { data, error } = await supabase
      .from("page_views")
      .insert({
        page_url,
        referrer: normalizedReferrer,
        fully_loaded: false,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to insert page view:", error);
      return new Response(
        JSON.stringify({ error: "Failed to record page view" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Page view recorded: ${page_url} | referrer: ${normalizedReferrer} | id: ${data.id}`);

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("track-pageview error:", err);
    return new Response(
      JSON.stringify({ error: err?.message ?? "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
