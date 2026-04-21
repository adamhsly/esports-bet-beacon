// Seeds random Pick'ems entries from test users for a given slate.
// Picks a random N (1..1000 by default) test users and generates random
// match picks for them so leaderboards look populated for new slates.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    const body = await req.json().catch(() => ({}));
    const slateId: string | undefined = body?.slate_id;
    const minRequested = Number.isFinite(body?.min) ? Math.max(1, Math.floor(body.min)) : 1;
    const maxRequested = Number.isFinite(body?.max) ? Math.max(minRequested, Math.floor(body.max)) : 1000;

    if (!slateId) {
      return new Response(JSON.stringify({ error: 'slate_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Load slate matches (with team info from pandascore_matches)
    const { data: links, error: lErr } = await supabase
      .from('pickems_slate_matches')
      .select('match_id')
      .eq('slate_id', slateId);
    if (lErr) throw lErr;

    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted_entries: 0, reason: 'no matches' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matchIds = links.map((l: any) => l.match_id);
    const { data: matches, error: mErr } = await supabase
      .from('pandascore_matches')
      .select('match_id, teams')
      .in('match_id', matchIds);
    if (mErr) throw mErr;

    type MatchOpts = { match_id: string; team_ids: string[] };
    const playable: MatchOpts[] = (matches ?? [])
      .map((m: any) => {
        const opps = Array.isArray(m.teams) ? m.teams : [];
        const ids = opps
          .map((o: any) => o?.opponent?.id)
          .filter((id: any) => id !== undefined && id !== null)
          .map((id: any) => String(id));
        return { match_id: m.match_id, team_ids: ids };
      })
      .filter((m) => m.team_ids.length >= 2);

    if (playable.length === 0) {
      return new Response(JSON.stringify({ success: true, inserted_entries: 0, reason: 'no playable matches' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Pick a random target count between min and max
    const targetCount = minRequested + Math.floor(Math.random() * (maxRequested - minRequested + 1));

    // 3. Find test users who don't already have an entry on this slate
    const { data: existing } = await supabase
      .from('pickems_entries')
      .select('user_id')
      .eq('slate_id', slateId);
    const taken = new Set((existing ?? []).map((e: any) => e.user_id));

    const { data: testProfiles, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('test', true)
      .limit(2000);
    if (pErr) throw pErr;

    const candidates = (testProfiles ?? [])
      .map((p: any) => p.id as string)
      .filter((id) => !taken.has(id));

    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ success: true, inserted_entries: 0, reason: 'no available test users' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    shuffleInPlace(candidates);
    const chosen = candidates.slice(0, Math.min(targetCount, candidates.length));

    // 4. Build entry rows
    const nowIso = new Date().toISOString();
    const entryRows = chosen.map((uid) => ({
      slate_id: slateId,
      user_id: uid,
      total_picks: playable.length,
      submitted_at: nowIso,
    }));

    // Batched insert + return ids
    const insertedEntries: { id: string; user_id: string }[] = [];
    const ENTRY_BATCH = 200;
    for (let i = 0; i < entryRows.length; i += ENTRY_BATCH) {
      const chunk = entryRows.slice(i, i + ENTRY_BATCH);
      const { data, error } = await supabase
        .from('pickems_entries')
        .insert(chunk)
        .select('id, user_id');
      if (error) throw error;
      insertedEntries.push(...(data as any[]));
    }

    // 5. Build pick rows for each entry × match
    const pickRows: any[] = [];
    for (const entry of insertedEntries) {
      for (const m of playable) {
        const teamId = m.team_ids[Math.floor(Math.random() * m.team_ids.length)];
        pickRows.push({
          entry_id: entry.id,
          slate_id: slateId,
          match_id: m.match_id,
          picked_team_id: teamId,
          locked_at: nowIso,
        });
      }
    }

    const PICK_BATCH = 500;
    let pickInserted = 0;
    for (let i = 0; i < pickRows.length; i += PICK_BATCH) {
      const chunk = pickRows.slice(i, i + PICK_BATCH);
      const { error } = await supabase.from('pickems_picks').insert(chunk);
      if (error) throw error;
      pickInserted += chunk.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        slate_id: slateId,
        target_count: targetCount,
        inserted_entries: insertedEntries.length,
        inserted_picks: pickInserted,
        playable_matches: playable.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e: any) {
    console.error('pickems-seed-test-picks error', e);
    return new Response(JSON.stringify({ success: false, error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
