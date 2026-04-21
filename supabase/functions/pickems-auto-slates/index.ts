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
    seeded_slates: 0,
    errors: [] as string[],
  };

  const newlyCreatedSlateIds: string[] = [];

  try {
    const nowIso = new Date().toISOString();

    // 1a. Pull active S/A tier tournaments from the tournaments table
    const { data: tournaments, error: tErr } = await supabase
      .from('pandascore_tournaments')
      .select('tournament_id, name, esport_type, start_date, end_date, raw_data, league_name, serie_name')
      .gt('end_date', nowIso)
      .lte('start_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(500);

    if (tErr) throw tErr;

    const eligible = (tournaments ?? []).filter((t: any) => {
      const tier = String(t.raw_data?.tier ?? '').toLowerCase();
      return ALLOWED_TIERS.has(tier);
    });

    // 1b. Fallback: derive tournaments directly from upcoming matches when the
    //     tournament row is missing (some games like CS only sync match-level tier info).
    const { data: upcomingMatches } = await supabase
      .from('pandascore_matches')
      .select('tournament_id, esport_type, raw_data, start_time')
      .gt('start_time', nowIso)
      .lte('start_time', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(5000);

    const knownIds = new Set(eligible.map((t: any) => String(t.tournament_id)));
    const derivedMap = new Map<string, any>();

    for (const m of (upcomingMatches ?? []) as any[]) {
      if (!m.tournament_id) continue;
      const tid = String(m.tournament_id);
      if (knownIds.has(tid) || derivedMap.has(tid)) continue;

      const tier = String(m.raw_data?.tournament?.tier ?? '').toLowerCase();
      if (!ALLOWED_TIERS.has(tier)) continue;

      const tournamentBlock = m.raw_data?.tournament ?? {};
      const leagueBlock = m.raw_data?.league ?? {};
      const serieBlock = m.raw_data?.serie ?? {};

      // Normalize esport slug to match tournaments table style (lowercase, no spaces).
      const esportSlug = String(m.esport_type ?? '')
        .toLowerCase()
        .replace(/\s+/g, '-');

      derivedMap.set(tid, {
        tournament_id: tid,
        name: tournamentBlock.name ?? null,
        esport_type: esportSlug || null,
        start_date: tournamentBlock.begin_at ?? m.start_time,
        end_date: tournamentBlock.end_at ?? m.start_time,
        raw_data: { ...tournamentBlock, tier },
        league_name: leagueBlock.name ?? null,
        serie_name: serieBlock.name ?? null,
      });
    }

    const allEligible = [...eligible, ...Array.from(derivedMap.values())];
    result.tournaments_scanned = allEligible.length;

    // Build a clean tournament title: "League · Serie"; fall back to raw name
    const buildTournamentTitle = (t: any) => {
      const parts = [t.league_name, t.serie_name].filter((x: string | null) => x && String(x).trim().length > 0);
      return parts.length ? parts.join(' · ') : (t.name ?? `Tournament ${t.tournament_id}`);
    };
    const buildSlateName = (t: any) => {
      const title = buildTournamentTitle(t);
      const stage = t.name && t.name !== t.league_name && t.name !== t.serie_name ? t.name : null;
      return stage ? `${title} – ${stage}` : title;
    };

    for (const tour of allEligible) {
      try {
        const tournamentTitle = buildTournamentTitle(tour);
        const slateName = buildSlateName(tour);
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
          const { data: created, error: cErr } = await supabase
            .from('pickems_slates')
            .insert({
              name: slateName,
              description: `Auto-generated Pick'ems slate for ${tournamentTitle}.`,
              tournament_id: tour.tournament_id,
              tournament_name: tournamentTitle,
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
          newlyCreatedSlateIds.push(slateId);
          result.slates_created++;
        } else {
          slateId = existing.id;
          const shouldReopen = existing.status === 'closed';
          await supabase
            .from('pickems_slates')
            .update({
              name: slateName,
              tournament_name: tournamentTitle,
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

    // 2. Close auto-slates whose source tournament has ended OR has no upcoming matches left
    const { data: publishedAutoSlates } = await supabase
      .from('pickems_slates')
      .select('id, source_tournament_id, end_date')
      .eq('auto_generated', true)
      .eq('status', 'published');

    if (publishedAutoSlates && publishedAutoSlates.length > 0) {
      const toClose: string[] = [];
      for (const s of publishedAutoSlates as any[]) {
        // Close if tournament window ended
        if (s.end_date && s.end_date <= nowIso) {
          toClose.push(s.id);
          continue;
        }
        // Close if no upcoming matches remain in tournament
        if (s.source_tournament_id) {
          const { count } = await supabase
            .from('pandascore_matches')
            .select('match_id', { count: 'exact', head: true })
            .eq('tournament_id', s.source_tournament_id)
            .gt('start_time', nowIso);
          if (!count || count === 0) toClose.push(s.id);
        }
      }
      if (toClose.length > 0) {
        const { error: lockErr } = await supabase
          .from('pickems_slates')
          .update({ status: 'closed', updated_at: nowIso })
          .in('id', toClose);
        if (lockErr) result.errors.push(`lock: ${lockErr.message}`);
        else result.slates_locked = toClose.length;
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
