import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, Trophy, Users, CheckCircle } from 'lucide-react';
import { getEnhancedTeamLogoUrl } from '@/utils/teamLogoUtils';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { LightweightMatchCard } from '@/hooks/useMatchCards';
import { useMatchDetails } from '@/hooks/useMatchDetails';

interface OptimizedMatchCardProps {
  card: LightweightMatchCard;
  onExpand?: (card: LightweightMatchCard) => void;
}

export const OptimizedMatchCard: React.FC<OptimizedMatchCardProps> = ({ card, onExpand }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { details, loading: detailsLoading } = useMatchDetails(
    isExpanded ? card.match_id : '', 
    card.source
  );

  const matchDate = new Date(card.start_time);
  
  // Determine match status
  const normalizedStatus = card.status?.toLowerCase() || '';
  const isFinished = ['finished', 'completed', 'cancelled', 'aborted'].includes(normalizedStatus);
  const isLive = ['ongoing', 'running', 'live'].includes(normalizedStatus);

  // Create team objects for compatibility
  const teams = [
    {
      name: card.team1_name,
      logo: card.team1_logo,
      id: card.team1_id
    },
    {
      name: card.team2_name,
      logo: card.team2_logo,
      id: card.team2_id
    }
  ];

  // Determine route
  const to = card.source === 'amateur' 
    ? `/faceit/match/${card.match_id}` 
    : `/pandascore/match/${card.match_id}`;

  // Styling based on source
  const getBgClass = () => {
    return card.source === 'professional' 
      ? 'bg-blue-950/70' 
      : 'bg-orange-950/70';
  };

  const getRingClass = () => {
    return card.source === 'professional'
      ? 'ring-1 ring-blue-400/30'
      : 'ring-1 ring-orange-400/30';
  };

  const getBadgeProps = () => {
    if (card.source === 'professional') {
      return {
        color: 'blue',
        text: 'PRO',
        icon: <Trophy size={13} className="mr-1" />,
        badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-400/30'
      };
    } else {
      return {
        color: 'orange',
        text: 'FACEIT',
        icon: <Users size={13} className="mr-1" />,
        badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-400/30'
      };
    }
  };

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

  const badgeProps = getBadgeProps();

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Allow opening in new tab with Cmd/Ctrl + click
      return;
    }
    
    e.preventDefault();
    
    if (!isExpanded && onExpand) {
      onExpand(card);
    }
    
    setIsExpanded(!isExpanded);
  };

  return (
    <Link
      to={to}
      className="group block focus:outline-none"
      tabIndex={0}
      aria-label={`${teams[0].name} vs ${teams[1].name} - navigate to match details`}
      onClick={handleCardClick}
    >
      <Card
        className={`
          ${getBgClass()} ${getRingClass()} border-0 rounded-xl shadow-none px-0 py-0 transition-colors duration-200
          group-hover:scale-[1.015] group-hover:shadow-md group-hover:ring-2 group-hover:ring-theme-purple/70 cursor-pointer
        `}
        style={{ pointerEvents: "auto" }}
      >
        <div className="flex flex-col gap-1 px-3 py-2">
          {/* Tournament info and time/result row */}
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-xs text-gray-400 truncate max-w-[65%] font-medium">
              {card.tournament}
            </span>
            {isFinished ? (
              <div className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                <CheckCircle size={12} />
                <span>FINISHED</span>
              </div>
            ) : isLive ? (
              <div className="flex items-center gap-2 text-xs text-red-400 font-semibold">
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
            <div className="flex items-center gap-2 flex-1 rounded-lg p-1">
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
            <div className="flex items-center gap-2 flex-1 justify-end rounded-lg p-1">
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
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getBOBadgeClass(card.best_of)}`}
              >
                BO{card.best_of}
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
          </div>

          {/* Expanded details section */}
          {isExpanded && (
            <div className="mt-2 pt-2 border-t border-gray-600/30">
              {detailsLoading ? (
                <div className="text-xs text-gray-400">Loading details...</div>
              ) : details ? (
                <div className="text-xs text-gray-300">
                  <div>Game: {card.esport_type}</div>
                  <div>Status: {card.status}</div>
                  {/* Add more details from the heavy data as needed */}
                </div>
              ) : (
                <div className="text-xs text-gray-400">No additional details available</div>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
};