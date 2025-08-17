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
  roundType: 'daily' | 'weekly' | 'monthly';
}

const TeamCard: React.FC<{ team: Team; index: number }> = ({ team, index }) => {
  const isAmateur = team.type === 'amateur';
  
  // Neon Top Trumps styling
  const neonBorder = isAmateur 
    ? 'border-transparent bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 p-[2px]' 
    : 'border-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 p-[2px]';
  
  const glowEffect = isAmateur
    ? 'shadow-[0_0_30px_rgba(239,68,68,0.6),0_0_60px_rgba(251,146,60,0.4),inset_0_0_20px_rgba(255,165,0,0.1)]'
    : 'shadow-[0_0_30px_rgba(147,51,234,0.6),0_0_60px_rgba(59,130,246,0.4),inset_0_0_20px_rgba(139,92,246,0.1)]';

  return (
    <div 
      className={`relative rounded-xl w-full h-full ${neonBorder} ${glowEffect} transition-all duration-500 hover:scale-105 hover:shadow-2xl animate-pulse-glow`}
      style={{
        animation: 'pulse-glow 3s ease-in-out infinite alternate'
      }}
    >
      <div 
        className="relative rounded-[10px] bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 h-full flex flex-col justify-between overflow-hidden"
        style={{
          background: `linear-gradient(135deg, 
            ${isAmateur 
              ? 'rgba(15,15,15,0.95) 0%, rgba(30,15,15,0.9) 30%, rgba(45,20,10,0.95) 100%' 
              : 'rgba(15,15,15,0.95) 0%, rgba(15,15,30,0.9) 30%, rgba(20,10,45,0.95) 100%'
            })`,
          backdropFilter: 'blur(10px)'
        }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isAmateur ? 'bg-orange-400' : 'bg-purple-400'} animate-ping`}></div>
          <div className={`absolute bottom-4 left-4 w-1 h-1 rounded-full ${isAmateur ? 'bg-red-400' : 'bg-blue-400'} animate-ping delay-300`}></div>
        </div>

        {/* Team Logo */}
        <div className="flex justify-center mb-4 relative z-10">
          {team.logo_url ? (
            <div className={`relative p-2 rounded-lg ${isAmateur ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20' : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20'} border ${isAmateur ? 'border-orange-400/30' : 'border-purple-400/30'}`}>
              <img 
                src={team.logo_url} 
                alt={team.name} 
                className="w-10 h-10 object-contain filter drop-shadow-lg"
              />
            </div>
          ) : (
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isAmateur ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-400/30' : 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-400/30'} border`}>
              {isAmateur ? <Users className="w-6 h-6 text-orange-400" /> : <Trophy className="w-6 h-6 text-purple-400" />}
            </div>
          )}
        </div>

        {/* Team Name */}
        <h3 className={`font-bold text-sm text-center mb-4 line-clamp-2 leading-tight min-h-[32px] flex items-center justify-center tracking-wide ${isAmateur ? 'text-orange-100' : 'text-purple-100'} drop-shadow-lg`}>
          {team.name.toUpperCase()}
        </h3>

        {/* Team Stats - Top Trumps Style */}
        <div className="space-y-3 flex-grow relative z-10">
          <div className="text-center">
            <div className="text-orange-400 font-bold text-xs mb-1 tracking-widest">CREDITS COST</div>
            <div className={`font-bold text-xl ${isAmateur ? 'text-orange-300' : 'text-cyan-300'} drop-shadow-lg`}>
              {team.price || 0}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-orange-400 font-bold text-xs mb-1 tracking-widest">MATCHES SCHEDULED</div>
            <div className={`font-bold text-xl ${isAmateur ? 'text-orange-300' : 'text-cyan-300'} drop-shadow-lg`}>
              {team.type === 'pro' ? (team.matches_in_period || 0) : (team.matches_prev_window || 0)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-orange-400 font-bold text-xs mb-1 tracking-widest">ESPORTS</div>
            <div className={`font-bold text-sm tracking-wide ${isAmateur ? 'text-red-300' : 'text-blue-300'} drop-shadow-lg`}>
              {isAmateur ? 'AMATEUR' : 'PRO'}
            </div>
          </div>
        </div>

        {/* Selected Status Button */}
        <div className="mt-4 relative z-10">
          <div className={`w-full py-2 px-3 rounded-lg text-center font-bold text-xs tracking-widest ${
            isAmateur 
              ? 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
              : 'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.5)]'
          } border ${isAmateur ? 'border-orange-400/50' : 'border-purple-400/50'} transition-all duration-300 hover:scale-105`}>
            SELECTED
          </div>
        </div>

        {/* Amateur Bonus Badge */}
        {isAmateur && (
          <div className="absolute -top-2 -right-2 z-20">
            <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 border border-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.6)] animate-pulse">
              +25%
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

const PlaceholderCard: React.FC<{ index: number }> = ({ index }) => {
  return (
    <div className="relative rounded-xl w-full h-full border-2 border-dashed border-gray-600/30 p-[2px] transition-all duration-500 hover:border-gray-500/50 hover:shadow-[0_0_20px_rgba(107,114,128,0.3)] group">
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
    </div>
  );
};

export const SelectedTeamsWidget: React.FC<SelectedTeamsWidgetProps> = ({
  selectedTeams,
  benchTeam,
  budgetSpent,
  budgetRemaining,
  salaryCapacity,
  roundType
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
            {roundType.charAt(0).toUpperCase() + roundType.slice(1)} Round Team
          </span>
        </h2>
        <p className="text-gray-400 text-sm">
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
        <Progress 
          value={Math.min(100, Math.round((budgetSpent / salaryCapacity) * 100))} 
          className="h-3 bg-gray-800 rounded-full overflow-hidden"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>0</span>
          <span>{salaryCapacity}</span>
        </div>
      </div>

      {/* Team Cards Grid */}
      <div className="space-y-3 md:space-y-0">
        {/* Mobile: First row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(0, 2).map((team, index) => (
            <div key={index} className="aspect-square">
              {team ? (
                <TeamCard team={team} index={index} />
              ) : (
                <PlaceholderCard index={index} />
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile: Second row - 2 cards */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {slots.slice(2, 4).map((team, index) => (
            <div key={index + 2} className="aspect-square">
              {team ? (
                <TeamCard team={team} index={index + 2} />
              ) : (
                <PlaceholderCard index={index + 2} />
              )}
            </div>
          ))}
        </div>
        
        {/* Mobile: Third row - 1 card centered */}
        <div className="flex justify-center md:hidden">
          <div className="w-1/2 aspect-square">
            {slots[4] ? (
              <TeamCard team={slots[4]} index={4} />
            ) : (
              <PlaceholderCard index={4} />
            )}
          </div>
        </div>

        {/* Desktop: All 5 cards in one row */}
        <div className="hidden md:grid md:grid-cols-5 md:gap-4">
          {slots.map((team, index) => (
            <div key={index} className="aspect-square">
              {team ? (
                <TeamCard team={team} index={index} />
              ) : (
                <PlaceholderCard index={index} />
              )}
            </div>
          ))}
        </div>
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

    </div>
  );
};