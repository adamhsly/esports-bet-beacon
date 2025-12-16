import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X, SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

// Import game logos
import counterStrike2Logo from '@/assets/logos/esports/counter-strike-2.png';
import leagueOfLegendsLogo from '@/assets/logos/esports/league-of-legends.png';
import dota2Logo from '@/assets/logos/esports/dota-2.png';
import valorantLogo from '@/assets/logos/esports/valorant.png';
import rocketLeagueLogo from '@/assets/logos/esports/rocket-league.png';
import overwatchLogo from '@/assets/logos/esports/overwatch.png';

export interface RoundFiltersState {
  entryType: "all" | "free" | "paid";
  gameTypes: string[]; // Multi-select now
  status: "all" | "in_progress" | "coming_soon";
  teamType: "all" | "pro" | "amateur" | "both";
}

interface RoundFiltersProps {
  filters: RoundFiltersState;
  onFiltersChange: (filters: RoundFiltersState) => void;
  resultCount: number;
}

// Game options with logos
const gameOptions = [
  { value: "all", label: "All Games", logo: null },
  { value: "counter-strike", label: "CS2", logo: counterStrike2Logo },
  { value: "lol", label: "LoL", logo: leagueOfLegendsLogo },
  { value: "dota2", label: "Dota 2", logo: dota2Logo },
  { value: "valorant", label: "Valorant", logo: valorantLogo },
  { value: "rocket-league", label: "RL", logo: rocketLeagueLogo },
  { value: "overwatch", label: "OW", logo: overwatchLogo },
];

