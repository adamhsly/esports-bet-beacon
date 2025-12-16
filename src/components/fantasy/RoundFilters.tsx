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
  { value: "all", label: "All Games", logo: null, showLabel: true },
  { value: "cs2", label: "CS2", logo: counterStrike2Logo, showLabel: true },
  { value: "valorant", label: "Valorant", logo: valorantLogo, showLabel: true },
  { value: "dota2", label: "Dota 2", logo: dota2Logo, showLabel: true },
  { value: "lol", label: "LoL", logo: leagueOfLegendsLogo, showLabel: true },
];

// Status tab component
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
    <div className="inline-flex h-10 items-center justify-center rounded-lg bg-muted/50 p-1 w-full sm:w-auto">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 sm:flex-none inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all",
            value === option.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
};

// Game filter pills with icons (multi-select)
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
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
            "border-2",
            isSelected(game.value)
              ? "border-primary bg-primary/10 text-primary"
              : "border-border/50 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50"
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

// Secondary filter pills (Entry Type and Team Type)
const SecondaryFilterPill: React.FC<{
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}> = ({ label, options, value, onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground font-medium">{label}:</span>
    <div className="flex gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-2.5 py-1 rounded-md text-xs font-medium transition-all",
            value === option.value
              ? "bg-primary/20 text-primary border border-primary/30"
              : "bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  </div>
);

// Active filter chip
const ActiveFilterChip: React.FC<{
  label: string;
  onRemove: () => void;
}> = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
    {label}
    <button
      onClick={onRemove}
      className="hover:bg-primary/30 rounded-full p-0.5 transition-colors"
    >
      <X className="w-3 h-3" />
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
        "bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg transition-all",
        isSticky && "shadow-lg"
      )}
    >
      {/* Primary row: Status tabs + Result count */}
      <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <StatusTabs
          value={filters.status}
          onChange={(v) => updateFilter("status", v)}
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{resultCount}</span> rounds found
          </span>
        </div>
      </div>

      {/* Game filter row */}
      <div className="px-4 pb-3 border-t border-border/30 pt-3">
        <div className="flex items-center justify-between gap-4">
          <GameFilterPills
            selectedGames={filters.gameTypes}
            onChange={(games) => updateFilter("gameTypes", games)}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            More
            {showMoreFilters ? (
              <ChevronUp className="w-4 h-4 ml-1" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-1" />
            )}
          </Button>
        </div>
      </div>

      {/* Collapsible more filters */}
      {showMoreFilters && (
        <div className="px-4 pb-3 border-t border-border/30 pt-3 flex flex-wrap gap-4">
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
        <div className="px-4 pb-3 border-t border-border/30 pt-3 flex flex-wrap items-center gap-2">
          {activeFilters.map((filter, idx) => (
            <ActiveFilterChip
              key={idx}
              label={filter.label}
              onRemove={filter.onRemove}
            />
          ))}
          <button
            onClick={resetAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground underline ml-2"
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
    <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-lg p-3">
      {/* Quick status tabs + filter button */}
      <div className="flex items-center gap-2">
        <StatusTabs
          value={filters.status}
          onChange={(v) => updateFilter("status", v)}
        />
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="relative shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
              {activeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
            <SheetHeader className="pb-4">
              <SheetTitle className="flex items-center justify-between">
                <span>Filter Rounds</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {resultCount} results
                </span>
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-6 overflow-y-auto pb-20">
              {/* Status */}
              <div>
                <h4 className="text-sm font-medium mb-3">Status</h4>
                <StatusTabs
                  value={filters.status}
                  onChange={(v) => updateFilter("status", v)}
                />
              </div>

              {/* Game Type */}
              <div>
                <h4 className="text-sm font-medium mb-3">Game</h4>
                <GameFilterPills
                  selectedGames={filters.gameTypes}
                  onChange={(games) => updateFilter("gameTypes", games)}
                />
              </div>

              {/* Entry Type */}
              <div>
                <h4 className="text-sm font-medium mb-3">Entry Type</h4>
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
                        "flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2",
                        filters.entryType === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Type */}
              <div>
                <h4 className="text-sm font-medium mb-3">Team Type</h4>
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
                        "px-4 py-2.5 rounded-lg text-sm font-medium transition-all border-2",
                        filters.teamType === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 bg-muted/30 text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed bottom actions */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetAllFilters}
              >
                Reset All
              </Button>
              <Button className="flex-1" onClick={() => setIsOpen(false)}>
                Show {resultCount} Rounds
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Result count */}
      <div className="mt-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{resultCount}</span> rounds found
      </div>
    </div>
  );
};

// Main exported component with sticky behavior
export const RoundFilters: React.FC<RoundFiltersProps> = (props) => {
  const isMobile = useIsMobile();
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Become sticky after scrolling 100px
      setIsSticky(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={cn(
        "mb-6 transition-all duration-200",
        isSticky && "sticky top-16 z-40"
      )}
    >
      {isMobile ? (
        <MobileFilterSheet {...props} />
      ) : (
        <DesktopFilters {...props} isSticky={isSticky} />
      )}
    </div>
  );
};

export const defaultFilters: RoundFiltersState = {
  entryType: "all",
  gameTypes: ["all"],
  status: "all",
  teamType: "all",
};

// Filter function to apply filters to rounds
export const applyRoundFilters = <
  T extends {
    id: string;
    is_paid?: boolean;
    game_type?: string;
    status: string;
    team_type?: string;
    start_date: string;
    end_date: string;
  }
>(
  rounds: T[],
  filters: RoundFiltersState
): T[] => {
  return rounds.filter((round) => {
    // Entry type filter
    if (filters.entryType === "free" && round.is_paid) return false;
    if (filters.entryType === "paid" && !round.is_paid) return false;

    // Game type filter (multi-select) - show specific games + "all games" rounds
    if (!filters.gameTypes.includes("all") && filters.gameTypes.length > 0) {
      const roundGame = (round.game_type || "all").toLowerCase();

      // "All Games" rounds always show
      if (roundGame !== "all" && roundGame) {
        const gameMatches = filters.gameTypes.some((filterGame) => {
          const normalizedDb = roundGame.toLowerCase();
          switch (filterGame) {
            case "cs2":
              return (
                normalizedDb === "cs2" ||
                normalizedDb === "counter-strike" ||
                normalizedDb === "csgo"
              );
            case "valorant":
              return normalizedDb === "valorant";
            case "dota2":
              return normalizedDb === "dota-2" || normalizedDb === "dota2";
            case "lol":
              return normalizedDb === "league-of-legends" || normalizedDb === "lol";
            default:
              return false;
          }
        });
        if (!gameMatches) return false;
      }
    }

    // Status filter
    if (filters.status !== "all") {
      const now = new Date();
      const start = new Date(round.start_date);
      const end = new Date(round.end_date);
      const isInProgress = now >= start && now <= end;
      const isScheduled = round.status === "scheduled" || now < start;

      if (filters.status === "in_progress" && !isInProgress) return false;
      if (filters.status === "coming_soon" && !isScheduled) return false;
    }

    // Team type filter
    if (filters.teamType !== "all") {
      const roundTeamType = round.team_type || "both";
      if (filters.teamType !== roundTeamType) return false;
    }

    return true;
  });
};
