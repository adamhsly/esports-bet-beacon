import { supabase } from '@/integrations/supabase/client';

export async function getTeamStats(teamId: string) {
  const { data, error } = await supabase.rpc(
    'get_team_stats',
    { team_id: teamId },
    {
      // 👇 Manually add apikey in headers if needed
      headers: {
        apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjanplYWZlbHVucXhteHp6bm9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NzE4MTgsImV4cCI6MjA2NDM0NzgxOH0.l0RObyMQCw23tmPfi5Wy7CgdmER93GYbR7IVPakzn-A"
      }
    }
  );

  if (error) {
    console.error(`Failed to fetch stats for team ${teamId}:`, error);
    return null;
  }

  return {
    winRate: data.win_rate,
    recentForm: data.recent_form,
    tournamentWins: data.tournament_wins,
    totalMatches: data.total_matches,
  };
}
