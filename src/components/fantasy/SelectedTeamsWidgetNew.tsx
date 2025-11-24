import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Trophy, Star, X } from 'lucide-react';
import { TeamSelectionModal } from './TeamSelectionModal';

interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  price?: number;
  logo_url?: string;
  matches_in_period?: number;
  matches_prev_window?: number;
  match_volume?: number;
}

interface SelectedTeamsWidgetProps {
  selectedTeams: Team[];
  benchTeam: Team | null;
  budgetSpent: number;
  budgetRemaining: number;
  salaryCapacity: number;
  bonusCreditsUsed?: number;
  totalBudget?: number;
  roundType: 'daily' | 'weekly' | 'monthly' | 'private';
  onRemoveTeam?: (index: number) => void;
  proTeams?: Team[];
  amateurTeams?: Team[];
  onTeamSelect?: (team: Team) => void;
  starTeamId?: string | null;
  onToggleStar?: (teamId: string) => void;
  onOpenMultiTeamSelector?: () => void;
}

const TeamCard: React.FC<{
  team: Team;
  index: number;
  onRemove?: () => void;
  starTeamId?: string | null;
  onToggleStar?: (teamId: string) => void;
}> = ({
  team,
  index,
  onRemove,
  starTeamId,
  onToggleStar
}) => {
  const isAmateur = team.type === 'amateur';
  const isStarred = starTeamId === team.id;

  const StarButton = () => (
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onToggleStar?.(team.id);
      }}
      className={`absolute bottom-1 right-1 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 border ${
        isStarred 
          ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 border-yellow-400/50 shadow-[0_0_10px_rgba(251,191,36,0.5)]'
          : 'bg-transparent hover:bg-yellow-500/20 border-gray-500/30 hover:border-yellow-400/50'
      }`}
    >
      <Star 
        className={`w-3 h-3 ${
          isStarred 
            ? 'fill-yellow-300 text-yellow-300' 
            : 'text-gray-400 hover:text-yellow-400'
        }`} 
      />
    </button>
  );

  // Glass UI styling
  const glassBorder = isAmateur 
    ? 'border-glass-border bg-gradient-to-r from-glass-accent/20 via-glass-secondary/20 to-glass-accent/20 p-[2px]' 
    : 'border-glass-border bg-gradient-to-r from-glass-primary/20 via-glass-purple/20 to-glass-primary/20 p-[2px]';
  
  const glassEffect = 'bg-glass-card backdrop-blur-glass border border-glass-border shadow-glass hover:shadow-glass-lg';

  return (
    <div className={`relative rounded-xl w-full aspect-square ${glassBorder} transition-all duration-500 hover:scale-105 group`}>
      <div className={`relative rounded-[10px] ${glassEffect} p-3 h-full flex flex-col overflow-hidden`}>
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isAmateur ? 'bg-glass-accent' : 'bg-glass-primary'} animate-ping`}></div>
          <div className={`absolute bottom-4 left-4 w-1 h-1 rounded-full ${isAmateur ? 'bg-glass-secondary' : 'bg-glass-purple'} animate-ping delay-300`}></div>
        </div>

        {/* Team Logo */}
        <div className="flex justify-center mb-2 relative z-10">
          {team.logo_url ? (
            <div className={`relative p-2 rounded-lg bg-glass-card/50 border border-glass-border shadow-lg`}>
              <img src={team.logo_url} alt={team.name} className="w-12 h-12 object-contain filter drop-shadow-xl" />
            </div>
          ) : (
            <div className={`w-16 h-16 rounded-lg flex items-center justify-center bg-glass-card/50 border border-glass-border shadow-lg`}>
              {isAmateur ? <Users className="w-8 h-8 text-glass-accent" /> : <Trophy className="w-8 h-8 text-glass-primary" />}
            </div>
          )}
        </div>

        {/* Team Name */}
        <h3 className={`font-bold text-sm text-center mb-2 line-clamp-2 leading-tight tracking-wide text-glass-text drop-shadow-lg`}>
          {team.name.toUpperCase()}
          {isStarred && (
            <span className="block text-[10px] text-glass-accent font-bold tracking-wider mt-1">
              DOUBLE POINTS
            </span>
          )}
        </h3>

        {/* Stats Grid */}
        <div className="space-y-1.5 flex-grow relative z-10">
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div>
              <div className="text-glass-muted font-bold text-[10px] mb-0.5 tracking-wide">CREDITS</div>
              <div className={`font-bold text-sm text-glass-accent drop-shadow-lg`}>
                {team.price || 0}
              </div>
            </div>
            <div>
              <div className="text-glass-muted font-bold text-[10px] mb-0.5 tracking-wide">MATCHES</div>
              <div className={`font-bold text-sm text-glass-accent drop-shadow-lg`}>
                {team.type === 'pro' ? team.matches_in_period || 0 : team.match_volume || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Amateur Bonus Badge */}
        {isAmateur && (
          <div className="absolute top-1 left-1 z-20">
            <Badge className="bg-gradient-to-r from-glass-accent to-glass-secondary text-white text-[8px] px-1.5 py-0.5 border border-glass-border shadow-glass animate-pulse">
              +25%
            </Badge>
          </div>
        )}

        {/* Remove Button */}
        <div className="absolute top-1 right-1 z-20">
          <button 
            onClick={onRemove} 
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 bg-glass-card/80 backdrop-blur-sm hover:bg-destructive/80 border border-glass-border hover:border-destructive/50 shadow-glass`}
          >
            <X className="w-3 h-3 text-glass-text hover:text-white" />
          </button>
        </div>

        {/* Star Button */}
        {onToggleStar && <StarButton />}
      </div>
    </div>
  );
};

