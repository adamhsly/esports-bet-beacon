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
  showBudgetError?: boolean;
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

  // Neon Top Trumps styling
  const neonBorder = isAmateur ? 'border-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 p-[2px]' : 'border-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 p-[2px]';
  const glowEffect = isAmateur ? 'shadow-[0_0_30px_rgba(239,68,68,0.6),0_0_60px_rgba(251,146,60,0.4),inset_0_0_20px_rgba(255,165,0,0.1)]' : 'shadow-[0_0_30px_rgba(147,51,234,0.6),0_0_60px_rgba(59,130,246,0.4),inset_0_0_20px_rgba(139,92,246,0.1)]';
  return <div className={`relative rounded-xl w-full aspect-square ${neonBorder} ${glowEffect} transition-all duration-500 hover:scale-105 hover:shadow-2xl animate-pulse-glow`} style={{
    animation: 'pulse-glow 3s ease-in-out infinite alternate'
  }}>
      <div className="relative rounded-[10px] bg-gradient-to-br from-gray-900 via-black to-gray-900 p-3 h-full flex flex-col overflow-hidden" style={{
      background: `linear-gradient(135deg, 
            ${isAmateur ? 'rgba(15,15,15,0.95) 0%, rgba(30,15,15,0.9) 30%, rgba(45,20,10,0.95) 100%' : 'rgba(15,15,15,0.95) 0%, rgba(15,15,30,0.9) 30%, rgba(20,10,45,0.95) 100%'})`,
      backdropFilter: 'blur(10px)'
    }}>
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isAmateur ? 'bg-orange-400' : 'bg-purple-400'} animate-ping`}></div>
          <div className={`absolute bottom-4 left-4 w-1 h-1 rounded-full ${isAmateur ? 'bg-red-400' : 'bg-blue-400'} animate-ping delay-300`}></div>
        </div>

        {/* Very Prominent Team Logo */}
        <div className="flex justify-center mb-2 relative z-10">
          {team.logo_url ? <div className={`relative p-2 rounded-lg ${isAmateur ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30' : 'bg-gradient-to-br from-purple-500/30 to-blue-500/30'} border ${isAmateur ? 'border-orange-400/50' : 'border-purple-400/50'} shadow-lg`}>
              <img src={team.logo_url} alt={team.name} className="w-12 h-12 object-contain filter drop-shadow-xl" />
            </div> : <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${isAmateur ? 'bg-gradient-to-br from-orange-500/30 to-red-500/30 border-orange-400/50' : 'bg-gradient-to-br from-purple-500/30 to-blue-500/30 border-purple-400/50'} border shadow-lg`}>
              {isAmateur ? <Users className="w-8 h-8 text-orange-400" /> : <Trophy className="w-8 h-8 text-purple-400" />}
            </div>}
        </div>

        {/* Team Name - Larger than other data */}
        <h3 className={`font-bold text-xs text-center mb-2 line-clamp-2 leading-tight tracking-wide ${isAmateur ? 'text-orange-100' : 'text-purple-100'} drop-shadow-lg`}>
          {team.name.toUpperCase()}
          {isStarred && (
            <span className="block text-[9px] text-yellow-300 font-bold tracking-wider mt-0.5">
              DOUBLE POINTS
            </span>
          )}
        </h3>

        {/* Compact Stats Grid */}
        <div className="space-y-1.5 flex-grow relative z-10">
          <div className="grid grid-cols-2 gap-1.5 text-center">
            <div>
              <div className="text-orange-400 font-bold text-[10px] mb-0.5 tracking-wide">CREDITS</div>
              <div className={`font-bold text-sm ${isAmateur ? 'text-orange-300' : 'text-cyan-300'} drop-shadow-lg`}>
                {team.price || 0}
              </div>
            </div>
            <div>
              <div className="text-orange-400 font-bold text-[10px] mb-0.5 tracking-wide">MATCHES</div>
              <div className={`font-bold text-sm ${isAmateur ? 'text-orange-300' : 'text-cyan-300'} drop-shadow-lg`}>
                {team.match_volume ?? team.matches_in_period ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* Amateur Bonus Badge - Top Left */}
        {isAmateur && <div className="absolute top-1 left-1 z-20">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[8px] px-1.5 py-0.5 border border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.6)] animate-pulse">
              +25%
            </Badge>
          </div>}

        {/* Remove Button - Top Right */}
        <div className="absolute top-1 right-1 z-20">
          <button onClick={onRemove} className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 ${isAmateur ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-[0_0_10px_rgba(147,51,234,0.5)]'} border ${isAmateur ? 'border-orange-400/50' : 'border-purple-400/50'}`}>
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

        {/* Star Button - Bottom Right */}
        {onToggleStar && <StarButton />}
      </div>
    </div>;
};
const PlaceholderCard: React.FC<{
  index: number;
  onClick?: () => void;
}> = ({
  index,
  onClick
}) => {
  return <div 
    className="relative rounded-xl w-full h-full border-2 border-purple-500/60 p-[2px] transition-all duration-500 hover:border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] group cursor-pointer"
    onClick={onClick}
  >
      <div className="relative rounded-[10px] bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 p-4 h-full flex flex-col justify-center items-center backdrop-blur-sm overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-purple-400 animate-ping"></div>
          <div className="absolute bottom-5 left-5 w-0.5 h-0.5 rounded-full bg-blue-400 animate-ping delay-700"></div>
        </div>

        {/* Placeholder Icon */}
        <div className="w-14 h-14 rounded-lg border border-purple-500/40 bg-purple-500/10 backdrop-blur-sm flex items-center justify-center mb-6 relative z-10 transition-all duration-300 group-hover:border-purple-400/60 group-hover:bg-purple-500/20">
          <Star className="w-7 h-7 text-purple-300 group-hover:text-purple-200 transition-colors duration-300" />
        </div>

        {/* Add Team Button */}
        <button className="h-7 px-4 text-xs font-semibold rounded-md bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)] hover:shadow-[0_0_15px_rgba(168,85,247,0.6)] transition-all relative z-10 mb-2">
          Add Team
        </button>
        
        {/* Slot Number */}
        <div className="text-gray-300 text-xs tracking-wide relative z-10 group-hover:text-white transition-colors duration-300">
          Slot {index + 1}
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>;
};
export const SelectedTeamsWidget: React.FC<SelectedTeamsWidgetProps> = ({
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
  onOpenMultiTeamSelector,
  showBudgetError = false
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
  const slots = Array.from({
    length: 5
  }, (_, index) => {
    return selectedTeams[index] || null;
  });
  return <div className="space-y-6">

      {/* Budget Progress */}
      <div 
        data-walkthrough="budget-bar"
        className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-300 font-medium">Budget</span>
          <div className="text-right">
            <div className="text-white font-bold">
              {budgetSpent}/{actualTotalBudget} credits
            </div>
            {bonusCreditsUsed > 0 && (
              <div className="text-xs text-orange-400 font-medium">
                + {bonusCreditsUsed} bonus
              </div>
            )}
            <div className="text-green-400 text-sm">
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
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{actualTotalBudget}</span>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div data-walkthrough="team-slots" className="space-y-4">
        {/* Mobile: First row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(0, 2).map((team, index) => <div key={index} className="aspect-square">
              {team ? <TeamCard team={team} index={index} onRemove={() => onRemoveTeam?.(index)} starTeamId={starTeamId} onToggleStar={onToggleStar} /> : <PlaceholderCard index={index} onClick={() => handleSlotClick(index)} />}
            </div>)}
        </div>
        
        {/* Mobile: Second row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(2, 4).map((team, index) => <div key={index + 2} className="aspect-square">
              {team ? <TeamCard team={team} index={index + 2} onRemove={() => onRemoveTeam?.(index + 2)} starTeamId={starTeamId} onToggleStar={onToggleStar} /> : <PlaceholderCard index={index + 2} onClick={() => handleSlotClick(index + 2)} />}
            </div>)}
        </div>
        
        {/* Mobile: Third row - 1 card centered */}
        <div className="flex justify-center md:hidden">
          <div className="w-1/2 aspect-square">
            {slots[4] ? <TeamCard team={slots[4]} index={4} onRemove={() => onRemoveTeam?.(4)} starTeamId={starTeamId} onToggleStar={onToggleStar} /> : <PlaceholderCard index={4} onClick={() => handleSlotClick(4)} />}
          </div>
        </div>

        {/* Tablet/Desktop: 3+2 layout over two rows with 30% larger cards */}
        <div className="hidden md:block space-y-4 max-w-5xl mx-auto">
          {/* First row - 3 cards */}
          <div className="grid grid-cols-3 gap-4 justify-center">
            {slots.slice(0, 3).map((team, index) => <div key={index} className="aspect-square scale-130 mx-auto" style={{ width: '160px' }}>
                {team ? <TeamCard team={team} index={index} onRemove={() => onRemoveTeam?.(index)} starTeamId={starTeamId} onToggleStar={onToggleStar} /> : <PlaceholderCard index={index} onClick={() => handleSlotClick(index)} />}
              </div>)}
          </div>
          
          {/* Second row - 2 cards centered */}
          <div className="grid grid-cols-2 gap-4 justify-center max-w-xl mx-auto">
            {slots.slice(3, 5).map((team, index) => <div key={index + 3} className="aspect-square scale-130 mx-auto" style={{ width: '160px' }}>
                {team ? <TeamCard team={team} index={index + 3} onRemove={() => onRemoveTeam?.(index + 3)} starTeamId={starTeamId} onToggleStar={onToggleStar} /> : <PlaceholderCard index={index + 3} onClick={() => handleSlotClick(index + 3)} />}
              </div>)}
          </div>
        </div>
      </div>

      {/* Budget Error Message */}
      {showBudgetError && (
        <div className="text-center px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm font-medium">
            You've used your available budget without adding 5 teams. Remove a team and pick teams worth less credits!
          </p>
        </div>
      )}

      {/* Bench Team */}
      {benchTeam && <div className="max-w-xs mx-auto">
          <h3 className="text-white font-medium text-center mb-2 flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-orange-400" />
            Bench Team
          </h3>
          <div className="scale-75 origin-center">
            <TeamCard team={benchTeam} index={5} onRemove={() => onRemoveTeam?.(5)} starTeamId={starTeamId} onToggleStar={onToggleStar} />
          </div>
        </div>}

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

    </div>;
};