// Status tab component - matching fantasy page TabsList styling
const StatusTabs: React.FC<{
  value: RoundFiltersState["status"];
  onChange: (value: RoundFiltersState["status"]) => void;
}> = ({ value, onChange }) => {
  const options: { value: RoundFiltersState["status"]; label: string }[] = [
    { value: "all", label: "All Rounds" },
    { value: "in_progress", label: "In Progress" },
    { value: "coming_soon", label: "Coming Soon" },
  ];

  return (
    <div className="inline-flex items-center justify-center bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1.5 gap-1.5 w-full sm:w-auto">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-250",
            value === option.value
              ? "bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)] font-semibold"
              : "text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

// Game filter pills with icons (multi-select) - matching fantasy styling
const GameFilterPills: React.FC<{
  selectedGames: string[];
  onChange: (games: string[]) => void;
}> = ({ selectedGames, onChange }) => {
  const handleToggle = (gameValue: string) => {
    if (gameValue === "all") {
      onChange(["all"]);
      return;
    }

    let newSelection: string[];
    if (selectedGames.includes(gameValue)) {
      // Remove game
      newSelection = selectedGames.filter((g) => g !== gameValue);
      // If nothing selected, default to all
      if (newSelection.length === 0 || (newSelection.length === 1 && newSelection[0] === "all")) {
        newSelection = ["all"];
      }
    } else {
      // Add game, remove "all" if it was selected
      newSelection = [...selectedGames.filter((g) => g !== "all"), gameValue];
    }
    onChange(newSelection);
  };

  const isSelected = (value: string) => {
    if (value === "all") return selectedGames.includes("all") || selectedGames.length === 0;
    return selectedGames.includes(value);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {gameOptions.map((game) => (
        <button
          key={game.value}
          onClick={() => handleToggle(game.value)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-250",
            isSelected(game.value)
              ? "bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)]"
              : "text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white"
          )}
        >
          {game.logo ? (
            <img
              src={game.logo}
              alt={game.label}
              className="w-5 h-5 object-contain"
            />
          ) : null}
          <span>{game.label}</span>
        </button>
      ))}
    </div>
  );
};

// Secondary filter pills (Entry Type and Team Type) - matching fantasy styling
const SecondaryFilterPill: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}> = ({ label, options, value, onChange }) => (
  <div className="flex items-center gap-3">
    <span className="text-sm text-[#d1d1d9] font-medium">{label}:</span>
    <div className="flex gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-250",
            value === option.value
              ? "bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_8px_rgba(122,92,255,0.3)]"
              : "text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

// Active filter chip - with purple glow styling
const ActiveFilterChip: React.FC<{
  label: string;
  onRemove: () => void;
}> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium bg-[#7a5cff]/20 text-[#a78bfa] border border-[#7a5cff]/30">
    {label}
    <button
      onClick={onRemove}
      className="hover:bg-[#7a5cff]/30 rounded-full p-0.5 transition-colors"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </span>
);

// Main filter component for desktop
const DesktopFilters: React.FC<RoundFiltersProps & { isSticky?: boolean }> = ({
  filters,
  onFiltersChange,
  resultCount,
  isSticky,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const updateFilter = <K extends keyof RoundFiltersState>(
    key: K,
    value: RoundFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const getActiveFilters = () => {
    const active: { label: string; onRemove: () => void }[] = [];

    if (filters.status !== "all") {
      active.push({
        label: filters.status === "in_progress" ? "In Progress" : "Coming Soon",
        onRemove: () => updateFilter("status", "all"),
      });
    }

    if (!filters.gameTypes.includes("all") && filters.gameTypes.length > 0) {
      filters.gameTypes.forEach((game) => {
        const gameOption = gameOptions.find((g) => g.value === game);
        if (gameOption) {
          active.push({
            label: gameOption.label,
            onRemove: () => {
              const newGames = filters.gameTypes.filter((g) => g !== game);
              updateFilter("gameTypes", newGames.length > 0 ? newGames : ["all"]);
            },
          });
        }
      });
    }

    if (filters.entryType !== "all") {
      active.push({
        label: filters.entryType === "free" ? "Free" : "Paid",
        onRemove: () => updateFilter("entryType", "all"),
      });
    }

    if (filters.teamType !== "all") {
      const teamLabels: Record<string, string> = {
        pro: "Pro Teams",
        amateur: "Amateur Teams",
        both: "Mixed Teams",
      };
      active.push({
        label: teamLabels[filters.teamType],
        onRemove: () => updateFilter("teamType", "all"),
      });
    }

    return active;
  };

  const activeFilters = getActiveFilters();
  const hasActiveFilters = activeFilters.length > 0;

  const resetAllFilters = () => {
    onFiltersChange(defaultFilters);
  };

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] backdrop-blur-lg border border-white/[0.05] rounded-[10px] transition-all",
        isSticky && "shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
      )}
    >
      {/* Primary row: Status tabs + Result count */}
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <StatusTabs
          value={filters.status}
          onChange={(v) => updateFilter("status", v)}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#d1d1d9]">
            <span className="font-semibold text-white">{resultCount}</span> rounds found
          </span>
        </div>
      </div>

      {/* Game filter row */}
      <div className="px-4 pb-3 border-t border-white/[0.05] pt-3">
        <div className="flex items-center justify-between gap-4">
          <GameFilterPills
            selectedGames={filters.gameTypes}
            onChange={(games) => updateFilter("gameTypes", games)}
          />
          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-250 shrink-0",
              showMoreFilters
                ? "bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_8px_rgba(122,92,255,0.3)]"
                : "text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
            More
            {showMoreFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible more filters */}
      {showMoreFilters && (
        <div className="px-4 pb-4 border-t border-white/[0.05] pt-4 flex flex-wrap gap-6">
          <SecondaryFilterPill
            label="Entry"
            options={[
              { value: "all", label: "All" },
              { value: "free", label: "Free" },
              { value: "paid", label: "Paid" },
            ]}
            value={filters.entryType}
            onChange={(v) => updateFilter("entryType", v as RoundFiltersState["entryType"])}
          />
          <SecondaryFilterPill
            label="Teams"
            options={[
              { value: "all", label: "All" },
              { value: "pro", label: "Pro" },
              { value: "amateur", label: "Amateur" },
              { value: "both", label: "Mixed" },
            ]}
            value={filters.teamType}
            onChange={(v) => updateFilter("teamType", v as RoundFiltersState["teamType"])}
          />
        </div>
      )}

      {/* Active filters chips */}
      {hasActiveFilters && (
        <div className="px-4 pb-4 border-t border-white/[0.05] pt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter, idx) => (
            <ActiveFilterChip
              key={idx}
              label={filter.label}
              onRemove={filter.onRemove}
            />
          ))}
          <button
            onClick={resetAllFilters}
            className="text-sm text-[#a78bfa] hover:text-white underline underline-offset-2 ml-2 transition-colors"
          >
            Reset all
          </button>
        </div>
      )}
    </div>
  );
};

