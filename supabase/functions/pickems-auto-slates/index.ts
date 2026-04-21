import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tier S and A only (per user choice)
const ALLOWED_TIERS = new Set(['s', 'a']);

interface Tournament {
  tournament_id: string;
  name: string | null;
  esport_type: string | null;
  start_date: string;
  end_date: string;
  raw_data: any;
}

interface Match {
  match_id: string;
  start_time: string;
  status: string;
  number_of_games: number | null;
  teams: any;
  tournament_id: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const result = {
    tournaments_scanned: 0,
    slates_created: 0,
    slates_updated: 0,
    slates_reopened: 0,
    slates_locked: 0,
    matches_attached: 0,
    errors: [] as string[],
  };

  try {
    const nowIso = new Date().toISOString();

    // 1. Pull active S/A tier tournaments (still ongoing or starting soon)
    const { data: tournaments, error: tErr } = await supabase
      .from('pandascore_tournaments')
      .select('tournament_id, name, esport_type, start_date, end_date, raw_data')
      .gt('end_date', nowIso)
      .lte('start_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(500);

    if (tErr) throw tErr;

    const eligible = (tournaments ?? []).filter((t: Tournament) => {
      const tier = String(t.raw_data?.tier ?? '').toLowerCase();
      return ALLOWED_TIERS.has(tier);
    });

    result.tournaments_scanned = eligible.length;

    for (const tour of eligible) {
      try {
        // Pull UPCOMING matches for this tournament with at least 2 opponents
        const { data: matches } = await supabase
          .from('pandascore_matches')
          .select('match_id, start_time, status, number_of_games, teams, tournament_id')
          .eq('tournament_id', tour.tournament_id)
          .gt('start_time', nowIso)
          .order('start_time', { ascending: true });

        const validMatches = (matches ?? []).filter((m: Match) => {
          const opponents = Array.isArray(m.teams) ? m.teams : [];
          return opponents.length >= 2 && opponents[0]?.opponent?.id && opponents[1]?.opponent?.id;
        });

        if (validMatches.length === 0) continue;

        const firstStart = validMatches[0].start_time;
        const lastStart = validMatches[validMatches.length - 1].start_time;
        const tiebreakerMatchId = validMatches[validMatches.length - 1].match_id;

        // Check existing auto-slate for this tournament
        const { data: existing } = await supabase
          .from('pickems_slates')
          .select('id, status, start_date, end_date')
          .eq('source_tournament_id', tour.tournament_id)
          .eq('auto_generated', true)
          .maybeSingle();

        let slateId: string;

        if (!existing) {
          // Create new auto-slate (open immediately)
          const { data: created, error: cErr } = await supabase
            .from('pickems_slates')
            .insert({
              name: tour.name ? `${tour.name}` : `Tournament ${tour.tournament_id}`,
              description: `Auto-generated Pick'ems slate for ${tour.name ?? 'tournament'}.`,
              tournament_id: tour.tournament_id,
              tournament_name: tour.name,
              esport_type: tour.esport_type,
              start_date: firstStart,
              end_date: lastStart,
              status: 'published',
              auto_generated: true,
              source_tournament_id: tour.tournament_id,
              tiebreaker_match_id: tiebreakerMatchId,
            })
            .select('id')
            .single();

          if (cErr) throw cErr;
          slateId = created!.id;
          result.slates_created++;
        } else {
          slateId = existing.id;
          // Re-open if it was prematurely closed but still has upcoming matches
          const shouldReopen = existing.status === 'closed';
          await supabase
            .from('pickems_slates')
            .update({
              start_date: firstStart,
              end_date: lastStart,
              tiebreaker_match_id: tiebreakerMatchId,
              ...(shouldReopen ? { status: 'published' } : {}),
              updated_at: nowIso,
            })
            .eq('id', slateId);
          if (shouldReopen) result.slates_reopened++;
          else result.slates_updated++;
        }

        // Sync matches: insert any not yet attached
        const { data: existingLinks } = await supabase
          .from('pickems_slate_matches')
          .select('match_id')
          .eq('slate_id', slateId);

        const existingIds = new Set((existingLinks ?? []).map((l: any) => l.match_id));
        const toInsert = validMatches
          .filter((m) => !existingIds.has(m.match_id))
          .map((m, idx) => ({
            slate_id: slateId,
            match_id: m.match_id,
            display_order: existingIds.size + idx,
          }));

        if (toInsert.length > 0) {
          const { error: linkErr } = await supabase
            .from('pickems_slate_matches')
            .insert(toInsert);
          if (linkErr) {
            result.errors.push(`link ${tour.tournament_id}: ${linkErr.message}`);
          } else {
            result.matches_attached += toInsert.length;
          }
        }
      } catch (e: any) {
        result.errors.push(`tournament ${tour.tournament_id}: ${e?.message ?? String(e)}`);
      }
    }

    // 2. Close auto-slates whose first upcoming match has started
    const { data: openAutoSlates } = await supabase
      .from('pickems_slates')
      .select('id, start_date')
      .eq('auto_generated', true)
      .eq('status', 'published')
      .lte('start_date', nowIso);

    if (openAutoSlates && openAutoSlates.length > 0) {
      const ids = openAutoSlates.map((s: any) => s.id);
      const { error: lockErr } = await supabase
        .from('pickems_slates')
        .update({ status: 'closed', updated_at: nowIso })
        .in('id', ids);
      if (lockErr) {
        result.errors.push(`lock: ${lockErr.message}`);
      } else {
        result.slates_locked = ids.length;
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('pickems-auto-slates error', e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message ?? String(e), ...result }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
