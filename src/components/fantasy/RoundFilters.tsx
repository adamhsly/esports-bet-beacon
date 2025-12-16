import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RoundFiltersState {
  entryType: "all" | "free" | "paid";
  gameType: "all" | "cs2" | "valorant" | "dota2" | "lol";
  status: "all" | "in_progress" | "coming_soon";
  teamType: "all" | "pro" | "amateur" | "both";
}

interface RoundFiltersProps {
  filters: RoundFiltersState;
  onFiltersChange: (filters: RoundFiltersState) => void;
}

const FilterPill: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    className={cn(
      "h-7 px-3 text-xs font-medium rounded-full transition-all",
      active
        ? "bg-primary text-primary-foreground hover:bg-primary/90"
        : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
    )}
  >
    {label}
  </Button>
);

const FilterGroup: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</span>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

export const RoundFilters: React.FC<RoundFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateFilter = <K extends keyof RoundFiltersState>(key: K, value: RoundFiltersState[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-card/50 border border-border/50 rounded-lg p-4 mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Entry Type Filter */}
        <FilterGroup label="Entry">
          <FilterPill
            label="All"
            active={filters.entryType === "all"}
            onClick={() => updateFilter("entryType", "all")}
          />
          <FilterPill
            label="Free"
            active={filters.entryType === "free"}
            onClick={() => updateFilter("entryType", "free")}
          />
          <FilterPill
            label="Paid"
            active={filters.entryType === "paid"}
            onClick={() => updateFilter("entryType", "paid")}
          />
        </FilterGroup>

        {/* Game Type Filter */}
        <FilterGroup label="Game">
          <FilterPill
            label="All"
            active={filters.gameType === "all"}
            onClick={() => updateFilter("gameType", "all")}
          />
          <FilterPill
            label="CS2"
            active={filters.gameType === "cs2"}
            onClick={() => updateFilter("gameType", "cs2")}
          />
          <FilterPill
            label="Valorant"
            active={filters.gameType === "valorant"}
            onClick={() => updateFilter("gameType", "valorant")}
          />
          <FilterPill
            label="Dota 2"
            active={filters.gameType === "dota2"}
            onClick={() => updateFilter("gameType", "dota2")}
          />
          <FilterPill
            label="LoL"
            active={filters.gameType === "lol"}
            onClick={() => updateFilter("gameType", "lol")}
          />
        </FilterGroup>

        {/* Status Filter */}
        <FilterGroup label="Status">
          <FilterPill
            label="All"
            active={filters.status === "all"}
            onClick={() => updateFilter("status", "all")}
          />
          <FilterPill
            label="In Progress"
            active={filters.status === "in_progress"}
            onClick={() => updateFilter("status", "in_progress")}
          />
          <FilterPill
            label="Coming Soon"
            active={filters.status === "coming_soon"}
            onClick={() => updateFilter("status", "coming_soon")}
          />
        </FilterGroup>

        {/* Team Type Filter */}
        <FilterGroup label="Teams">
          <FilterPill
            label="All"
            active={filters.teamType === "all"}
            onClick={() => updateFilter("teamType", "all")}
          />
          <FilterPill
            label="Pro"
            active={filters.teamType === "pro"}
            onClick={() => updateFilter("teamType", "pro")}
          />
          <FilterPill
            label="Amateur"
            active={filters.teamType === "amateur"}
            onClick={() => updateFilter("teamType", "amateur")}
          />
          <FilterPill
            label="Mixed"
            active={filters.teamType === "both"}
            onClick={() => updateFilter("teamType", "both")}
          />
        </FilterGroup>
      </div>
    </div>
  );
};

export const defaultFilters: RoundFiltersState = {
  entryType: "all",
  gameType: "all",
  status: "all",
  teamType: "all",
};

// Filter function to apply filters to rounds
export const applyRoundFilters = <T extends {
  id: string;
  is_paid?: boolean;
  game_type?: string;
  status: string;
  team_type?: string;
  start_date: string;
  end_date: string;
}>(
  rounds: T[],
  filters: RoundFiltersState
): T[] => {
  return rounds.filter((round) => {
    // Entry type filter
    if (filters.entryType === "free" && round.is_paid) return false;
    if (filters.entryType === "paid" && !round.is_paid) return false;

    // Game type filter - show specific game + "all games" rounds
    if (filters.gameType !== "all") {
      const roundGame = (round.game_type || "all").toLowerCase();
      const filterGame = filters.gameType.toLowerCase();
      
      // Map filter values to possible database values
      const gameMatches = (filter: string, dbValue: string): boolean => {
        if (dbValue === "all" || !dbValue) return true; // "All Games" rounds always show
        
        const normalizedDb = dbValue.toLowerCase();
        switch (filter) {
          case "cs2":
            return normalizedDb === "cs2" || normalizedDb === "counter-strike" || normalizedDb === "csgo";
          case "valorant":
            return normalizedDb === "valorant";
          case "dota2":
            return normalizedDb === "dota-2" || normalizedDb === "dota2";
          case "lol":
            return normalizedDb === "league-of-legends" || normalizedDb === "lol";
          default:
            return false;
        }
      };
      
      if (!gameMatches(filterGame, roundGame)) return false;
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
