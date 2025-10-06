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
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide py-2 px-1">
        {gameOptions.map((game) => (
          <button
            key={game.value}
            onClick={() => onGameTypeChange(game.value)}
            className={cn(
              "flex-shrink-0 p-2 rounded-xl transition-all",
              "w-20 h-32 flex items-center justify-center",
              "focus:outline-none touch-manipulation select-none",
              // Premium dark gradient card base
              "bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28]",
              "shadow-[0_4px_15px_rgba(0,0,0,0.4)]",
              // Inner border
              "relative before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none",
              // Interaction states
              "transition-all duration-[250ms] ease-in-out",
              selectedGameType === game.value
                ? [
                    // Selected: bright purple outline + glow
                    "border-2 border-[#965AFF]",
                    "shadow-[0_0_20px_rgba(150,90,255,0.4),0_4px_15px_rgba(0,0,0,0.4)]",
                    // Subtle lift on selected
                    "translate-y-[-2px]",
                  ]
                : [
                    // Non-selected
                    "border-2 border-transparent",
                    "hover:translate-y-[-3px] hover:scale-[1.02]",
                    "hover:shadow-[0_0_15px_rgba(150,90,255,0.2),0_4px_15px_rgba(0,0,0,0.4)]",
                  ]
            )}
            aria-label={`Filter by ${game.label}`}
            title={game.label}
          >
            {game.logo ? (
              <img
                src={game.logo}
                alt={game.label}
                className={cn(
                  "w-full h-full object-contain",
                  // Increase contrast + optional glow on selected
                  selectedGameType === game.value && "drop-shadow-[0_0_8px_rgba(150,90,255,0.5)] brightness-110 contrast-110"
                )}
                draggable={false}
              />
            ) : (
              <span className="text-xs font-medium text-[#E8EAF5]">All</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
