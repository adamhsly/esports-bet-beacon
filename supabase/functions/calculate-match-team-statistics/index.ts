import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TeamStatsData {
  teamId: string;
  winRate: number;
  recentForm: string;
  tournamentWins: number;
  totalMatches: number;
  wins: number;
  losses: number;
  leaguePerformance: Record<string, any>;
  recentWinRate30d: number;
  last10MatchesDetail: any[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Fetch all matches from pandascore_matches
    const { data: allMatches, error } = await supabase
      .from('pandascore_matches')
      .select('match_id, start_time, esport_type, teams, status')
      .neq('status', 'not_started');

    if (error || !allMatches) {
      throw new Error('Failed to fetch matches: ' + error?.message);
    }

    let processedCount = 0;

    for (const match of allMatches) {
      const matchId = match.match_id;
      const matchStartTime = match.start_time;
      const esportType = match.esport_type;
      const teams = match.teams as any[];

      const teamIds = teams.map(team =>
        team.opponent?.id?.toString() || team.id?.toString() || team.team_id?.toString()
      ).filter(Boolean);

      console.log(`Processing match ${matchId} | Teams: ${teamIds.join(', ')}`);

      for (const teamId of teamIds) {
        // Check if stats already exist
        const { data: existingStats } = await supabase
          .from('pandascore_match_team_stats')
          .select('id')
          .eq('match_id', matchId)
          .eq('team_id', teamId)
          .maybeSingle();

        if (existingStats) {
          console.log(`  Skipping team ${teamId}, already processed`);
          continue;
        }

        // Get historical matches for this esport type before the match
        const { data: historicalMatches, error: historyError } = await supabase
          .from('pandascore_matches')
          .select('*')
          .eq('esport_type', esportType)
          .lt('start_time', matchStartTime)
          .eq('status', 'finished')
          .order('start_time', { ascending: true });

        if (historyError || !historicalMatches) {
          console.error(`  Error fetching history for team ${teamId}:`, historyError);
          continue;
        }

        const teamMatches = historicalMatches.filter(hm => {
          const hTeams = hm.teams as any[];
          return hTeams.some(t => (
            t.opponent?.id?.toString() === teamId ||
            t.id?.toString() === teamId ||
            t.team_id?.toString() === teamId
          ));
        });

        const stats = calculateTeamStatistics(teamId, teamMatches, matchStartTime);

        const { error: insertError } = await supabase
          .from('pandascore_match_team_stats')
          .upsert({
            match_id: matchId,
            team_id: teamId,
            esport_type: esportType,
            win_rate: stats.winRate,
            recent_form: stats.recentForm,
            tournament_wins: stats.tournamentWins,
            total_matches: stats.totalMatches,
            wins: stats.wins,
            losses: stats.losses,
            league_performance: stats.leaguePerformance,
            recent_win_rate_30d: stats.recentWinRate30d,
            last_10_matches_detail: stats.last10MatchesDetail,
            calculated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`  Error storing stats for team ${teamId}:`, insertError);
        } else {
          console.log(`  Stored stats for team ${teamId}`);
          processedCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateTeamStatistics(teamId: string, matches: any[], matchStartTime: string): TeamStatsData {
  const totalMatches = matches.length;
  let wins = 0;
  let tournamentWins = 0;
  const leaguePerformance: Record<string, { wins: number, total: number }> = {};

  const thirtyDaysAgo = new Date(matchStartTime);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let recentMatches30d = 0;
  let recentWins30d = 0;

  const last10Matches = matches.slice(-10);
  const recentFormArray: string[] = [];
  const last10MatchesDetail: any[] = [];

  for (const match of matches) {
    const isWin = match.winner_id === teamId;
    if (isWin) wins++;

    const isMajor = match.tournament_name?.toLowerCase().includes('championship') ||
                    match.tournament_name?.toLowerCase().includes('major') ||
                    match.league_name?.toLowerCase().includes('championship');

    if (isWin && isMajor) tournamentWins++;

    const leagueName = match.league_name || match.tournament_name || 'Unknown';
    if (!leaguePerformance[leagueName]) {
      leaguePerformance[leagueName] = { wins: 0, total: 0 };
    }
    leaguePerformance[leagueName].total++;
    if (isWin) leaguePerformance[leagueName].wins++;

    const matchDate = new Date(match.start_time);
    if (matchDate >= thirtyDaysAgo) {
      recentMatches30d++;
      if (isWin) recentWins30d++;
    }
  }

  last10Matches.forEach(match => {
    const isWin = match.winner_id === teamId;
    recentFormArray.push(isWin ? 'W' : 'L');

    last10MatchesDetail.push({
      matchId: match.match_id,
      opponent: getOpponentName(teamId, match.teams),
      result: isWin ? 'W' : 'L',
      date: match.start_time,
      tournament: match.tournament_name || match.league_name,
    });
  });

  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const recentWinRate30d = recentMatches30d > 0 ? Math.round((recentWins30d / recentMatches30d) * 100) : 0;

  return {
    teamId,
    winRate,
    recentForm: recentFormArray.join(''),
    tournamentWins,
    totalMatches,
    wins,
    losses: totalMatches - wins,
    leaguePerformance,
    recentWinRate30d,
    last10MatchesDetail,
  };
}

function getOpponentName(teamId: string, teams: any[]): string {
  const opponent = teams.find(team => {
    const id = team.opponent?.id?.toString() || team.id?.toString() || team.team_id?.toString();
    return id !== teamId;
  });

  return opponent?.opponent?.name || opponent?.name || 'Unknown';
}
