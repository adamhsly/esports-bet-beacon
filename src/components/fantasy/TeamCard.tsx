import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Star, Lock, Users, Trophy } from 'lucide-react';
interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  matches_in_period?: number;
  logo_url?: string;
  esport_type?: string;
  slug?: string;
  matches_prev_window?: number;
  missed_pct?: number;
  total_scheduled?: number;
  price?: number;
  abandon_rate?: number;
  recent_win_rate?: number;
  match_volume?: number;
}
interface TeamCardProps {
  team: Team;
  isSelected: boolean;
  onClick: () => void;
  showBench?: boolean;
  isBench?: boolean;
  showStarToggle?: boolean;
  isStarred?: boolean;
  onToggleStar?: () => void;
  disabledReason?: string | null;
  showPrice?: boolean;
  budgetRemaining?: number;
  variant?: 'selection' | 'progress';
  fantasyPoints?: number;
}
export const TeamCard: React.FC<TeamCardProps> = ({
  team,
  isSelected,
  onClick,
  showBench = false,
  isBench = false,
  showStarToggle = false,
  isStarred = false,
  onToggleStar,
  disabledReason = null,
  showPrice = false,
  budgetRemaining = 0,
  variant = 'progress',
  fantasyPoints = 0
}) => {
  const isAmateur = team.type === 'amateur';
  const canAfford = showPrice ? (team.price ?? 0) <= budgetRemaining : true;
  const StarButton = () => {
    if (!showStarToggle) return null;
    const isDisabled = !!disabledReason;
    const StarIcon = isDisabled ? Lock : Star;
    const button = <Button variant="ghost" size="sm" className={`absolute top-1 right-1 h-6 w-6 p-0 hover:bg-background/20 ${isStarred ? 'text-[#F5C042] hover:text-[#F5C042]/80' : 'text-white/60 hover:text-white/80'}`} onClick={e => {
      e.stopPropagation();
      if (!isDisabled && onToggleStar) {
        onToggleStar();
      }
    }} disabled={isDisabled} aria-pressed={isStarred} aria-label={isStarred ? "Remove star from team" : "Star this team"}>
        <StarIcon className={`h-3 w-3 ${isStarred ? 'fill-current drop-shadow-[0_0_12px_rgba(245,192,66,0.55)] motion-reduce:drop-shadow-none' : ''}`} />
      </Button>;
    if (isDisabled) {
      return <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabledReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>;
    }
    return button;
  };

  // Selection modal variant (rich styling)
  if (variant === 'selection') {
    return <Card className={`relative cursor-pointer transition-all duration-250 hover:scale-[1.02] ${isSelected ? `ring-2 ${isAmateur ? 'ring-orange-400 bg-orange-500/10' : 'ring-blue-400 bg-blue-500/10'} shadow-lg ${isAmateur ? 'shadow-orange-400/20' : 'shadow-blue-400/20'}` : `hover:shadow-md ${canAfford ? 'hover:ring-1 hover:ring-gray-400/30' : 'opacity-50 cursor-not-allowed'}`} bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50`} onClick={canAfford ? onClick : undefined}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Team Logo */}
            <div className={`relative p-2 rounded-lg ${isAmateur ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30' : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30'}`}>
              {team.logo_url ? <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" /> : isAmateur ? <Users className="w-8 h-8 text-orange-400" /> : <Trophy className="w-8 h-8 text-blue-400" />}
            </div>
            
            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate text-left">{team.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                
                {isAmateur && <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400/50">
                    +25% Bonus
                  </Badge>}
              </div>
            </div>
            
            {/* Fantasy Points */}
            <div className="text-right">
              <div className="font-bold text-sm text-blue-400">
                {fantasyPoints}
              </div>
              <div className="text-xs text-gray-400">pts</div>
            </div>
            
            {/* Price */}
            {showPrice && <div className="text-right ml-4">
                <div className={`font-bold text-lg ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                  {team.price ?? 0}
                </div>
                <div className="text-xs text-gray-400">credits</div>
              </div>}
          </div>
          
          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Matches:</span>
              <span className="ml-1 text-white font-medium">
                {isAmateur ? team.match_volume ?? 0 : team.matches_in_period ?? 0}
              </span>
            </div>
            {team.recent_win_rate !== undefined && <div>
                <span className="text-gray-400">Win Rate:</span>
                <span className="ml-1 text-white font-medium">
                  {Math.round((team.recent_win_rate ?? 0) * 100)}%
                </span>
              </div>}
          </div>

          {/* Star Team Double Points Label */}
          {isStarred && isSelected && <div className="mt-2 pt-2 border-t border-gray-600/50">
              <div className="text-xs text-[#F5C042] font-medium">
                DOUBLE POINTS
              </div>
            </div>}
        </CardContent>
        
        <StarButton />
      </Card>;
  }

  // Progress variant (enhanced with selection styling)
  return <Card className={`relative cursor-pointer transition-all duration-250 hover:scale-[1.02] ${isSelected ? `ring-2 ${isAmateur ? 'ring-orange-400 bg-orange-500/10' : 'ring-blue-400 bg-blue-500/10'} shadow-lg ${isAmateur ? 'shadow-orange-400/20' : 'shadow-blue-400/20'}` : 'hover:shadow-md hover:ring-1 hover:ring-gray-400/30'} ${isBench ? 'ring-2 ring-orange-500 bg-orange-500/10' : ''} bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {/* Team Logo */}
          <div className={`relative p-2 rounded-lg ${isAmateur ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30' : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30'}`}>
            {team.logo_url ? <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" /> : isAmateur ? <Users className="w-8 h-8 text-orange-400" /> : <Trophy className="w-8 h-8 text-blue-400" />}
          </div>
          
          {/* Team Info */}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-white truncate text-left">{team.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isAmateur ? 'secondary' : 'default'} className="text-xs">
                {isAmateur ? 'Amateur' : 'Pro'}
              </Badge>
              {isAmateur && <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400/50">
                  +25% Bonus
                </Badge>}
              {isBench && <Badge variant="outline" className="text-xs">Bench</Badge>}
            </div>
          </div>
          
          {/* Fantasy Points */}
          <div className="text-right">
            <div className="font-bold text-sm text-blue-400">
              {fantasyPoints}
            </div>
            <div className="text-xs text-gray-400">pts</div>
          </div>
        </div>
        
        {/* Star Team Double Points Label */}
        {isStarred && isSelected && <div className="mt-2 pt-2 border-t border-gray-600/50">
            <div className="text-xs text-[#F5C042] font-medium">
              DOUBLE POINTS
            </div>
          </div>}
      </CardContent>
      
      <StarButton />
    </Card>;
};