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
    const { page_url, referrer } = await req.json();

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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("page_views")
      .insert({
        page_url,
        referrer: normalizedReferrer,
      });

    if (error) {
      console.error("Failed to insert page view:", error);
      return new Response(
        JSON.stringify({ error: "Failed to record page view" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Page view recorded: ${page_url} | referrer: ${normalizedReferrer}`);

    return new Response(
      JSON.stringify({ success: true }),
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
