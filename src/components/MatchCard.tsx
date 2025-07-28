import React from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Trophy, Users, CheckCircle } from 'lucide-react';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export interface TeamInfo {
  name: string;
  logo?: string | null;
  image_url?: string | null;
  id?: string;
  hash_image?: string | null;
}

export interface Player {
  name: string;
  position: string;
  hash_image: string;
  short_name: string;
  country_name: string;
  date_of_birth: string;
}

export interface MatchInfo {
  id: string;
  teams: [TeamInfo, TeamInfo];
  startTime: string;
  tournament: string;
  tournament_name?: string;
  season_name?: string;
  class_name?: string;
  league_name?: string;
  esportType: string;
  bestOf: number;
  homeTeamPlayers?: Player[];
  awayTeamPlayers?: Player[];
  source?: 'professional' | 'amateur';
  status?: string;
  hasValidSchedule?: boolean; // For FACEIT matches to track if they have proper scheduling
  faceitData?: {
    region?: string;
    competitionType?: string;
    organizedBy?: string;
    calculateElo?: boolean;
    results?: {
      winner: string;
      score: {
        faction1: number;
        faction2: number;
      };
    };
  };
  rawData?: any;
}

interface MatchCardProps {
  match: MatchInfo;
}

export const MatchCard: React.FC<MatchCardProps> = ({ match }) => {
  const { teams, startTime, tournament, tournament_name, source, bestOf, id, status, faceitData, rawData } = match;
  const matchDate = new Date(startTime);
  
  // 🔧 ENHANCED: Time-based status determination
  const normalizedStatus = status?.toLowerCase() || '';
  const isFinished = ['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus);
  
  // Time-based live status determination
  const now = new Date();
  const matchStart = new Date(startTime);
  const hasStarted = now >= matchStart;
  const isLive = hasStarted && !isFinished;

  // Enhanced logging for routing decisions AND winner/score data
  console.log(`🎯 MatchCard rendering for ${id}:`, {
    originalStatus: status,
    normalizedStatus,
    isFinished,
    hasResults: !!(faceitData?.results),
    source,
    rawDataKeys: rawData ? Object.keys(rawData) : 'no rawData',
    rawDataWinner: rawData?.winner,
    rawDataWinnerId: rawData?.winner?.id,
    rawDataResults: rawData?.results,
    teamsWithIds: teams.map(t => ({ name: t.name, id: t.id })),
    routingDecision: {
      willRouteToUnifiedFaceit: source === 'amateur',
      expectedRoute: source === 'amateur' 
        ? `/faceit/match/${id.replace('faceit_', '')}` 
        : source === 'professional' 
        ? `/pandascore/match/${id.replace('pandascore_', '')}`
        : `/match/${id}`
    }
  });

  // Determine color based on match source
  let bgClass = 'bg-theme-gray-medium';
  let ringClass = '';
  let badgeProps: { 
    color: string; 
    text: string; 
    icon: React.ReactNode; 
    badgeClass: string; 
    outlineClass: string;
  } = {
    color: 'gray',
    text: '',
    icon: null,
    badgeClass: '',
    outlineClass: '',
  };

  // Determine the correct route for the given match with enhanced logging
  let to = '/';
  if (source === 'amateur' || (id && String(id).startsWith('faceit_'))) {
    // All FACEIT matches go to the unified page regardless of status
    to = `/faceit/match/${String(id).replace('faceit_', '')}`;
    console.log(`🎯 FACEIT match ${id} will route to unified page: ${to} (status: ${status} -> ${normalizedStatus})`);
  } else if (source === 'professional' || (id && String(id).startsWith('pandascore_'))) {
    // For PandaScore matches, always route to the same page (no separate finished page)
    to = `/pandascore/match/${String(id).replace('pandascore_', '')}`;
    console.log(`🎯 PANDASCORE match ${id} will route to: ${to} (status: ${status} -> ${normalizedStatus})`);
  } else {
    to = `/match/${id}`;
    console.log(`🎯 UNKNOWN source match ${id} will route to: ${to}`);
  }

  if (source === 'professional') {
    bgClass = 'bg-blue-950/70';
    ringClass = 'ring-1 ring-blue-400/30';
    badgeProps = {
      color: 'blue',
      text: 'PRO',
      icon: <Trophy size={13} className="mr-1" />,
      badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-400/30',
      outlineClass: 'variant-outline',
    };
  } else if (source === 'amateur') {
    bgClass = 'bg-orange-950/70';
    ringClass = 'ring-1 ring-orange-400/30';
    badgeProps = {
      color: 'orange',
      text: 'FACEIT',
      icon: <Users size={13} className="mr-1" />,
      badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-400/30',
      outlineClass: 'variant-outline',
    };
  }

  // Function to color code BO badge based on bestOf value
  const getBOBadgeClass = (bo: number) => {
    switch (bo) {
      case 1:
        return 'bg-green-500/20 text-green-400 border-green-400/30 ml-1';
      case 2:
        return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30 ml-1';
      case 3:
        return 'bg-purple-500/20 text-purple-400 border-purple-400/30 ml-1';
      case 5:
        return 'bg-pink-500/20 text-pink-400 border-pink-400/30 ml-1';
      case 7:
        return 'bg-red-500/20 text-red-400 border-red-400/30 ml-1';
      default:
        return 'bg-neutral-500/20 text-neutral-300 border-neutral-400/25 ml-1';
    }
  };

  // Determine winner and styling for finished matches
  const getWinnerStyling = (teamIndex: number) => {
    if (!isFinished) return '';
    
    // For FACEIT matches, use faceitData.results
    if (source === 'amateur' && faceitData?.results) {
      const isWinner = faceitData.results.winner === (teamIndex === 0 ? 'faction1' : 'faction2');
      return isWinner ? 'ring-2 ring-green-400/50 bg-green-900/20' : 'opacity-75';
    }
    
    // 🔧 FIXED: For PandaScore matches, use rawData.winner.id instead of rawData.winner_id
    if (source === 'professional' && rawData?.winner?.id) {
      const teamId = teams[teamIndex]?.id;
      console.log(`🏆 Checking winner for team ${teamIndex}:`, {
        teamId,
        winnerId: rawData.winner.id,
        isWinner: teamId && rawData.winner.id?.toString() === teamId?.toString()
      });
      
      if (teamId) {
        const isWinner = rawData.winner.id.toString() === teamId.toString();
        return isWinner ? 'ring-2 ring-green-400/50 bg-green-900/20' : 'opacity-75';
      }
    }
    
    return '';
  };

  // Get final score for finished matches
  const getFinalScore = () => {
    if (!isFinished) return null;
    
    // For FACEIT matches
    if (source === 'amateur' && faceitData?.results) {
      return `${faceitData.results.score.faction1} - ${faceitData.results.score.faction2}`;
    }
    
    // For PandaScore matches, extract score from rawData.results
    if (source === 'professional' && rawData?.results && Array.isArray(rawData.results)) {
      // rawData.results is an array like: [{score: 0, team_id: 2883}, {score: 3, team_id: 126061}]
      const team1Id = teams[0]?.id;
      const team2Id = teams[1]?.id;
      
      console.log(`📊 Getting score for PandaScore match:`, {
        team1Id,
        team2Id,
        results: rawData.results,
        team1Name: teams[0]?.name,
        team2Name: teams[1]?.name
      });
      
      if (team1Id && team2Id) {
        const team1Result = rawData.results.find((r: any) => r.team_id?.toString() === team1Id.toString());
        const team2Result = rawData.results.find((r: any) => r.team_id?.toString() === team2Id.toString());
        
        console.log(`📊 Score results found:`, {
          team1Result,
          team2Result
        });
        
        if (team1Result && team2Result) {
          return `${team1Result.score} - ${team2Result.score}`;
        }
      }
    }
    
    return null;
  };

  const finalScore = getFinalScore();

  return (
    <Link
      to={to}
      className="group block focus:outline-none"
      tabIndex={0}
      aria-label={`${teams[0].name} vs ${teams[1].name} - navigate to match details`}
      onClick={() => {
        console.log(`🔗 MatchCard clicked - navigating to: ${to}`, {
          matchId: id,
          originalStatus: status,
          normalizedStatus,
          isFinished,
          hasResults: !!(faceitData?.results || (rawData?.results && rawData?.winner_id))
        });
      }}
    >
      <Card
        className={`
          ${bgClass} ${ringClass} border-0 rounded-xl shadow-none px-0 py-0 transition-colors duration-200
          group-hover:scale-[1.015] group-hover:shadow-md group-hover:ring-2 group-hover:ring-theme-purple/70 cursor-pointer
        `}
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex flex-col gap-1 px-3 py-2">
          {/* Tournament info and time/result row */}
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-gray-400 truncate max-w-[65%] font-medium">
              {tournament_name || tournament}
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
            {/* Team 1 */}
            <div className={`flex items-center gap-2 flex-1 rounded-lg p-1 transition-all ${getWinnerStyling(0)}`}>
              <img
                src={getEnhancedTeamLogoUrl(teams[0])}
                alt={`${teams[0].name} logo`}
                className="w-7 h-7 object-contain rounded-md bg-gray-800"
                onError={e => (e.currentTarget.src = '/placeholder.svg')}
              />
              <span className="truncate font-semibold text-sm text-white max-w-[90px]">{teams[0].name}</span>
            </div>
            
            <span className="text-md font-bold text-gray-400 mx-2">vs</span>
            
            {/* Team 2 */}
            <div className={`flex items-center gap-2 flex-1 justify-end rounded-lg p-1 transition-all ${getWinnerStyling(1)}`}>
              <span className="truncate font-semibold text-sm text-white max-w-[90px] text-right">{teams[1].name}</span>
              <img
                src={getEnhancedTeamLogoUrl(teams[1])}
                alt={`${teams[1].name} logo`}
                className="w-7 h-7 object-contain rounded-md bg-gray-800"
                onError={e => (e.currentTarget.src = '/placeholder.svg')}
              />
            </div>
          </div>
          
          {/* Label row for PRO/FACEIT, BO amount, and status */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <Badge
                variant="outline"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${badgeProps.badgeClass}`}
              >
                {badgeProps.icon}
                {badgeProps.text}
              </Badge>
              <Badge
                variant="outline"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getBOBadgeClass(bestOf)}`}
              >
                BO{bestOf}
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
};
