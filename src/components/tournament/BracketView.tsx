
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { MatchInfo } from '@/components/MatchCard';

interface BracketTeam {
  id: string;
  name: string;
  logo: string;
  score?: number;
}

interface BracketMatch {
  id: string;
  teams: [BracketTeam, BracketTeam];
  round: number;
  position: number;
  startTime: string;
  completed: boolean;
  winnerId?: string;
}

interface BracketProps {
  matches: MatchInfo[];
  tournamentName: string;
  totalRounds?: number;
}

export const BracketView: React.FC<BracketProps> = ({ 
  matches, 
  tournamentName,
  totalRounds = 3 
}) => {
  // Process matches into bracket format
  const processBracketData = (): BracketMatch[][] => {
    // This is a simplified example - in a real implementation, you'd need 
    // more logic to properly place matches in the bracket based on seeding and results
    const rounds: BracketMatch[][] = Array(totalRounds).fill(0).map(() => []);
    
    // Sort matches by date
    const sortedMatches = [...matches].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    // Assign matches to rounds
    sortedMatches.forEach((match, index) => {
      const round = Math.min(Math.floor(index / Math.pow(2, totalRounds - 1)), totalRounds - 1);
      const position = index % Math.pow(2, totalRounds - 1 - round);
      
      rounds[round].push({
        id: match.id,
        teams: [
          {
            id: match.teams[0].name, // Using name as ID for simplicity
            name: match.teams[0].name,
            logo: match.teams[0].logo,
            score: Math.floor(Math.random() * 3) // Mock score for visualization
          },
          {
            id: match.teams[1].name,
            name: match.teams[1].name,
            logo: match.teams[1].logo,
            score: Math.floor(Math.random() * 3)
          }
        ],
        round,
        position,
        startTime: match.startTime,
        completed: new Date(match.startTime) < new Date(),
        winnerId: new Date(match.startTime) < new Date() 
          ? Math.random() > 0.5 ? match.teams[0].name : match.teams[1].name
          : undefined
      });
    });
    
    return rounds;
  };
  
  const bracketRounds = processBracketData();

  return (
    <div className="w-full overflow-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">
        {tournamentName} - Tournament Bracket
      </h2>
      
      <div className="flex space-x-8 min-w-max p-4">
        {bracketRounds.map((round, roundIndex) => (
          <div 
            key={`round-${roundIndex}`} 
            className="flex flex-col space-y-10"
            style={{ 
              minWidth: '250px',
              marginTop: roundIndex > 0 ? `${Math.pow(2, roundIndex) * 20}px` : '0'
            }}
          >
            <div className="text-center mb-2">
              <Badge variant="outline" className="px-4 py-1">
                {roundIndex === bracketRounds.length - 1
                  ? "Final"
                  : roundIndex === bracketRounds.length - 2
                  ? "Semifinals"
                  : roundIndex === 0
                  ? "First Round"
                  : `Round ${roundIndex + 1}`}
              </Badge>
            </div>
            
            {round.map((match) => (
              <Link 
                to={`/match/${match.id}`}
                key={match.id} 
                className="block mb-4 transition-transform hover:scale-105"
              >
                <Card className={`border ${match.completed ? 'border-theme-gray-medium' : 'border-theme-purple/50'}`}>
                  <CardContent className="p-3">
                    {match.teams.map((team, idx) => (
                      <React.Fragment key={team.id}>
                        <div className={`flex justify-between items-center py-2 ${
                          match.completed && match.winnerId === team.id 
                            ? 'text-theme-purple font-medium' 
                            : ''
                        }`}>
                          <div className="flex items-center">
                            <img 
                              src={team.logo || '/placeholder.svg'} 
                              alt={team.name} 
                              className="w-6 h-6 mr-2 object-contain"
                            />
                            <div className="truncate max-w-[150px]">{team.name}</div>
                          </div>
                          <div>
                            {match.completed ? team.score : '-'}
                          </div>
                        </div>
                        {idx === 0 && <Separator className="my-1 bg-theme-gray-medium/50" />}
                      </React.Fragment>
                    ))}
                    <div className="text-xs text-gray-400 mt-2 text-center">
                      {match.completed 
                        ? "Completed" 
                        : new Date(match.startTime).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BracketView;
