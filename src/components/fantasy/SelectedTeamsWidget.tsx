import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Trophy, Star, X } from 'lucide-react';
import { TeamSelectionModal } from './TeamSelectionModal';
import { TeamCard } from './TeamCard';
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
  roundType: 'daily' | 'weekly' | 'monthly';
  onRemoveTeam?: (index: number) => void;
  proTeams?: Team[];
  amateurTeams?: Team[];
  onTeamSelect?: (team: Team) => void;
  starTeamId?: string | null;
  onToggleStar?: (teamId: string) => void;
  onOpenMultiTeamSelector?: () => void;
}
const PlaceholderCard: React.FC<{
  index: number;
  onClick?: () => void;
}> = ({
  index,
  onClick
}) => {
  return <div 
    className="relative rounded-xl w-full h-full border-2 border-dashed border-gray-600/30 p-[2px] transition-all duration-500 hover:border-gray-500/50 hover:shadow-[0_0_20px_rgba(107,114,128,0.3)] group cursor-pointer"
    onClick={onClick}
  >
      <div className="relative rounded-[10px] bg-gradient-to-br from-gray-900/80 via-black/90 to-gray-900/80 p-4 h-full flex flex-col justify-center items-center backdrop-blur-sm overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-3 right-3 w-1 h-1 rounded-full bg-gray-400 animate-ping"></div>
          <div className="absolute bottom-5 left-5 w-0.5 h-0.5 rounded-full bg-gray-500 animate-ping delay-700"></div>
        </div>

        {/* Placeholder Icon */}
        <div className="w-14 h-14 rounded-lg border border-gray-600/30 bg-gray-800/20 backdrop-blur-sm flex items-center justify-center mb-6 relative z-10 transition-all duration-300 group-hover:border-gray-500/50 group-hover:bg-gray-700/30">
          <Star className="w-7 h-7 text-gray-500 group-hover:text-gray-400 transition-colors duration-300" />
        </div>

        {/* Placeholder Text */}
        <div className="text-gray-400 font-bold text-sm text-center tracking-widest mb-2 relative z-10 group-hover:text-gray-300 transition-colors duration-300">
          SELECT TEAM
        </div>
        
        {/* Slot Number */}
        <div className="text-gray-600 text-xs tracking-wide relative z-10 group-hover:text-gray-500 transition-colors duration-300">
          Slot {index + 1}
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-gray-700/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>;
};
export const SelectedTeamsWidget: React.FC<SelectedTeamsWidgetProps> = ({
  selectedTeams,
  benchTeam,
  budgetSpent,
  budgetRemaining,
  salaryCapacity,
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
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-center">
          <h2 className="text-2xl font-bold" style={{ color: '#8B5CF6' }}>
            {roundType.charAt(0).toUpperCase() + roundType.slice(1)} Round
          </h2>
        </div>
        <p className="text-gray-400 text-sm text-center">
          Select 5 teams to build your ultimate fantasy roster
        </p>
      </div>

      {/* Budget Progress */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-300 font-medium">Budget</span>
          <span className="text-white font-bold">
            {budgetSpent}/{salaryCapacity} credits • 
            <span className="text-green-400 ml-1">{budgetRemaining} remaining</span>
          </span>
        </div>
        <Progress value={Math.min(100, Math.round(budgetSpent / salaryCapacity * 100))} className="h-3 bg-gray-800 rounded-full overflow-hidden" />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{salaryCapacity}</span>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="space-y-4">
        {/* Mobile: First row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(0, 2).map((team, index) => <div key={index} className="aspect-square">
              {team ? <TeamCard 
                team={team} 
                isSelected={true} 
                onClick={() => onRemoveTeam?.(index)} 
                showStarToggle={true} 
                isStarred={starTeamId === team.id} 
                onToggleStar={() => onToggleStar?.(team.id)} 
                variant="selection" 
              /> : <PlaceholderCard index={index} onClick={() => handleSlotClick(index)} />}
            </div>)}
        </div>
        
        {/* Mobile: Second row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(2, 4).map((team, index) => <div key={index + 2} className="aspect-square">
              {team ? <TeamCard 
                team={team} 
                isSelected={true} 
                onClick={() => onRemoveTeam?.(index + 2)} 
                showStarToggle={true} 
                isStarred={starTeamId === team.id} 
                onToggleStar={() => onToggleStar?.(team.id)} 
                variant="selection" 
              /> : <PlaceholderCard index={index + 2} onClick={() => handleSlotClick(index + 2)} />}
            </div>)}
        </div>
        
        {/* Mobile: Third row - 1 card centered */}
        <div className="flex justify-center md:hidden">
          <div className="w-1/2 aspect-square">
            {slots[4] ? <TeamCard 
              team={slots[4]} 
              isSelected={true} 
              onClick={() => onRemoveTeam?.(4)} 
              showStarToggle={true} 
              isStarred={starTeamId === slots[4].id} 
              onToggleStar={() => onToggleStar?.(slots[4].id)} 
              variant="selection" 
            /> : <PlaceholderCard index={4} onClick={() => handleSlotClick(4)} />}
          </div>
        </div>

        {/* Tablet/Desktop: 3+2 layout over two rows with 30% larger cards */}
        <div className="hidden md:block space-y-4 max-w-5xl mx-auto">
          {/* First row - 3 cards */}
          <div className="grid grid-cols-3 gap-4 justify-center">
            {slots.slice(0, 3).map((team, index) => <div key={index} className="aspect-square scale-130 mx-auto" style={{ width: '160px' }}>
                {team ? <TeamCard 
                  team={team} 
                  isSelected={true} 
                  onClick={() => onRemoveTeam?.(index)} 
                  showStarToggle={true} 
                  isStarred={starTeamId === team.id} 
                  onToggleStar={() => onToggleStar?.(team.id)} 
                  variant="selection" 
                /> : <PlaceholderCard index={index} onClick={() => handleSlotClick(index)} />}
              </div>)}
          </div>
          
          {/* Second row - 2 cards centered */}
          <div className="grid grid-cols-2 gap-4 justify-center max-w-xl mx-auto">
            {slots.slice(3, 5).map((team, index) => <div key={index + 3} className="aspect-square scale-130 mx-auto" style={{ width: '160px' }}>
                {team ? <TeamCard 
                  team={team} 
                  isSelected={true} 
                  onClick={() => onRemoveTeam?.(index + 3)} 
                  showStarToggle={true} 
                  isStarred={starTeamId === team.id} 
                  onToggleStar={() => onToggleStar?.(team.id)} 
                  variant="selection" 
                /> : <PlaceholderCard index={index + 3} onClick={() => handleSlotClick(index + 3)} />}
              </div>)}
          </div>
        </div>
      </div>

      {/* Bench Team */}
      {benchTeam && <div className="max-w-xs mx-auto">
          <h3 className="text-white font-medium text-center mb-2 flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-orange-400" />
            Bench Team
          </h3>
          <div className="scale-75 origin-center">
            <TeamCard 
              team={benchTeam} 
              isSelected={true} 
              onClick={() => onRemoveTeam?.(5)} 
              showStarToggle={false} 
              variant="selection" 
            />
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