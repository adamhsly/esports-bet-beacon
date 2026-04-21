import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PickInput {
  match_id: string;
  picked_team_id: string;
  tiebreaker_total_maps?: number | null;
}

interface SubmitPicksRequest {
  slate_id: string;
  picks: PickInput[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: req.headers.get('Authorization')! } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: SubmitPicksRequest = await req.json();
    if (!body.slate_id || !Array.isArray(body.picks)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: slate, error: slateErr } = await supabaseClient
      .from('pickems_slates')
      .select('id, status, tiebreaker_match_id')
      .eq('id', body.slate_id)
      .maybeSingle();

    if (slateErr || !slate) {
      return new Response(JSON.stringify({ error: 'Slate not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['published', 'closed'].includes(slate.status)) {
      return new Response(JSON.stringify({ error: 'Slate not accepting picks' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const matchIds = body.picks.map(p => p.match_id);
    const { data: slateMatches } = await serviceClient
      .from('pickems_slate_matches')
      .select('match_id')
      .eq('slate_id', body.slate_id)
      .in('match_id', matchIds);

    const validIds = new Set((slateMatches ?? []).map((r: any) => r.match_id));
    const invalidPicks = body.picks.filter(p => !validIds.has(p.match_id));
    if (invalidPicks.length > 0) {
      return new Response(JSON.stringify({ error: 'Some matches not in slate', invalid: invalidPicks }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: pandaMatches } = await serviceClient
      .from('pandascore_matches')
      .select('match_id, start_time, status')
      .in('match_id', matchIds);

    const matchInfo = new Map<string, { start_time: string | null; status: string | null }>();
    (pandaMatches ?? []).forEach((m: any) => {
      matchInfo.set(m.match_id, { start_time: m.start_time, status: m.status });
    });

    const now = Date.now();
    const lockedMatches: string[] = [];
    const acceptedPicks: PickInput[] = [];
    let tiebreakerForEntry: number | null = null;

    for (const pick of body.picks) {
      const info = matchInfo.get(pick.match_id);
      if (!info) {
        lockedMatches.push(pick.match_id);
        continue;
      }
      const startMs = info.start_time ? new Date(info.start_time).getTime() : 0;
      const isLocked = startMs > 0 && startMs <= now;
      const finishedStatuses = ['finished', 'running', 'live', 'cancelled'];
      if (isLocked || (info.status && finishedStatuses.includes(info.status))) {
        lockedMatches.push(pick.match_id);
      } else {
        acceptedPicks.push(pick);
        if (
          slate.tiebreaker_match_id &&
          pick.match_id === slate.tiebreaker_match_id &&
          typeof pick.tiebreaker_total_maps === 'number'
        ) {
          tiebreakerForEntry = pick.tiebreaker_total_maps;
        }
      }
    }

    const entryUpdate: Record<string, unknown> = { slate_id: body.slate_id, user_id: user.id };
    if (tiebreakerForEntry !== null) entryUpdate.tiebreaker_total_maps = tiebreakerForEntry;

    const { data: entry, error: entryErr } = await serviceClient
      .from('pickems_entries')
      .upsert(entryUpdate, { onConflict: 'slate_id,user_id' })
      .select()
      .single();

    if (entryErr || !entry) {
      console.error('Entry upsert failed:', entryErr);
      return new Response(JSON.stringify({ error: 'Failed to create entry' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (acceptedPicks.length > 0) {
      const rows = acceptedPicks.map(p => ({
        entry_id: entry.id,
        slate_id: body.slate_id,
        match_id: p.match_id,
        picked_team_id: p.picked_team_id,
        tiebreaker_total_maps:
          slate.tiebreaker_match_id && p.match_id === slate.tiebreaker_match_id
            ? p.tiebreaker_total_maps ?? null
            : null,
      }));
      const { error: picksErr } = await serviceClient
        .from('pickems_picks')
        .upsert(rows, { onConflict: 'entry_id,match_id' });

      if (picksErr) {
        console.error('Picks upsert failed:', picksErr);
        return new Response(JSON.stringify({ error: 'Failed to save picks' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        accepted: acceptedPicks.length,
        rejected_locked: lockedMatches,
        entry_id: entry.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('Unexpected error:', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
