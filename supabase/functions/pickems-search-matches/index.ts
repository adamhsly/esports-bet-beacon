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
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin
    const { data: roleRow } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const tournamentId = url.searchParams.get('tournament_id');
    const tournamentName = url.searchParams.get('tournament_name');
    const esport = url.searchParams.get('esport_type');
    const fromDate = url.searchParams.get('from');
    const toDate = url.searchParams.get('to');
    const status = url.searchParams.get('status') ?? 'not_started';
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10), 500);

    let query = userClient
      .from('pandascore_matches')
      .select('match_id, esport_type, teams, start_time, tournament_id, tournament_name, league_name, status, slug, number_of_games')
      .order('start_time', { ascending: true })
      .limit(limit);

    if (tournamentId) query = query.eq('tournament_id', tournamentId);
    if (tournamentName) query = query.ilike('tournament_name', `%${tournamentName}%`);
    if (esport) query = query.eq('esport_type', esport);
    if (status && status !== 'all') query = query.eq('status', status);
    if (fromDate) query = query.gte('start_time', fromDate);
    if (toDate) query = query.lte('start_time', toDate);

    const { data, error } = await query;
    if (error) throw error;

    return new Response(JSON.stringify({ matches: data ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('search error', e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
