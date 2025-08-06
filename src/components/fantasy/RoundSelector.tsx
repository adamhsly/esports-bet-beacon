import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';

interface Team {
  id: string;
  name: string;
  image_url?: string;
  hash_image?: string;
}

interface Match {
  id: string;
  teams: [Team, Team];
  startTime: string;
  bestOf: number;
  status: string;
  faceitData?: {
    results?: {
      winner: string;
      score: {
        faction1: number;
        faction2: number;
      };
    };
  };
}

interface FaceitMatchListProps {
  matches: Match[];
}

const getBOBadgeClass = (bo: number) => {
  switch (bo) {
    case 1: return 'bg-green-500/20 text-green-400 border-green-400/30 ml-1';
    case 2: return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30 ml-1';
    case 3: return 'bg-purple-500/20 text-purple-400 border-purple-400/30 ml-1';
    case 5: return 'bg-pink-500/20 text-pink-400 border-pink-400/30 ml-1';
    case 7: return 'bg-red-500/20 text-red-400 border-red-400/30 ml-1';
    default: return 'bg-neutral-500/20 text-neutral-300 border-neutral-400/25 ml-1';
  }
};

const FaceitMatchList: React.FC<FaceitMatchListProps> = ({ matches }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((match) => {
        const matchDate = new Date(match.startTime);
        const isFinished = ['finished', 'completed', 'cancelled'].includes(match.status.toLowerCase());
        const isLive = ['ongoing', 'running', 'live'].includes(match.status.toLowerCase());
        const finalScore = match.faceitData?.results
          ? `${match.faceitData.results.score.faction1} - ${match.faceitData.results.score.faction2}`
          : null;

        const getWinnerStyling = (teamIndex: number) => {
          if (!isFinished || !match.faceitData?.results) return '';
          const isWinner = match.faceitData.results.winner === (teamIndex === 0 ? 'faction1' : 'faction2');
          return isWinner ? 'ring-2 ring-green-400/50 bg-green-900/20' : 'opacity-75';
        };

        return (
          <Link
            key={match.id}
            to={`/faceit/match/${match.id.replace('faceit_', '')}`}
            className="group block focus:outline-none"
          >
            <Card
              className="bg-orange-950/70 ring-1 ring-orange-400/30 border-0 rounded-xl shadow-none px-0 py-0 transition-transform group-hover:scale-[1.015] group-hover:shadow-md group-hover:ring-2 group-hover:ring-theme-purple/70"
            >
              <div className="flex flex-col gap-1 px-3 py-2">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-xs text-gray-400 truncate max-w-[65%] font-medium">
                    FACEIT
                  </span>
                  {isFinished && finalScore ? (
                    <div className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                      <CheckCircle size={12} />
                      <span>{finalScore}</span>
                    </div>
                  ) : isLive ? (
                    <div className="flex items-center gap-1 text-xs text-red-400 font-semibold">
                      <div className="h-2 w-2 bg-red-400 rounded-full animate-pulse" />
                      <span>LIVE</span>
                    </div>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400 font-semibold min-w-[48px] justify-end">
                      <Clock size={14} className="mr-1" />
                      {matchDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                {/* Teams row */}
                <div className="flex items-center justify-between min-h-10 mt-0.5">
                  <div className={`flex items-center gap-2 flex-1 rounded-lg p-1 transition-all ${getWinnerStyling(0)}`}>
                    <img
                      src={getEnhancedTeamLogoUrl(match.teams[0])}
                      alt={`${match.teams[0].name} logo`}
                      className="w-7 h-7 object-contain rounded-md bg-gray-800"
                      onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                    />
                    <span className="truncate font-semibold text-sm text-white max-w-[90px]">
                      {match.teams[0].name}
                    </span>
                  </div>

                  <span className="text-md font-bold text-gray-400 mx-2">vs</span>

                  <div className={`flex items-center gap-2 flex-1 justify-end rounded-lg p-1 transition-all ${getWinnerStyling(1)}`}>
                    <span className="truncate font-semibold text-sm text-white max-w-[90px] text-right">
                      {match.teams[1].name}
                    </span>
                    <img
                      src={getEnhancedTeamLogoUrl(match.teams[1])}
                      alt={`${match.teams[1].name} logo`}
                      className="w-7 h-7 object-contain rounded-md bg-gray-800"
                      onError={(e) => (e.currentTarget.src = '/placeholder.svg')}
                    />
                  </div>
                </div>

                {/* Labels */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-orange-500/20 text-orange-400 border-orange-400/30"
                    >
                      <Users size={13} className="mr-1" />
                      FACEIT
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getBOBadgeClass(match.bestOf)}`}
                    >
                      BO{match.bestOf}
                    </Badge>
                    {isFinished && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/20 text-green-400 border-green-400/30 ml-1"
                      >
                        <CheckCircle size={10} className="mr-1" />
                        FINISHED
                      </Badge>
                    )}
                  </div>
                  <span className="flex-1" />
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default FaceitMatchList;
