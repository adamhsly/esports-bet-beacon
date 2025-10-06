
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy } from 'lucide-react';

interface PandaScoreLiveScorecardProps {
  match: {
    teams: Array<{
      name: string;
      logo?: string;
      id?: string;
    }>;
    bestOf?: number;
    status: string;
  };
}

export const PandaScoreLiveScorecard: React.FC<PandaScoreLiveScorecardProps> = ({ match }) => {
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  // Mock live scores - in real implementation this would come from API
  const mockScores = {
    team1: 1,
    team2: 0,
    currentMap: "de_mirage",
    round: "16-14"
  };

  return (
    <Card className="bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] border border-white/5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_12px_rgba(73,168,255,0.3)] transition-all duration-[250ms] ease-in-out hover:scale-[1.02] hover:shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_0_8px_rgba(255,255,255,0.05),0_0_15px_rgba(73,168,255,0.4)]">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#E8EAF5]">Live Scorecard</h3>
          <Badge className="bg-red-500/20 text-red-400 border-red-400/30 shadow-[0_0_10px_rgba(255,77,62,0.3)] animate-pulse">
            {mockScores.currentMap}
          </Badge>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] rounded-lg border border-white/5 hover:scale-[1.02] transition-all duration-[250ms] ease-in-out">
            <div className="flex items-center space-x-3">
              <img 
                src={team1.logo || '/placeholder.svg'} 
                alt={team1.name} 
                className="w-8 h-8 object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <span className="text-[#E8EAF5] font-semibold">{team1.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-[#E8EAF5]">{mockScores.team1}</span>
              {mockScores.team1 > mockScores.team2 && (
                <Trophy className="h-5 w-5 text-neon-green" />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] rounded-lg border border-white/5 hover:scale-[1.02] transition-all duration-[250ms] ease-in-out">
            <div className="flex items-center space-x-3">
              <img 
                src={team2.logo || '/placeholder.svg'} 
                alt={team2.name} 
                className="w-8 h-8 object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder.svg';
                }}
              />
              <span className="text-[#E8EAF5] font-semibold">{team2.name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-[#E8EAF5]">{mockScores.team2}</span>
              {mockScores.team2 > mockScores.team1 && (
                <Trophy className="h-5 w-5 text-neon-green" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <span className="text-[#A8AEBF]">Current Round: </span>
          <span className="text-[#E8EAF5] font-semibold">{mockScores.round}</span>
        </div>
      </div>
    </Card>
  );
};
