import React from 'react';
import { cn } from '@/lib/utils';

// Import all esports logos
import counterStrike2Logo from '@/assets/logos/esports/counter-strike-2.png';
import leagueOfLegendsLogo from '@/assets/logos/esports/league-of-legends.png';
import dota2Logo from '@/assets/logos/esports/dota-2.png';
import valorantLogo from '@/assets/logos/esports/valorant.png';
import eaSportsFcLogo from '@/assets/logos/esports/ea-sports-fc.png';
import rainbowSixSiegeLogo from '@/assets/logos/esports/rainbow-six-siege.png';
import rocketLeagueLogo from '@/assets/logos/esports/rocket-league.png';
import starcraft2Logo from '@/assets/logos/esports/starcraft-2.png';
import overwatchLogo from '@/assets/logos/esports/overwatch.png';
import honorOfKingsLogo from '@/assets/logos/esports/honor-of-kings.png';
import callOfDutyLogo from '@/assets/logos/esports/call-of-duty.png';
import lolWildRiftLogo from '@/assets/logos/esports/lol-wild-rift.png';
import pubgLogo from '@/assets/logos/esports/pubg.png';
import mobileLegendsLogo from '@/assets/logos/esports/mobile-legends.png';

export interface EsportsLogoFilterProps {
  selectedGameType: string;
  onGameTypeChange: (value: string) => void;
}

const gameOptions = [
  { value: 'all', label: 'All Games', logo: null },
  { value: 'counter-strike', label: 'Counter-Strike 2', logo: counterStrike2Logo },
  { value: 'lol', label: 'League of Legends', logo: leagueOfLegendsLogo },
  { value: 'dota2', label: 'Dota 2', logo: dota2Logo },
  { value: 'valorant', label: 'Valorant', logo: valorantLogo },
  { value: 'rainbow-6-siege', label: 'Rainbow Six Siege', logo: rainbowSixSiegeLogo },
  { value: 'rocket-league', label: 'Rocket League', logo: rocketLeagueLogo },
  { value: 'starcraft-2', label: 'StarCraft 2', logo: starcraft2Logo },
  { value: 'overwatch', label: 'Overwatch', logo: overwatchLogo },
  { value: 'king-of-glory', label: 'Honor of Kings', logo: honorOfKingsLogo },
  { value: 'mobile-legends', label: 'Mobile Legends', logo: mobileLegendsLogo },
];

export const EsportsLogoFilter: React.FC<EsportsLogoFilterProps> = ({
  selectedGameType,
  onGameTypeChange,
}) => {
  return (
    <div className="mb-4 pt-[5px]">
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide pb-2 px-1">
        {gameOptions.map((game) => (
          <button
            key={game.value}
            onClick={() => onGameTypeChange(game.value)}
            className={cn(
              "flex-shrink-0 p-2 rounded-xl border-2 transition-all duration-200",
              "w-20 h-32 flex items-center justify-center",
              "hover:scale-105 active:scale-95",
              "focus:outline-none focus:ring-2 focus:ring-theme-purple focus:ring-offset-2 focus:ring-offset-theme-gray-dark",
              selectedGameType === game.value
                ? "border-theme-purple shadow-lg shadow-theme-purple/30 [background:_#8B5cf633]"
                : "border-theme-gray-medium hover:border-theme-purple/50 hover:bg-theme-purple/10 [background:_#374151]",
              // Touch-friendly tap highlight
              "touch-manipulation select-none",
              // Mobile tap highlight
              "[&:active]:bg-theme-purple/20 [&:active]:border-theme-purple"
            )}
            aria-label={`Filter by ${game.label}`}
            title={game.label}
          >
            {game.logo ? (
              <img
                src={game.logo}
                alt={game.label}
                className="w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <span className="text-xs font-medium text-white">All</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
