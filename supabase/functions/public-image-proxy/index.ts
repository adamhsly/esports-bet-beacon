import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400, headers: cors });

  try {
    // Only allow http/https
    const tu = new URL(target);
    if (tu.protocol !== "https:" && tu.protocol !== "http:") {
      return new Response("Invalid protocol", { status: 400, headers: cors });
    }

    // Stream upstream bytes back to the browser
    const upstream = await fetch(target, { redirect: "follow" });
    if (!upstream.ok || !upstream.body) {
      return new Response(`Upstream ${upstream.status}`, { status: 502, headers: cors });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    return new Response(upstream.body, {
      headers: {
        ...cors,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`Fetch error: ${String(e)}`, { status: 500, headers: cors });
  }
});
