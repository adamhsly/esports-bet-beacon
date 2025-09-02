import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface TeamFiltersOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: 'pro' | 'amateur';
  proTeams: any[];
  amateurTeams: any[];
  onFiltersApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export interface FilterState {
  pro: {
    matches: number[];
    credits: number[];
    winRate: number[];
  };
  amateur: {
    matches: number[];
    credits: number[];
    abandonRate: number[];
  };
}

export const TeamFiltersOverlay: React.FC<TeamFiltersOverlayProps> = ({
  isOpen,
  onClose,
  activeTab,
  proTeams,
  amateurTeams,
  onFiltersApply,
  currentFilters
}) => {
  const [filters, setFilters] = useState<FilterState>(currentFilters);

  // Calculate dynamic ranges
  const proMatchVolumes = proTeams.map(t => t.match_volume ?? 0);
  const proCredits = proTeams.map(t => t.price ?? 0);
  const proWinRates = proTeams.map(t => (t.recent_win_rate ?? 0) * 100); // Convert to percentage
  
  const amateurMatchVolumes = amateurTeams.map(t => t.matches_prev_window ?? 0);
  const amateurCredits = amateurTeams.map(t => t.price ?? 0);
  const amateurAbandonRates = amateurTeams.map(t => (t.abandon_rate ?? 0) * 100); // Convert to percentage

  const proRanges = {
    matches: { min: Math.min(...proMatchVolumes), max: Math.max(...proMatchVolumes) },
    credits: { min: Math.min(...proCredits), max: Math.max(...proCredits) },
    winRate: { min: Math.min(...proWinRates), max: Math.max(...proWinRates) }
  };

  const amateurRanges = {
    matches: { min: Math.min(...amateurMatchVolumes), max: Math.max(...amateurMatchVolumes) },
    credits: { min: Math.min(...amateurCredits), max: Math.max(...amateurCredits) },
    abandonRate: { min: Math.min(...amateurAbandonRates), max: Math.max(...amateurAbandonRates) }
  };

  // Initialize filters with dynamic ranges when component mounts or teams change
  useEffect(() => {
    if (proTeams.length > 0 || amateurTeams.length > 0) {
      const dynamicFilters: FilterState = {
        pro: {
          matches: [proRanges.matches.min, proRanges.matches.max],
          credits: [proRanges.credits.min, proRanges.credits.max],
          winRate: [proRanges.winRate.min, proRanges.winRate.max]
        },
        amateur: {
          matches: [amateurRanges.matches.min, amateurRanges.matches.max],
          credits: [amateurRanges.credits.min, amateurRanges.credits.max],
          abandonRate: [amateurRanges.abandonRate.min, amateurRanges.abandonRate.max]
        }
      };
      setFilters(dynamicFilters);
    } else {
      setFilters(currentFilters);
    }
  }, [proTeams, amateurTeams, proRanges, amateurRanges, currentFilters, isOpen]);

  const handleApply = () => {
    onFiltersApply(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterState = {
      pro: {
        matches: [proRanges.matches.min, proRanges.matches.max],
        credits: [proRanges.credits.min, proRanges.credits.max],
        winRate: [proRanges.winRate.min, proRanges.winRate.max]
      },
      amateur: {
        matches: [amateurRanges.matches.min, amateurRanges.matches.max],
        credits: [amateurRanges.credits.min, amateurRanges.credits.max],
        abandonRate: [amateurRanges.abandonRate.min, amateurRanges.abandonRate.max]
      }
    };
    setFilters(resetFilters);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-l border-gray-700/50">
        <SheetHeader className="border-b border-gray-700/50 pb-6">
          <SheetTitle className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Filter {activeTab === 'pro' ? 'Pro' : 'Amateur'} Teams
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {activeTab === 'pro' ? (
            <>
              {/* Matches Filter */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm">
                  Matches: {filters.pro.matches[0]} - {filters.pro.matches[1]}
                </Label>
                <Slider
                  value={filters.pro.matches}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    pro: { ...prev.pro, matches: value }
                  }))}
                  min={proRanges.matches.min}
                  max={proRanges.matches.max}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Credits Filter */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm">
                  Credits: {filters.pro.credits[0]} - {filters.pro.credits[1]}
                </Label>
                <Slider
                  value={filters.pro.credits}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    pro: { ...prev.pro, credits: value }
                  }))}
                  min={proRanges.credits.min}
                  max={proRanges.credits.max}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Win Rate Filter */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm">
                  Win Rate: {filters.pro.winRate[0]}% - {filters.pro.winRate[1]}%
                </Label>
                <Slider
                  value={filters.pro.winRate}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    pro: { ...prev.pro, winRate: value }
                  }))}
                  min={proRanges.winRate.min}
                  max={proRanges.winRate.max}
                  step={1}
                  className="w-full"
                />
              </div>
            </>
          ) : (
            <>
              {/* Matches Filter */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm">
                  Matches: {filters.amateur.matches[0]} - {filters.amateur.matches[1]}
                </Label>
                <Slider
                  value={filters.amateur.matches}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    amateur: { ...prev.amateur, matches: value }
                  }))}
                  min={amateurRanges.matches.min}
                  max={amateurRanges.matches.max}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Credits Filter */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm">
                  Credits: {filters.amateur.credits[0]} - {filters.amateur.credits[1]}
                </Label>
                <Slider
                  value={filters.amateur.credits}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    amateur: { ...prev.amateur, credits: value }
                  }))}
                  min={amateurRanges.credits.min}
                  max={amateurRanges.credits.max}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Abandon Rate Filter */}
              <div className="space-y-3">
                <Label className="text-gray-300 text-sm">
                  Abandon Rate: {filters.amateur.abandonRate[0]}% - {filters.amateur.abandonRate[1]}%
                </Label>
                <Slider
                  value={filters.amateur.abandonRate}
                  onValueChange={(value) => setFilters(prev => ({
                    ...prev,
                    amateur: { ...prev.amateur, abandonRate: value }
                  }))}
                  min={amateurRanges.abandonRate.min}
                  max={amateurRanges.abandonRate.max}
                  step={1}
                  className="w-full"
                />
              </div>
            </>
          )}
        </div>

        {/* Sticky Bottom Actions */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-gray-700/50 pt-6 mt-6">
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={handleReset}
              className="flex-1 border-gray-600/50 text-gray-300 hover:bg-gray-800/50"
            >
              Reset
            </Button>
            <Button 
              onClick={handleApply}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};