const PlaceholderCard: React.FC<{
  index: number;
  onClick?: () => void;
}> = ({
  index,
  onClick
}) => {
  return (
    <div 
      className="relative rounded-xl w-full h-full border-2 border-dashed border-glass-border/30 p-[2px] transition-all duration-500 hover:border-glass-border/50 hover:shadow-glass group cursor-pointer"
      onClick={onClick}
    >
      <div className="relative rounded-[10px] bg-glass-card/20 backdrop-blur-glass p-4 h-full flex flex-col justify-center items-center overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-glass-muted animate-ping"></div>
          <div className="absolute bottom-5 left-5 w-0.5 h-0.5 rounded-full bg-glass-muted animate-ping delay-700"></div>
        </div>

        {/* Placeholder Icon */}
        <div className="w-14 h-14 rounded-lg border border-glass-border/30 bg-glass-card/20 backdrop-blur-sm flex items-center justify-center mb-6 relative z-10 transition-all duration-300 group-hover:border-glass-border/50 group-hover:bg-glass-card/30">
          <Star className="w-7 h-7 text-glass-muted group-hover:text-glass-text transition-colors duration-300" />
        </div>

        {/* Placeholder Text */}
        <div className="text-glass-muted font-bold text-sm text-center tracking-widest mb-2 relative z-10 group-hover:text-glass-text transition-colors duration-300">
          SELECT TEAM
        </div>
        
        {/* Slot Number */}
        <div className="text-glass-muted/70 text-xs tracking-wide relative z-10 group-hover:text-glass-muted transition-colors duration-300">
          Slot {index + 1}
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-glass-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  );
};

