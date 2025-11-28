import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { team_id, team_type, round_id, user_id } = await req.json();
    
    console.log("get-team-match-breakdown called with:", { team_id, team_type, round_id, user_id });

    if (!team_id || !team_type || !round_id || !user_id) {
      console.error("Missing required parameters:", { team_id, team_type, round_id, user_id });
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get round dates
    const { data: round, error: roundError } = await supabase
      .from("fantasy_rounds")
      .select("start_date, end_date")
      .eq("id", round_id)
      .single();

    if (roundError || !round) {
      console.error("Round fetch error:", roundError);
      return new Response(
        JSON.stringify({ error: "Round not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("Round dates:", { start_date: round.start_date, end_date: round.end_date });

    // Check if this is the user's star team
    const { data: starTeam } = await supabase
      .from("fantasy_round_star_teams")
      .select("star_team_id")
      .eq("user_id", user_id)
      .eq("round_id", round_id)
      .single();

    const isStarTeam = starTeam?.star_team_id === team_id;

    // Scoring config
    // Must match calculate-fantasy-scores scoring system
    const basePoints = {
      matchWin: 10,
      mapWin: 3,
      cleanSweep: 5,
      tournamentWin: 25,
    };
    const amateurMultiplier = 1.25;
    const starMultiplier = isStarTeam ? 2 : 1;

    let matches: any[] = [];
    let team_name = "";

    // Fetch matches based on team type
    if (team_type === "pro") {
      // Query PandaScore matches using start_time for proper timestamp comparison
      const { data: proMatches, error: proError } = await supabase
        .from("pandascore_matches")
        .select("*")
        .gte("start_time", round.start_date)
        .lte("start_time", round.end_date)
        .eq("status", "finished")
        .order("start_time", { ascending: false });

      if (proError) {
        console.error("Pro matches error:", proError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch matches" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Filter matches where team participated
      const teamMatches = (proMatches || []).filter((match) => {
        const teams = match.teams as any[];
        return teams?.some((t: any) => t?.opponent?.id?.toString() === team_id);
      });

      // Process matches
      matches = teamMatches.map((match) => {
        const teams = match.teams as any[];
        const teamData = teams?.find((t: any) => t?.opponent?.id?.toString() === team_id);
        const opponentData = teams?.find((t: any) => t?.opponent?.id?.toString() !== team_id);

        if (!team_name && teamData?.opponent?.name) {
          team_name = teamData.opponent.name;
        }

        // Determine result
        let result = "tie";
        if (match.winner_id === team_id) {
          result = "win";
        } else if (match.winner_id && match.winner_id !== team_id) {
          result = "loss";
        }

        // Extract scores from raw_data.results array
        const rawResults = match.raw_data?.results as any[];
        let teamScore = 0;
        let opponentScore = 0;
        
        if (Array.isArray(rawResults)) {
          const teamResult = rawResults.find((r: any) => r?.team_id?.toString() === team_id);
          const opponentResult = rawResults.find((r: any) => r?.team_id?.toString() !== team_id);
          teamScore = teamResult?.score || 0;
          opponentScore = opponentResult?.score || 0;
        }
        
        const scoreString = `${teamScore}-${opponentScore}`;

        // Check for clean sweep (2-0 in BO3, 3-0 in BO5)
        const isCleanSweep = result === "win" && opponentScore === 0 && teamScore >= 2;

        // Check for tournament win (tournament/championship in name)
        const tournamentName = match.tournament_name || match.league_name || "";
        const isTournamentWin =
          result === "win" &&
          (tournamentName.toLowerCase().includes("championship") ||
            tournamentName.toLowerCase().includes("final") ||
            tournamentName.toLowerCase().includes("cup"));

        // Calculate points - map wins always count, match win bonus only for wins
        let points = 0;
        
        // Map wins always count (3 pts each)
        points += teamScore * basePoints.mapWin;
        
        // Match win bonus (10 pts) only for wins
        if (result === "win") {
          points += basePoints.matchWin;
        }
        if (isCleanSweep) {
          points += basePoints.cleanSweep;
        }
        if (isTournamentWin) {
          points += basePoints.tournamentWin;
        }

        // Apply multipliers
        points = points * starMultiplier;

        return {
          match_id: match.match_id,
          match_date: match.match_date || match.start_time,
          opponent_name: opponentData?.opponent?.name || "Unknown",
          opponent_logo: opponentData?.opponent?.image_url,
          result,
          score: scoreString,
          points_earned: Math.round(points),
          match_type: "pro" as const,
          tournament_name: tournamentName,
          is_clean_sweep: isCleanSweep,
          is_tournament_win: isTournamentWin,
        };
      });
    } else {
      // Query FACEIT matches using started_at for proper timestamp comparison (matches DB function)
      // Filter by team name directly in the query to avoid Supabase's 1000 row default limit
      const teamNameLower = team_id.toLowerCase();
      console.log(`Querying amateur matches for team "${teamNameLower}" between ${round.start_date} and ${round.end_date}`);
      
      const { data: teamMatches, error: amateurError } = await supabase
        .from("faceit_matches")
        .select("*")
        .gte("started_at", round.start_date)
        .lte("started_at", round.end_date)
        .eq("is_finished", true)
        .or(`faction1_name.ilike.${teamNameLower},faction2_name.ilike.${teamNameLower}`)
        .order("started_at", { ascending: false });

      if (amateurError) {
        console.error("Amateur matches error:", amateurError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch matches" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log(`Found ${teamMatches?.length || 0} matches for team "${team_id}"`);

      // Process matches
      matches = (teamMatches || []).map((match) => {
        const f1Name = (match.faction1_name || "").toLowerCase();
        const searchId = team_id.toLowerCase();
        const isTeam1 = f1Name === searchId;
        const teamName = isTeam1 ? match.faction1_name : match.faction2_name;
        const opponentName = isTeam1 ? match.faction2_name : match.faction1_name;

        if (!team_name && teamName) {
          team_name = teamName;
        }

        // Get scores from faceit_data or raw_data
        const results = match.faceit_data?.results || match.raw_data?.results;
        const winnerId = results?.winner;

        // Determine result
        let result = "tie";
        if (winnerId === "faction1" && isTeam1) {
          result = "win";
        } else if (winnerId === "faction2" && !isTeam1) {
          result = "win";
        } else if (winnerId) {
          result = "loss";
        }

        // Get scores
        const teamScore = isTeam1
          ? (results?.score?.faction1 || 0)
          : (results?.score?.faction2 || 0);
        const opponentScore = isTeam1
          ? (results?.score?.faction2 || 0)
          : (results?.score?.faction1 || 0);
        const scoreString = `${teamScore}-${opponentScore}`;

        // Check for clean sweep
        const isCleanSweep = result === "win" && opponentScore === 0 && teamScore >= 2;

        // Check for tournament win
        const compName = match.competition_name || "";
        const isTournamentWin =
          result === "win" &&
          match.competition_type === "championship";

        // Calculate points - map wins always count, match win bonus only for wins
        let points = 0;
        
        // Map wins always count (3 pts each * amateur multiplier)
        points += teamScore * basePoints.mapWin * amateurMultiplier;
        
        // Match win bonus only for wins
        if (result === "win") {
          points += basePoints.matchWin * amateurMultiplier;
        }
        if (isCleanSweep) {
          points += basePoints.cleanSweep * amateurMultiplier;
        }
        if (isTournamentWin) {
          points += basePoints.tournamentWin * amateurMultiplier;
        }

        // Apply star multiplier
        points = points * starMultiplier;

        return {
          match_id: match.match_id,
          match_date: match.match_date || match.started_at,
          opponent_name: opponentName || "Unknown",
          result,
          score: scoreString,
          points_earned: Math.round(points),
          match_type: "amateur" as const,
          tournament_name: compName,
          is_clean_sweep: isCleanSweep,
          is_tournament_win: isTournamentWin,
        };
      });
    }

    // Calculate summary stats
    const totalPoints = matches.reduce((sum, m) => sum + m.points_earned, 0);
    const matchWins = matches.filter((m) => m.result === "win").length;
    const mapWins = matches.reduce((sum, m) => {
      const [teamScore] = m.score.split("-").map(Number);
      return sum + (teamScore || 0);
    }, 0);
    const cleanSweeps = matches.filter((m) => m.is_clean_sweep).length;
    const tournamentsWon = matches.filter((m) => m.is_tournament_win).length;

    const response = {
      team_name: team_name || "Unknown Team",
      team_type,
      total_points: totalPoints,
      is_star_team: isStarTeam,
      match_wins: matchWins,
      map_wins: mapWins,
      clean_sweeps: cleanSweeps,
      tournaments_won: tournamentsWon,
      matches,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in get-team-match-breakdown:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
