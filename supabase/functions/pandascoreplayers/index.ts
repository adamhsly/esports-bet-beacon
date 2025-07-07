// supabase/functions/fetch_players/index.ts
import { serve } from "https://deno.land/std/http/server.ts";

serve(async (_req) => {
  const PANDA_TOKEN = Deno.env.get("PANDA_API_KEY")!;
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const apiUrl = "https://api.pandascore.co/players?page=1&per_page=50";
  const pandaRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${PANDA_TOKEN}`,
    },
  });

  if (!pandaRes.ok) {
    return new Response(
      JSON.stringify({ error: "Failed to fetch players" }),
      { status: 500 }
    );
  }

  const players = await pandaRes.json();

  const transformed = players.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    first_name: p.first_name,
    last_name: p.last_name,
    nationality: p.nationality,
    role: p.role,
    age: p.age,
    birthday: p.birthday,
    active: p.active,
    image_url: p.image_url,
    modified_at: p.modified_at,
    current_team: p.current_team || null,
    current_videogame: p.current_videogame || null,
  }));

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/players`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(transformed),
  });

  if (!insertRes.ok) {
    const errorDetails = await insertRes.text();
    return new Response(
      JSON.stringify({ error: "Insert failed", details: errorDetails }),
      { status: 500 }
    );
  }

  return new Response(
    JSON.stringify({ message: "Players inserted", count: transformed.length }),
    { headers: { "Content-Type": "application/json" } }
  );
});