export const SelectedTeamsWidgetNew: React.FC<SelectedTeamsWidgetProps> = ({
  selectedTeams,
  benchTeam,
  budgetSpent,
  budgetRemaining,
  salaryCapacity,
  bonusCreditsUsed = 0,
  totalBudget,
  roundType,
  onRemoveTeam,
  proTeams = [],
  amateurTeams = [],
  onTeamSelect,
  starTeamId = null,
  onToggleStar,
  onOpenMultiTeamSelector
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);

  const actualTotalBudget = totalBudget || salaryCapacity;

  const handleSlotClick = (index: number) => {
    if (onOpenMultiTeamSelector) {
      onOpenMultiTeamSelector();
    } else if (onTeamSelect && (proTeams.length > 0 || amateurTeams.length > 0)) {
      setSelectedSlotIndex(index);
      setModalOpen(true);
    }
  };

  const handleTeamSelect = (team: Team) => {
    if (onTeamSelect) {
      onTeamSelect(team);
    }
    setModalOpen(false);
  };

  // Create array of 5 slots
  const slots = Array.from({ length: 5 }, (_, index) => {
    return selectedTeams[index] || null;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold text-glass-text">
            {roundType.charAt(0).toUpperCase() + roundType.slice(1)} Round
          </h2>
        </div>
        <p className="text-glass-muted text-sm text-center">
          Select 5 teams to build your ultimate fantasy roster
        </p>
      </div>

      {/* Budget Progress */}
      <div className="bg-glass-card backdrop-blur-glass rounded-xl p-4 border border-glass-border shadow-glass">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-glass-text font-medium">Budget</span>
          <div className="text-right">
            <div className="text-glass-text font-bold">
              {budgetSpent}/{actualTotalBudget} credits
            </div>
            {bonusCreditsUsed > 0 && (
              <div className="text-xs text-glass-accent font-medium">
                + {bonusCreditsUsed} bonus
              </div>
            )}
            <div className="text-glass-accent text-sm">
              {budgetRemaining} remaining
            </div>
          </div>
        </div>
        <div 
          className="h-2 bg-black/40 rounded-full shadow-inner overflow-hidden"
          role="progressbar"
          aria-valuenow={budgetSpent}
          aria-valuemin={0}
          aria-valuemax={actualTotalBudget}
          aria-label="Budget progress"
        >
          <div 
            className="h-full bg-gradient-to-r from-[#FFCC33] to-[#FF9900] rounded-full transition-all duration-200 ease-out"
            style={{ 
              width: `${Math.min(100, Math.round(budgetSpent / actualTotalBudget * 100))}%`,
              boxShadow: '0 0 8px rgba(255,204,51,0.6), 0 0 12px rgba(255,153,0,0.4)'
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-glass-muted mt-1">
          <span>0</span>
          <span>{actualTotalBudget}</span>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="space-y-4">
        {/* Mobile: First row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(0, 2).map((team, index) => (
            <div key={index} className="aspect-square">
              {team ? (
                <TeamCard 
                  team={team} 
                  index={index} 
                  onRemove={() => onRemoveTeam?.(index)} 
                  starTeamId={starTeamId} 
                  onToggleStar={onToggleStar} 
                />
              ) : (
                <PlaceholderCard 
                  index={index} 
                  onClick={() => handleSlotClick(index)} 
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile: Second row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(2, 4).map((team, index) => (
            <div key={index + 2} className="aspect-square">
              {team ? (
                <TeamCard 
                  team={team} 
                  index={index + 2} 
                  onRemove={() => onRemoveTeam?.(index + 2)} 
                  starTeamId={starTeamId} 
                  onToggleStar={onToggleStar} 
                />
              ) : (
                <PlaceholderCard 
                  index={index + 2} 
                  onClick={() => handleSlotClick(index + 2)} 
                />
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile: Third row - 1 card centered */}
        <div className="flex justify-center md:hidden">
          <div className="w-1/2 aspect-square">
            {slots[4] ? (
              <TeamCard 
                team={slots[4]} 
                index={4} 
                onRemove={() => onRemoveTeam?.(4)} 
                starTeamId={starTeamId} 
                onToggleStar={onToggleStar} 
              />
            ) : (
              <PlaceholderCard 
                index={4} 
                onClick={() => handleSlotClick(4)} 
              />
            )}
          </div>
        </div>

        {/* Tablet/Desktop: 3+2 layout over two rows with 30% larger cards */}
        <div className="hidden md:block space-y-4 max-w-5xl mx-auto">
          {/* First row - 3 cards */}
          <div className="grid grid-cols-3 gap-4 justify-center">
            {slots.slice(0, 3).map((team, index) => (
              <div key={index} className="aspect-square scale-130 mx-auto" style={{ width: '160px' }}>
                {team ? (
                  <TeamCard 
                    team={team} 
                    index={index} 
                    onRemove={() => onRemoveTeam?.(index)} 
                    starTeamId={starTeamId} 
                    onToggleStar={onToggleStar} 
                  />
                ) : (
                  <PlaceholderCard 
                    index={index} 
                    onClick={() => handleSlotClick(index)} 
                  />
                )}
              </div>
            ))}
          </div>
          
          {/* Second row - 2 cards centered */}
          <div className="grid grid-cols-2 gap-4 justify-center max-w-xl mx-auto">
            {slots.slice(3, 5).map((team, index) => (
              <div key={index + 3} className="aspect-square scale-130 mx-auto" style={{ width: '160px' }}>
                {team ? (
                  <TeamCard 
                    team={team} 
                    index={index + 3} 
                    onRemove={() => onRemoveTeam?.(index + 3)} 
                    starTeamId={starTeamId} 
                    onToggleStar={onToggleStar} 
                  />
                ) : (
                  <PlaceholderCard 
                    index={index + 3} 
                    onClick={() => handleSlotClick(index + 3)} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bench Team */}
      {benchTeam && (
        <div className="max-w-xs mx-auto">
          <h3 className="text-glass-text font-medium text-center mb-2 flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-glass-accent" />
            Bench Team
          </h3>
          <div className="scale-75 origin-center">
            <TeamCard 
              team={benchTeam} 
              index={5} 
              onRemove={() => onRemoveTeam?.(5)} 
              starTeamId={starTeamId} 
              onToggleStar={onToggleStar} 
            />
          </div>
        </div>
      )}

      {/* Team Selection Modal */}
      <TeamSelectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        proTeams={proTeams}
        amateurTeams={amateurTeams}
        selectedTeams={selectedTeams}
        onTeamSelect={handleTeamSelect}
        budgetRemaining={budgetRemaining}
        slotIndex={selectedSlotIndex}
      />
    </div>
  );
};