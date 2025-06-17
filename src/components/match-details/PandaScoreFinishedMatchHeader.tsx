
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Trophy, Calendar, Clock, MapPin, CheckCircle } from 'lucide-react';

interface PandaScoreFinishedMatchHeaderProps {
  match: {
    id: string;
    teams: Array<{
      name: string;
      logo?: string;
      id?: string;
    }>;
    startTime: string;
    tournament?: string;
    esportType: string;
    bestOf?: number;
    status: string;
    rawData?: any;
  };
}

export const PandaScoreFinishedMatchHeader: React.FC<PandaScoreFinishedMatchHeaderProps> = ({ match }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const { date, time } = formatDateTime(match.startTime);
  const team1 = match.teams[0] || { name: 'Team 1' };
  const team2 = match.teams[1] || { name: 'Team 2' };

  // Extract winner and score from rawData if available
  const getMatchResult = () => {
    if (match.rawData?.results) {
      const results = match.rawData.results;
      return {
        winner: results.winner,
        score: results.score || { team1: 0, team2: 0 }
      };
    }
    return null;
  };

  const result = getMatchResult();

  return (
    <Card className="bg-theme-gray-dark border border-green-500/30 overflow-hidden">
      <div className="p-6">
        {/* Top Section - Tournament and Badges */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg text-gray-300">{match.tournament || 'Pro Match'}</span>
              <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-400/30">
                <Trophy size={12} className="mr-1" />
                PRO
              </Badge>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-400/30">
                <CheckCircle size={12} className="mr-1" />
                FINISHED
              </Badge>
            </div>
            <span className="text-sm text-blue-400 uppercase">{match.esportType}</span>
          </div>
          <Badge className="bg-theme-purple">
            BO{match.bestOf || 3}
          </Badge>
        </div>

        {/* Result Section */}
        {result && (
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-green-400 mb-1">
              MATCH FINISHED
            </div>
            <div className="text-lg text-gray-300">
              Final Score: {result.score.team1} - {result.score.team2}
            </div>
          </div>
        )}

        {/* Teams Section */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {[team1, team2].map((team, index) => {
            const isWinner = result && result.winner === (index === 0 ? 'team1' : 'team2');
            
            return (
              <div
                key={team.name || index}
                className={`flex flex-1 items-center ${index === 1 ? 'flex-row-reverse' : ''} ${
                  isWinner ? 'ring-2 ring-green-400/50 bg-green-900/20 rounded-lg p-2' : 'opacity-75'
                }`}
              >
                <div className={`flex flex-col items-${index === 0 ? 'start' : 'end'} flex-1`}>
                  <img
                    src={team.logo || '/placeholder.svg'}
                    alt={`${team.name} logo`}
                    className="w-20 h-20 object-contain mb-3"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder.svg';
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white">{team.name}</span>
                    {isWinner && <Trophy className="h-5 w-5 text-yellow-400" />}
                  </div>
                </div>
                {index === 0 && (
                  <span className="mx-6 text-2xl text-gray-400 font-bold">vs</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Section - Match Info */}
        <div className="flex justify-center items-center">
          <div className="flex items-center text-gray-400 text-sm gap-4">
            <div className="flex items-center">
              <Calendar size={14} className="mr-1.5" />
              <span>{date}</span>
            </div>
            <div className="flex items-center">
              <Clock size={14} className="mr-1.5" />
              <span>{time}</span>
            </div>
            <div className="flex items-center">
              <MapPin size={14} className="mr-1.5" />
              <span className="uppercase">{match.esportType}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
