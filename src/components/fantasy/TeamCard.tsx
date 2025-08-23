import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Star, Lock } from 'lucide-react';

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
  recent_win_rate?: number;
  match_volume?: number;
  abandon_rate?: number;
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
  disabledReason = null
}) => {
  const StarButton = () => {
    if (!showStarToggle || !isSelected) return null;

    const isDisabled = !!disabledReason;
    const StarIcon = isDisabled ? Lock : Star;
    
    const button = (
      <Button
        variant="ghost"
        size="sm"
        className={`absolute top-2 right-2 h-8 w-8 p-0 hover:bg-background/20 ${
          isStarred 
            ? 'text-[#F5C042] hover:text-[#F5C042]/80' 
            : 'text-white/60 hover:text-white/80'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (!isDisabled && onToggleStar) {
            onToggleStar();
          }
        }}
        disabled={isDisabled}
        aria-pressed={isStarred}
        aria-label={isStarred ? "Remove star from team" : "Star this team"}
      >
        <StarIcon 
          className={`h-4 w-4 ${
            isStarred 
              ? 'fill-current drop-shadow-[0_0_12px_rgba(245,192,66,0.55)] motion-reduce:drop-shadow-none' 
              : ''
          }`}
        />
      </Button>
    );

    if (isDisabled) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {button}
            </TooltipTrigger>
            <TooltipContent>
              <p>{disabledReason}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return button;
  };

  return (
    <Card 
      className={`relative cursor-pointer transition-all hover:shadow-md bg-card border-border ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      } ${isBench ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`} 
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {team.logo_url && (
              <img 
                src={team.logo_url} 
                alt={team.name} 
                className="w-8 h-8 rounded" 
              />
            )}
            <div>
              <h4 className="font-semibold">{team.name}</h4>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={team.type === 'pro' ? 'default' : 'secondary'} 
                  className="text-xs"
                >
                  {team.type === 'pro' ? 'Pro' : 'Amateur'}
                </Badge>
                {team.type === 'amateur' && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {team.esport_type?.toUpperCase() || 'FACEIT'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {team.matches_prev_window ?? 0} matches
                    </Badge>
                    {typeof team.missed_pct === 'number' && (
                      <Badge variant="outline" className="text-xs">
                        {team.missed_pct}% missed
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      +25% bonus
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {team.type === 'amateur' && (
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {team.matches_prev_window ?? 0} matches
                </div>
                <div className="text-xs text-muted-foreground">
                  last window
                </div>
              </div>
            )}
            {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
            {isBench && <Badge variant="outline" className="text-xs">Bench</Badge>}
          </div>
        </div>
        
        {/* Star Team Double Points Label */}
        {isStarred && isSelected && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="text-xs text-[#F5C042] font-medium">
              DOUBLE POINTS
            </div>
          </div>
        )}
      </CardContent>
      
      <StarButton />
    </Card>
  );
};