import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { matchId, recalculateAll = false } = await req.json()

    if (!matchId) {
      return new Response(
        JSON.stringify({ error: 'matchId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the target match details
    const { data: targetMatch, error: matchError } = await supabaseClient
      .from('pandascore_matches')
      .select('match_id, start_time, esport_type, teams')
      .eq('match_id', matchId)
      .single()

    if (matchError || !targetMatch) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const matchStartTime = targetMatch.start_time
    const esportType = targetMatch.esport_type
    const teams = targetMatch.teams as any[]

    // Extract team IDs from the teams array
    const teamIds = teams.map(team => {
      if (team.opponent && team.opponent.id) {
        return team.opponent.id.toString()
      }
      return team.id?.toString() || team.team_id?.toString()
    }).filter(Boolean)

    console.log(`Calculating stats for match ${matchId}, teams:`, teamIds)

    const statsResults: TeamStatsData[] = []

    // Calculate stats for each team
    for (const teamId of teamIds) {
      // Check if stats already exist and don't need recalculation
      if (!recalculateAll) {
        const { data: existingStats } = await supabaseClient
          .from('pandascore_match_team_stats')
          .select('*')
          .eq('match_id', matchId)
          .eq('team_id', teamId)
          .single()

        if (existingStats) {
          console.log(`Stats already exist for team ${teamId} in match ${matchId}`)
          continue
        }
      }

      // Get all matches for this team BEFORE the target match start time
      const { data: historicalMatches, error: historyError } = await supabaseClient
        .from('pandascore_matches')
        .select('*')
        .eq('esport_type', esportType)
        .lt('start_time', matchStartTime)
        .eq('status', 'finished')
        .order('start_time', { ascending: true })

      if (historyError) {
        console.error(`Error fetching historical matches for team ${teamId}:`, historyError)
        continue
      }

      // Filter matches where this team participated
      const teamMatches = historicalMatches?.filter(match => {
        const matchTeams = match.teams as any[]
        return matchTeams.some(team => {
          const id = team.opponent?.id?.toString() || team.id?.toString() || team.team_id?.toString()
          return id === teamId
        })
      }) || []

      console.log(`Found ${teamMatches.length} historical matches for team ${teamId}`)

      // Calculate statistics
      const stats = calculateTeamStatistics(teamId, teamMatches, matchStartTime)
      
      // Store the calculated stats
      const { error: insertError } = await supabaseClient
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
          calculated_at: new Date().toISOString()
        })

      if (insertError) {
        console.error(`Error storing stats for team ${teamId}:`, insertError)
      } else {
        console.log(`Successfully stored stats for team ${teamId}`)
        statsResults.push(stats)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchId,
        calculatedTeams: teamIds.length,
        message: `Calculated stats for ${statsResults.length} teams` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in calculate-match-team-statistics:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateTeamStatistics(teamId: string, matches: any[], matchStartTime: string): TeamStatsData {
  const totalMatches = matches.length
  let wins = 0
  let tournamentWins = 0
  const leaguePerformance: Record<string, { wins: number, total: number }> = {}
  
  // Get matches from last 30 days before the target match
  const thirtyDaysAgo = new Date(matchStartTime)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  let recentMatches30d = 0
  let recentWins30d = 0
  
  // Get last 10 matches for recent form
  const last10Matches = matches.slice(-10)
  const recentFormArray: string[] = []
  const last10MatchesDetail: any[] = []

  matches.forEach(match => {
    const isWin = match.winner_id === teamId
    if (isWin) wins++

    // Check if it's a tournament win (could be determined by tournament type or match importance)
    if (isWin && (match.tournament_name?.toLowerCase().includes('championship') || 
                  match.tournament_name?.toLowerCase().includes('major') ||
                  match.league_name?.toLowerCase().includes('championship'))) {
      tournamentWins++
    }

    // League performance tracking
    const leagueName = match.league_name || match.tournament_name || 'Unknown'
    if (!leaguePerformance[leagueName]) {
      leaguePerformance[leagueName] = { wins: 0, total: 0 }
    }
    leaguePerformance[leagueName].total++
    if (isWin) leaguePerformance[leagueName].wins++

    // Recent 30 days performance
    const matchDate = new Date(match.start_time)
    if (matchDate >= thirtyDaysAgo) {
      recentMatches30d++
      if (isWin) recentWins30d++
    }
  })

  // Calculate recent form from last 10 matches
  last10Matches.forEach(match => {
    const isWin = match.winner_id === teamId
    recentFormArray.push(isWin ? 'W' : 'L')
    
    last10MatchesDetail.push({
      matchId: match.match_id,
      opponent: getOpponentName(teamId, match.teams),
      result: isWin ? 'W' : 'L',
      date: match.start_time,
      tournament: match.tournament_name || match.league_name
    })
  })

  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const recentWinRate30d = recentMatches30d > 0 ? Math.round((recentWins30d / recentMatches30d) * 100) : 0
  const recentForm = recentFormArray.join('')

  return {
    teamId,
    winRate,
    recentForm,
    tournamentWins,
    totalMatches,
    wins,
    losses: totalMatches - wins,
    leaguePerformance,
    recentWinRate30d,
    last10MatchesDetail
  }
}

function getOpponentName(teamId: string, teams: any[]): string {
  const opponent = teams.find(team => {
    const id = team.opponent?.id?.toString() || team.id?.toString() || team.team_id?.toString()
    return id !== teamId
  })
  
  return opponent?.opponent?.name || opponent?.name || 'Unknown'
}