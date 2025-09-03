import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const ALLOWED_HOSTS = new Set([
  "distribution.faceit-cdn.net",
  "cdn.pandascore.co",
  "images.pandascore.co",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400, headers: cors });

  let t: URL;
  try {
    t = new URL(target);
  } catch {
    return new Response("Invalid url", { status: 400, headers: cors });
  }

  if (!ALLOWED_HOSTS.has(t.host)) {
    return new Response("Host not allowed", { status: 403, headers: cors });
  }

  try {
    const r = await fetch(t.href, { redirect: "follow" });
    if (!r.ok) return new Response(`Upstream ${r.status}`, { status: 502, headers: cors });

    return new Response(r.body, {
      headers: {
        ...cors,
        "Content-Type": r.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
        "Vary": "Origin",
      },
    });
  } catch (e) {
    return new Response(`Fetch error: ${String(e)}`, { status: 500, headers: cors });
  }
});
