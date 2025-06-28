
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

interface LeagueTeam {
  id: string;
  name: string;
  logo: string;
  position: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  winRate: number;
  form: string[];
}

interface LeagueStandingsProps {
  tournamentId: string;
  tournamentName: string;
  esportType: string;
}

export const LeagueStandings: React.FC<LeagueStandingsProps> = ({ 
  tournamentId, 
  tournamentName, 
  esportType 
}) => {
  const [standings, setStandings] = useState<LeagueTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStandings() {
      setLoading(true);
      try {
        // Try to get actual standings data
        let teams = await fetchActualStandings();
        
        // If no actual data, generate mock standings
        if (teams.length === 0) {
          teams = generateMockStandings();
        }
        
        setStandings(teams);
      } catch (error) {
        console.error('Error loading standings:', error);
        setStandings(generateMockStandings());
      } finally {
        setLoading(false);
      }
    }

    loadStandings();
  }, [tournamentId]);

  const fetchActualStandings = async (): Promise<LeagueTeam[]> => {
    // Try to fetch matches for this tournament/competition to derive standings
    const [source, id] = tournamentId.split('_', 2);
    
    if (source === 'faceit') {
      const competitionName = id.replace(/_/g, ' ');
      const { data: matches } = await supabase
        .from('faceit_matches')
        .select('*')
        .eq('competition_name', competitionName)
        .eq('status', 'finished');

      if (matches && matches.length > 0) {
        return calculateStandingsFromMatches(matches);
      }
    }

    return [];
  };

  const calculateStandingsFromMatches = (matches: any[]): LeagueTeam[] => {
    const teamStats: Record<string, any> = {};

    matches.forEach(match => {
      const teams = match.teams as any;
      const team1 = teams.team1;
      const team2 = teams.team2;

      // Initialize team stats if not exists
      [team1, team2].forEach(team => {
        if (!teamStats[team.name]) {
          teamStats[team.name] = {
            id: team.id || team.name.toLowerCase().replace(/\s+/g, '_'),
            name: team.name,
            logo: team.logo || '/placeholder.svg',
            matchesPlayed: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            form: []
          };
        }
      });

      // Update match results (mock random results for now)
      const team1Wins = Math.random() > 0.5;
      teamStats[team1.name].matchesPlayed++;
      teamStats[team2.name].matchesPlayed++;

      if (team1Wins) {
        teamStats[team1.name].wins++;
        teamStats[team1.name].points += 3;
        teamStats[team1.name].form.push('W');
        teamStats[team2.name].losses++;
        teamStats[team2.name].form.push('L');
      } else {
        teamStats[team2.name].wins++;
        teamStats[team2.name].points += 3;
        teamStats[team2.name].form.push('W');
        teamStats[team1.name].losses++;
        teamStats[team1.name].form.push('L');
      }
    });

    // Convert to array and sort by points
    const teams = Object.values(teamStats).map(team => {
      const winRate = team.matchesPlayed > 0 ? (team.wins / team.matchesPlayed) * 100 : 0;
      return {
        ...team,
        winRate,
        form: team.form.slice(-5) // Last 5 results
      } as LeagueTeam;
    });

    teams.sort((a, b) => b.points - a.points || b.winRate - a.winRate);
    teams.forEach((team, index) => {
      team.position = index + 1;
    });

    return teams;
  };

  const generateMockStandings = (): LeagueTeam[] => {
    const mockTeams = [
      'Team Liquid', 'Cloud9', 'FaZe Clan', 'G2 Esports', 'Natus Vincere',
      'Astralis', 'Vitality', 'ENCE', 'Heroic', 'BIG', 'Movistar Riders', 'Fnatic'
    ];

    return mockTeams.map((teamName, index) => {
      const matchesPlayed = Math.floor(Math.random() * 10) + 15;
      const wins = Math.floor(Math.random() * matchesPlayed * 0.8);
      const losses = Math.floor(Math.random() * (matchesPlayed - wins));
      const draws = matchesPlayed - wins - losses;
      const points = wins * 3 + draws;
      const winRate = (wins / matchesPlayed) * 100;
      
      // Generate recent form
      const form = [];
      for (let i = 0; i < 5; i++) {
        const rand = Math.random();
        if (rand > 0.6) form.push('W');
        else if (rand > 0.3) form.push('L');
        else form.push('D');
      }

      return {
        id: `team_${index}`,
        name: teamName,
        logo: '/placeholder.svg',
        position: index + 1,
        matchesPlayed,
        wins,
        draws,
        losses,
        points,
        winRate,
        form
      };
    }).sort((a, b) => b.points - a.points).map((team, index) => ({
      ...team,
      position: index + 1
    }));
  };

  const getFormIcon = (result: string) => {
    switch (result) {
      case 'W': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'L': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'D': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      default: return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getPositionChange = (position: number, totalTeams: number) => {
    if (position <= 4) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (position > totalTeams - 3) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-purple"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-theme-purple" />
        <h2 className="text-2xl font-bold text-center">
          {tournamentName} - League Standings
        </h2>
      </div>

      <Table>
        <TableCaption>Current league standings and team performance</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Pos</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">MP</TableHead>
            <TableHead className="text-center">W</TableHead>
            <TableHead className="text-center">D</TableHead>
            <TableHead className="text-center">L</TableHead>
            <TableHead className="text-center">Pts</TableHead>
            <TableHead className="text-center">Win%</TableHead>
            <TableHead className="text-center">Form</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {standings.map((team) => (
            <TableRow 
              key={team.id} 
              className={`${
                team.position <= 4 
                  ? "bg-green-500/10" 
                  : team.position > standings.length - 3 
                  ? "bg-red-500/10" 
                  : ""
              }`}
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {team.position}
                  {getPositionChange(team.position, standings.length)}
                </div>
              </TableCell>
              <TableCell>
                <Link to={`/team/${team.id}`} className="flex items-center hover:text-theme-purple">
                  <img 
                    src={team.logo} 
                    alt={team.name} 
                    className="w-6 h-6 mr-3 object-contain"
                  />
                  <span className="font-medium">{team.name}</span>
                </Link>
              </TableCell>
              <TableCell className="text-center">{team.matchesPlayed}</TableCell>
              <TableCell className="text-center text-green-400">{team.wins}</TableCell>
              <TableCell className="text-center text-yellow-400">{team.draws}</TableCell>
              <TableCell className="text-center text-red-400">{team.losses}</TableCell>
              <TableCell className="text-center font-bold">{team.points}</TableCell>
              <TableCell className="text-center">{team.winRate.toFixed(1)}%</TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {team.form.map((result, index) => (
                    <div key={index} title={result === 'W' ? 'Win' : result === 'L' ? 'Loss' : 'Draw'}>
                      {getFormIcon(result)}
                    </div>
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-6 flex justify-center gap-6 text-sm text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500/10 border border-green-500/30 rounded"></div>
          <span>Qualification spots</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500/10 border border-red-500/30 rounded"></div>
          <span>Relegation zone</span>
        </div>
      </div>
    </div>
  );
};

export default LeagueStandings;