// Mobile filter bottom sheet
const MobileFilterSheet: React.FC<RoundFiltersProps> = ({
  filters,
  onFiltersChange,
  resultCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = <K extends keyof RoundFiltersState>(
    key: K,
    value: RoundFiltersState[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (!filters.gameTypes.includes("all") && filters.gameTypes.length > 0) {
      count += filters.gameTypes.length;
    }
    if (filters.entryType !== "all") count++;
    if (filters.teamType !== "all") count++;
    return count;
  };

  const activeCount = getActiveFilterCount();

  const resetAllFilters = () => {
    onFiltersChange(defaultFilters);
  };

  return (
    <div className="bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] backdrop-blur-lg border border-white/[0.05] rounded-[10px] p-3">
      {/* Quick status tabs + filter button */}
      <div className="flex items-center gap-2">
        <StatusTabs
          value={filters.status}
          onChange={(v) => updateFilter("status", v)}
        />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button className="relative shrink-0 inline-flex items-center justify-center p-2.5 rounded-lg text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white transition-all duration-250">
              <SlidersHorizontal className="w-4 h-4" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white text-xs flex items-center justify-center font-semibold shadow-[0_0_8px_rgba(122,92,255,0.4)]">
                  {activeCount}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] border-t border-white/[0.1]">
            <SheetHeader className="pb-4">
              <SheetTitle className="text-white">
                Filter Rounds
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 overflow-y-auto pb-24">
              {/* Status */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-white">Status</h4>
                <StatusTabs
                  value={filters.status}
                  onChange={(v) => updateFilter("status", v)}
                />
              </div>

              {/* Game Type */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-white">Game</h4>
                <GameFilterPills
                  selectedGames={filters.gameTypes}
                  onChange={(games) => updateFilter("gameTypes", games)}
                />
              </div>

              {/* Entry Type */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-white">Entry Type</h4>
                <div className="flex gap-2">
                  {[
                    { value: "all", label: "All" },
                    { value: "free", label: "Free" },
                    { value: "paid", label: "Paid" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updateFilter("entryType", option.value as RoundFiltersState["entryType"])
                      }
                      className={cn(
                        "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-250",
                        filters.entryType === option.value
                          ? "bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)]"
                          : "text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Type */}
              <div>
                <h4 className="text-sm font-medium mb-3 text-white">Team Type</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "all", label: "All Teams" },
                    { value: "pro", label: "Pro" },
                    { value: "amateur", label: "Amateur" },
                    { value: "both", label: "Mixed" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        updateFilter("teamType", option.value as RoundFiltersState["teamType"])
                      }
                      className={cn(
                        "px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-250",
                        filters.teamType === option.value
                          ? "bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)]"
                          : "text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed bottom actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#1e1e2a] to-transparent border-t border-white/[0.05] flex gap-3">
              <button
                onClick={resetAllFilters}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] hover:bg-[#7a5cff]/15 hover:text-white transition-all duration-250"
              >
                Reset All
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-gradient-to-br from-[#7a5cff] to-[#8e6fff] text-white shadow-[0_0_12px_rgba(122,92,255,0.4)] hover:shadow-[0_0_20px_rgba(122,92,255,0.6)] transition-all duration-250"
              >
                Show {resultCount} Rounds
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Result count */}
      <div className="mt-2 text-xs text-[#d1d1d9]">
        <span className="font-semibold text-white">{resultCount}</span> rounds found
      </div>
    </div>
  );
};

// Main exported component with sticky behavior
export const defaultFilters: RoundFiltersState = {
  entryType: "all",
  gameTypes: ["all"],
  status: "all",
  teamType: "all",
};

export const RoundFilters: React.FC<RoundFiltersProps> = (props) => {
  const isMobile = useIsMobile();
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 200);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isMobile) {
    return (
      <div className={cn(
        "transition-all duration-300",
        isSticky && "sticky top-0 z-40"
      )}>
        <MobileFilterSheet {...props} />
      </div>
    );
  }

  return (
    <div className={cn(
      "transition-all duration-300",
      isSticky && "sticky top-0 z-40"
    )}>
      <DesktopFilters {...props} isSticky={isSticky} />
    </div>
  );
};

// Filter application function
export const applyRoundFilters = <T extends {
  is_paid?: boolean | null;
  game_type?: string | null;
  status?: string;
  team_type?: string | null;
}>(
  rounds: T[],
  filters: RoundFiltersState
): T[] => {
  return rounds.filter((round) => {
    // Entry type filter
    if (filters.entryType !== "all") {
      const isPaid = round.is_paid === true;
      if (filters.entryType === "paid" && !isPaid) return false;
      if (filters.entryType === "free" && isPaid) return false;
    }

    // Game type filter (multi-select)
    if (!filters.gameTypes.includes("all") && filters.gameTypes.length > 0) {
      const roundGameType = round.game_type?.toLowerCase() || "";
      // Check if the round's game type matches any selected game OR if the round is "all games" (null/empty)
      const matchesSelectedGame = filters.gameTypes.some((selectedGame) => {
        // Handle Counter-Strike variants
        if (selectedGame === "counter-strike") {
          return roundGameType === "cs2" || roundGameType === "counter-strike" || roundGameType === "csgo";
        }
        // Handle League of Legends variants
        if (selectedGame === "lol") {
          return roundGameType === "lol" || roundGameType === "league-of-legends";
        }
        // Handle other games
        return roundGameType === selectedGame;
      });
      // Also show "all games" rounds when filtering by game
      const isAllGamesRound = !round.game_type || round.game_type === "";
      if (!matchesSelectedGame && !isAllGamesRound) return false;
    }

    // Status filter
    if (filters.status !== "all") {
      const roundStatus = round.status?.toLowerCase() || "";
      if (filters.status === "in_progress") {
        if (roundStatus !== "open" && roundStatus !== "active" && roundStatus !== "in_progress") {
          return false;
        }
      }
      if (filters.status === "coming_soon") {
        if (roundStatus !== "scheduled") return false;
      }
    }

    // Team type filter
    if (filters.teamType !== "all") {
      const roundTeamType = round.team_type?.toLowerCase() || "";
      if (filters.teamType === "pro" && roundTeamType !== "pro") return false;
      if (filters.teamType === "amateur" && roundTeamType !== "amateur") return false;
      if (filters.teamType === "both" && roundTeamType !== "both") return false;
    }

    return true;
  });
};
