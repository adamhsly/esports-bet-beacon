// Supabase Edge Function: image-proxy
// Fetches an external image and returns it with permissive CORS headers
// Usage: GET /?url=https%3A%2F%2Fexample.com%2Fimage.png

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

const ALLOWED_HOSTS = new Set<string>([
  "distribution.faceit-cdn.net",
  "raw.githubusercontent.com",
  "images.sportdevs.com",
]);

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const target = searchParams.get("url");
    if (!target) {
      return new Response("Missing 'url' parameter", { status: 400, headers: corsHeaders });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid URL", { status: 400, headers: corsHeaders });
    }

    // Security: restrict which hosts we proxy
    if (!ALLOWED_HOSTS.has(targetUrl.hostname)) {
      return new Response("Host not allowed", { status: 403, headers: corsHeaders });
    }

    const upstream = await fetch(targetUrl.toString(), {
      // Some CDNs require a UA header
      headers: { "User-Agent": "fragsandfortunes-image-proxy/1.0" },
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502, headers: corsHeaders });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "content-type": contentType,
        // Cache aggressively to speed up repeated renders
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return new Response(`Proxy error: ${e instanceof Error ? e.message : String(e)}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});