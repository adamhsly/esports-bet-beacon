import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Compute streak bonus: +2 pts for every group of 3 consecutive correct picks
// (in display_order). 3 in a row = +2, 6 in a row = +4, etc.
function computeStreakBonus(correctSequence: boolean[]): { bonus: number; longest: number } {
  let longest = 0;
  let current = 0;
  let bonus = 0;
  for (const c of correctSequence) {
    if (c) {
      current += 1;
      longest = Math.max(longest, current);
      // Award +2 each time current crosses a multiple of 3 (3, 6, 9...)
      if (current % 3 === 0) bonus += 2;
    } else {
      current = 0;
    }
  }
  return { bonus, longest };
}

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

    const slatesQ = service
      .from('pickems_slates')
      .select('id, status, tiebreaker_match_id')
      .in('status', ['published', 'closed']);
    if (targetSlateId) slatesQ.eq('id', targetSlateId);
    const { data: slates, error: slatesErr } = await slatesQ;
    if (slatesErr) throw slatesErr;

    let totalSettled = 0;
    const settledPerSlate: Record<string, number> = {};

    for (const slate of slates ?? []) {
      // Settle unsettled picks
      const { data: picks, error: picksErr } = await service
        .from('pickems_picks')
        .select('id, match_id, picked_team_id, entry_id, is_correct')
        .eq('slate_id', slate.id)
        .is('is_correct', null);
      if (picksErr) throw picksErr;

      const matchIdsToSettle = Array.from(new Set((picks ?? []).map((p: any) => p.match_id)));
      const matchMap = new Map<string, any>();
      if (matchIdsToSettle.length > 0) {
        const { data: matches } = await service
          .from('pandascore_matches')
          .select('match_id, status, winner_id, draw, forfeit, results, number_of_games')
          .in('match_id', matchIdsToSettle);
        (matches ?? []).forEach((m: any) => matchMap.set(m.match_id, m));
      }

      const now = new Date().toISOString();
      const updates: Array<{ id: string; is_correct: boolean; points_awarded: number; locked_at: string }> = [];

      for (const pick of (picks ?? []) as any[]) {
        const m = matchMap.get(pick.match_id);
        if (!m) continue;
        const finished = m.status === 'finished' || (m.status === 'cancelled' && m.winner_id);
        if (!finished) continue;

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

      for (const u of updates) {
        await service
          .from('pickems_picks')
          .update({ is_correct: u.is_correct, points_awarded: u.points_awarded, locked_at: u.locked_at })
          .eq('id', u.id);
      }

      settledPerSlate[slate.id] = updates.length;
      totalSettled += updates.length;

      // Compute tiebreaker actual (sum of map wins across both teams in the tiebreaker match)
      let tiebreakerActual: number | null = null;
      if (slate.tiebreaker_match_id) {
        const { data: tbMatch } = await service
          .from('pandascore_matches')
          .select('match_id, status, results, number_of_games')
          .eq('match_id', slate.tiebreaker_match_id)
          .maybeSingle();
        if (tbMatch && tbMatch.status === 'finished') {
          const results = Array.isArray(tbMatch.results) ? tbMatch.results : [];
          const total = results.reduce((s: number, r: any) => s + (Number(r?.score) || 0), 0);
          if (total > 0) tiebreakerActual = total;
        }
      }

      // Get slate match display order
      const { data: slateMatchOrder } = await service
        .from('pickems_slate_matches')
        .select('match_id, display_order')
        .eq('slate_id', slate.id)
        .order('display_order', { ascending: true });
      const orderIndex = new Map<string, number>();
      (slateMatchOrder ?? []).forEach((r: any, i: number) => orderIndex.set(r.match_id, r.display_order ?? i));

      // Recompute totals + streak bonus for every entry in this slate
      const { data: entries } = await service
        .from('pickems_entries')
        .select('id, tiebreaker_total_maps')
        .eq('slate_id', slate.id);

      for (const e of entries ?? []) {
        const { data: entryPicks } = await service
          .from('pickems_picks')
          .select('match_id, is_correct, points_awarded')
          .eq('entry_id', e.id);

        const settled = (entryPicks ?? []).filter((p: any) => p.is_correct !== null);
        const correct = settled.filter((p: any) => p.is_correct === true).length;
        const basePoints = settled.reduce((s: number, p: any) => s + (p.points_awarded ?? 0), 0);

        // Order settled picks by display_order to compute streak fairly
        const orderedSettled = [...settled].sort((a: any, b: any) => {
          return (orderIndex.get(a.match_id) ?? 0) - (orderIndex.get(b.match_id) ?? 0);
        });
        const { bonus: streakBonus, longest } = computeStreakBonus(
          orderedSettled.map((p: any) => p.is_correct === true)
        );

        const tiebreakerDelta =
          tiebreakerActual !== null && (e as any).tiebreaker_total_maps != null
            ? Math.abs(Number((e as any).tiebreaker_total_maps) - tiebreakerActual)
            : null;

        await service
          .from('pickems_entries')
          .update({
            correct_picks: correct,
            total_picks: settled.length,
            total_score: basePoints + streakBonus,
            streak_bonus: streakBonus,
            longest_streak: longest,
            tiebreaker_actual: tiebreakerActual,
            tiebreaker_delta: tiebreakerDelta,
          })
          .eq('id', e.id);
      }

      // Mark slate settled if all matches finished
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
