import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Trophy, Star } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  price?: number;
  logo_url?: string;
  matches_in_period?: number;
  matches_prev_window?: number;
}

interface SelectedTeamsWidgetProps {
  selectedTeams: Team[];
  benchTeam: Team | null;
  budgetSpent: number;
  budgetRemaining: number;
  salaryCapacity: number;
}

const TeamCard: React.FC<{ team: Team; index: number }> = ({ team, index }) => {
  const isAmateur = team.type === 'amateur';
  const borderColor = isAmateur ? 'border-neon-orange' : 'border-neon-purple';
  const glowColor = isAmateur ? 'shadow-[0_0_20px_rgba(251,146,60,0.4)]' : 'shadow-[0_0_20px_rgba(168,85,247,0.4)]';
  const gradientBg = isAmateur 
    ? 'bg-gradient-to-br from-orange-950/80 via-red-950/60 to-orange-900/40' 
    : 'bg-gradient-to-br from-purple-950/80 via-blue-950/60 to-purple-900/40';

  return (
    <div 
      className={`relative rounded-xl p-4 ${gradientBg} ${borderColor} border-2 ${glowColor} backdrop-blur-sm transition-all duration-300 hover:scale-105 min-h-[180px] flex flex-col justify-between`}
      style={{
        background: `${isAmateur 
          ? 'linear-gradient(135deg, rgba(120,53,15,0.9) 0%, rgba(153,27,27,0.8) 50%, rgba(194,65,12,0.7) 100%)' 
          : 'linear-gradient(135deg, rgba(59,7,100,0.9) 0%, rgba(30,27,75,0.8) 50%, rgba(91,33,182,0.7) 100%)'
        }, radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)`
      }}
    >
      {/* Team Logo */}
      <div className="flex justify-center mb-3">
        {team.logo_url ? (
          <img 
            src={team.logo_url} 
            alt={team.name} 
            className="w-12 h-12 rounded-lg border border-white/20 bg-black/20 backdrop-blur-sm object-contain p-1"
          />
        ) : (
          <div className={`w-12 h-12 rounded-lg border border-white/20 bg-black/20 backdrop-blur-sm flex items-center justify-center ${isAmateur ? 'text-orange-400' : 'text-purple-400'}`}>
            {isAmateur ? <Users className="w-6 h-6" /> : <Trophy className="w-6 h-6" />}
          </div>
        )}
      </div>

      {/* Team Name */}
      <h3 className="text-white font-bold text-sm text-center mb-3 line-clamp-2 leading-tight min-h-[36px] flex items-center justify-center">
        {team.name}
      </h3>

      {/* Team Stats */}
      <div className="space-y-2 flex-grow">
        <div className="text-center">
          <div className="text-orange-400 font-medium text-xs mb-1">CREDITS COST</div>
          <div className="text-white font-bold text-lg">{team.price || 0}</div>
        </div>
        
        <div className="text-center">
          <div className="text-orange-400 font-medium text-xs mb-1">MATCHES SCHEDULED</div>
          <div className="text-white font-bold text-lg">
            {team.type === 'pro' ? (team.matches_in_period || 0) : (team.matches_prev_window || 0)}
          </div>
        </div>
        
        <div className="text-center">
          <div className="text-orange-400 font-medium text-xs mb-1">ESPORTS</div>
          <div className={`font-bold text-sm ${isAmateur ? 'text-orange-300' : 'text-purple-300'}`}>
            {isAmateur ? 'AMATEUR' : 'PRO'}
          </div>
        </div>
      </div>

      {/* Select Team Button */}
      <div className="mt-3">
        <div className={`w-full py-2 px-3 rounded-lg text-center font-medium text-xs ${
          isAmateur 
            ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' 
            : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
        } border border-white/20`}>
          SELECTED
        </div>
      </div>

      {/* Amateur Bonus Badge */}
      {isAmateur && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 border border-orange-400 shadow-lg">
            +25%
          </Badge>
        </div>
      )}
    </div>
  );
};

const PlaceholderCard: React.FC<{ index: number }> = ({ index }) => {
  return (
    <div className="relative rounded-xl p-4 bg-gradient-to-br from-gray-900/60 via-gray-800/40 to-gray-900/60 border-2 border-gray-700/50 border-dashed backdrop-blur-sm min-h-[180px] flex flex-col justify-center items-center transition-all duration-300 hover:border-gray-600/70 hover:shadow-[0_0_15px_rgba(107,114,128,0.3)]">
      {/* Placeholder Icon */}
      <div className="w-12 h-12 rounded-lg border border-gray-600/50 bg-gray-800/30 backdrop-blur-sm flex items-center justify-center mb-4">
        <Star className="w-6 h-6 text-gray-500" />
      </div>

      {/* Placeholder Text */}
      <div className="text-gray-400 font-medium text-sm text-center">
        SELECT TEAM
      </div>
      
      {/* Slot Number */}
      <div className="text-gray-600 text-xs mt-2">
        Slot {index + 1}
      </div>
    </div>
  );
};

export const SelectedTeamsWidget: React.FC<SelectedTeamsWidgetProps> = ({
  selectedTeams,
  benchTeam,
  budgetSpent,
  budgetRemaining,
  salaryCapacity
}) => {
  // Create array of 5 slots
  const slots = Array.from({ length: 5 }, (_, index) => {
    return selectedTeams[index] || null;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Users className="h-6 w-6 text-neon-purple" />
          <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
            Dream Team Selection
          </span>
        </h2>
        <p className="text-gray-400 text-sm">
          Select 5 teams to build your ultimate fantasy roster
        </p>
      </div>

      {/* Team Cards Grid */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        {/* Mobile: 3 cards on first row */}
        {slots.slice(0, 3).map((team, index) => (
          <div key={index} className="col-span-1">
            {team ? (
              <TeamCard team={team} index={index} />
            ) : (
              <PlaceholderCard index={index} />
            )}
          </div>
        ))}
        
        {/* Mobile: 2 cards on second row, centered */}
        <div className="col-span-3 md:hidden">
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
            {slots.slice(3, 5).map((team, index) => (
              <div key={index + 3}>
                {team ? (
                  <TeamCard team={team} index={index + 3} />
                ) : (
                  <PlaceholderCard index={index + 3} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: Show remaining cards normally */}
        {slots.slice(3, 5).map((team, index) => (
          <div key={index + 3} className="hidden md:block col-span-1">
            {team ? (
              <TeamCard team={team} index={index + 3} />
            ) : (
              <PlaceholderCard index={index + 3} />
            )}
          </div>
        ))}
      </div>

      {/* Bench Team */}
      {benchTeam && (
        <div className="max-w-xs mx-auto">
          <h3 className="text-white font-medium text-center mb-2 flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4 text-orange-400" />
            Bench Team
          </h3>
          <div className="scale-75 origin-center">
            <TeamCard team={benchTeam} index={5} />
          </div>
        </div>
      )}

      {/* Budget Progress */}
      <div className="bg-gradient-to-r from-gray-900/80 to-gray-800/80 rounded-xl p-4 border border-gray-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-gray-300 font-medium">Budget</span>
          <span className="text-white font-bold">
            {budgetSpent}/{salaryCapacity} credits • 
            <span className="text-green-400 ml-1">{budgetRemaining} remaining</span>
          </span>
        </div>
        <Progress 
          value={Math.min(100, Math.round((budgetSpent / salaryCapacity) * 100))} 
          className="h-3 bg-gray-800 rounded-full overflow-hidden"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{salaryCapacity}</span>
        </div>
      </div>
    </div>
  );
};