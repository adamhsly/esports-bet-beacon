import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET" && req.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const u = new URL(req.url);
  const target = u.searchParams.get("url");
  if (!target) return new Response("Missing url", { status: 400, headers: cors });

  try {
    const r = await fetch(target, {
      redirect: "follow",
      headers: { "Accept": "image/*,*/*" },
    });
    if (!r.ok) return new Response(`Upstream ${r.status}`, { status: 502, headers: cors });

    // HEAD should not stream the body
    if (req.method === "HEAD") {
      return new Response(null, {
        headers: {
          ...cors,
          "Content-Type": r.headers.get("content-type") ?? "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    return new Response(r.body, {
      headers: {
        ...cors,
        "Content-Type": r.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e) {
    return new Response(`Fetch error: ${String(e)}`, { status: 500, headers: cors });
  }
});
