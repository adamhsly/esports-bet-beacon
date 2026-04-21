import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const service = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let targetSlateId: string | null = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        targetSlateId = body?.slate_id ?? null;
      } catch (_) {
        targetSlateId = null;
      }
    }

    // Active slates to consider
    const slatesQ = service
      .from('pickems_slates')
      .select('id, status')
      .in('status', ['published', 'closed']);
    if (targetSlateId) slatesQ.eq('id', targetSlateId);
    const { data: slates, error: slatesErr } = await slatesQ;
    if (slatesErr) throw slatesErr;

    let totalSettled = 0;
    const settledPerSlate: Record<string, number> = {};

    for (const slate of slates ?? []) {
      // Get unsettled picks for this slate
      const { data: picks, error: picksErr } = await service
        .from('pickems_picks')
        .select('id, match_id, picked_team_id, entry_id, is_correct')
        .eq('slate_id', slate.id)
        .is('is_correct', null);
      if (picksErr) throw picksErr;
      if (!picks || picks.length === 0) continue;

      const matchIds = Array.from(new Set(picks.map((p: any) => p.match_id)));
      const { data: matches } = await service
        .from('pandascore_matches')
        .select('match_id, status, winner_id, draw, forfeit')
        .in('match_id', matchIds);

      const matchMap = new Map<string, any>();
      (matches ?? []).forEach((m: any) => matchMap.set(m.match_id, m));

      const updates: Array<{ id: string; is_correct: boolean; points_awarded: number; locked_at: string }> = [];
      const now = new Date().toISOString();

      for (const pick of picks as any[]) {
        const m = matchMap.get(pick.match_id);
        if (!m) continue;
        const finished = m.status === 'finished' || (m.status === 'cancelled' && m.winner_id);
        if (!finished) continue;

        // Draw or no winner => 0 points to all
        if (m.draw || !m.winner_id) {
          updates.push({ id: pick.id, is_correct: false, points_awarded: 0, locked_at: now });
          continue;
        }

        const isCorrect = String(pick.picked_team_id) === String(m.winner_id);
        updates.push({
          id: pick.id,
          is_correct: isCorrect,
          points_awarded: isCorrect ? 1 : 0,
          locked_at: now,
        });
      }

      // Apply updates one row at a time (simple; volume is low)
      for (const u of updates) {
        await service
          .from('pickems_picks')
          .update({ is_correct: u.is_correct, points_awarded: u.points_awarded, locked_at: u.locked_at })
          .eq('id', u.id);
      }

      settledPerSlate[slate.id] = updates.length;
      totalSettled += updates.length;

      // Recompute entry totals for any entry touched in this slate
      const { data: entries } = await service
        .from('pickems_entries')
        .select('id')
        .eq('slate_id', slate.id);

      for (const e of entries ?? []) {
        const { data: entryPicks } = await service
          .from('pickems_picks')
          .select('is_correct, points_awarded')
          .eq('entry_id', e.id);

        const settled = (entryPicks ?? []).filter((p: any) => p.is_correct !== null);
        const correct = settled.filter((p: any) => p.is_correct === true).length;
        const total_score = settled.reduce((s: number, p: any) => s + (p.points_awarded ?? 0), 0);

        await service
          .from('pickems_entries')
          .update({
            correct_picks: correct,
            total_picks: settled.length,
            total_score,
          })
          .eq('id', e.id);
      }

      // If all slate matches finished, mark slate settled
      const { data: allSlateMatches } = await service
        .from('pickems_slate_matches')
        .select('match_id')
        .eq('slate_id', slate.id);

      const allIds = (allSlateMatches ?? []).map((r: any) => r.match_id);
      if (allIds.length > 0) {
        const { data: pmAll } = await service
          .from('pandascore_matches')
          .select('match_id, status')
          .in('match_id', allIds);
        const allDone = (pmAll ?? []).length === allIds.length &&
          (pmAll ?? []).every((m: any) => m.status === 'finished' || m.status === 'cancelled');
        if (allDone && slate.status !== 'settled') {
          await service.from('pickems_slates').update({ status: 'settled' }).eq('id', slate.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, total_settled: totalSettled, per_slate: settledPerSlate }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('settle error', e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
