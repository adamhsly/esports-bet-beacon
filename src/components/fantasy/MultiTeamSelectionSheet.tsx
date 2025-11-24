import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Search, Filter, Trophy, Users, AlertTriangle, X, Plus, Trash2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamCard } from './TeamCard';
import { Progress } from '@/components/ui/progress';
import { TeamFiltersOverlay, FilterState } from './TeamFiltersOverlay';
import { TeamStatsModal } from './TeamStatsModal';
import { AmateurTeamStatsModal } from './AmateurTeamStatsModal';
interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  matches_in_period?: number;
  logo_url?: string;
  esport_type?: string;
  matches_prev_window?: number;
  missed_pct?: number;
  total_scheduled?: number;
  price?: number;
  recent_win_rate?: number;
  match_volume?: number;
  abandon_rate?: number;
  region?: string;
}
interface MultiTeamSelectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  proTeams: Team[];
  amateurTeams: Team[];
  selectedTeams: Team[];
  onTeamsUpdate: (teams: Team[]) => void;
  budgetRemaining: number;
  totalBudget: number;
  round: {
    id: string;
    type: 'daily' | 'weekly' | 'monthly' | 'private';
    start_date: string;
    end_date: string;
    status: 'open' | 'active' | 'finished';
    is_private?: boolean;
  };
}
export const MultiTeamSelectionSheet: React.FC<MultiTeamSelectionSheetProps> = ({
  isOpen,
  onClose,
  proTeams,
  amateurTeams,
  selectedTeams,
  onTeamsUpdate,
  budgetRemaining,
  totalBudget,
  round
}) => {
  const [activeTab, setActiveTab] = useState<'pro' | 'amateur'>('pro');
  const [tempSelectedTeams, setTempSelectedTeams] = useState<Team[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Stats modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [amateurStatsModalOpen, setAmateurStatsModalOpen] = useState(false);
  const [selectedStatsTeam, setSelectedStatsTeam] = useState<Team | null>(null);

  // Pro team filters
  const [proSearch, setProSearch] = useState('');
  const [selectedGamePro, setSelectedGamePro] = useState<string>('all');
  const [minMatchesPro, setMinMatchesPro] = useState<number>(0);
  const [hasLogoOnlyPro, setHasLogoOnlyPro] = useState<boolean>(false);
  const [priceRangePro, setPriceRangePro] = useState<number[]>([0, 100]);

  // Amateur team filters
  const [amSearch, setAmSearch] = useState('');
  const [selectedGameAm, setSelectedGameAm] = useState<string>('all');
  const [selectedRegionAm, setSelectedRegionAm] = useState<string>('all');
  const [minMatchesPrev, setMinMatchesPrev] = useState<number>(0);
  const [maxMissedPct, setMaxMissedPct] = useState<number>(100);
  const [hasLogoOnlyAm, setHasLogoOnlyAm] = useState<boolean>(false);
  const [hasPrevMatchesOnlyAm, setHasPrevMatchesOnlyAm] = useState<boolean>(false);
  const [priceRangeAm, setPriceRangeAm] = useState<number[]>([0, 100]);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    pro: {
      matches: 100,
      credits: 1000,
      winRate: 100
    },
    amateur: {
      matches: 100,
      credits: 1000,
      abandonRate: 100
    }
  });
  const debouncedProSearch = useDebounce(proSearch, 300);
  const debouncedAmSearch = useDebounce(amSearch, 300);

  // Initialize temp selection with current selection when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedTeams([...selectedTeams]);
    }
  }, [isOpen, selectedTeams]);

  // Calculate budget for temp selection
  const tempBudgetSpent = useMemo(() => tempSelectedTeams.reduce((sum, t) => sum + (t.price ?? 0), 0), [tempSelectedTeams]);
  const tempBudgetRemaining = Math.max(0, totalBudget - tempBudgetSpent);

  // Get unique games and price ranges
  const proGames = useMemo(() => Array.from(new Set(proTeams.map(t => t.esport_type).filter(Boolean))) as string[], [proTeams]);
  const amateurGames = useMemo(() => Array.from(new Set(amateurTeams.map(t => t.esport_type).filter(Boolean))) as string[], [amateurTeams]);
  const amateurRegions = useMemo(() => Array.from(new Set(amateurTeams.map(t => t.region).filter(Boolean))) as string[], [amateurTeams]);

  // Calculate price ranges
  const proPrices = useMemo(() => proTeams.map(t => t.price ?? 0), [proTeams]);
  const amateurPrices = useMemo(() => amateurTeams.map(t => t.price ?? 0), [amateurTeams]);
  const maxProPrice = useMemo(() => Math.max(...proPrices, 0), [proPrices]);
  const maxAmateurPrice = useMemo(() => Math.max(...amateurPrices, 0), [amateurPrices]);

  // Update price ranges when teams change
  useEffect(() => {
    setPriceRangePro([0, maxProPrice]);
  }, [maxProPrice]);
  useEffect(() => {
    setPriceRangeAm([0, maxAmateurPrice]);
  }, [maxAmateurPrice]);

  // Filter teams
  const filteredProTeams = useMemo(() => {
    return proTeams.filter(t => {
      const nameMatch = t.name.toLowerCase().includes(debouncedProSearch.toLowerCase());
      const gameMatch = selectedGamePro === 'all' || (t.esport_type ?? '') === selectedGamePro;
      const matches = t.match_volume ?? 0;
      const matchesMatch = matches >= minMatchesPro;
      const logoMatch = !hasLogoOnlyPro || !!t.logo_url;
      const budgetMatch = (t.price ?? 0) <= tempBudgetRemaining || tempSelectedTeams.find(st => st.id === t.id);
      const priceMatch = (t.price ?? 0) >= priceRangePro[0] && (t.price ?? 0) <= priceRangePro[1];

      // Advanced filters
      const matchVolumeMatch = (t.match_volume ?? 0) <= advancedFilters.pro.matches;
      const creditsMatch = (t.price ?? 0) <= advancedFilters.pro.credits;
      const winRateMatch = (t.recent_win_rate ?? 0) <= advancedFilters.pro.winRate;
      return nameMatch && gameMatch && matchesMatch && logoMatch && budgetMatch && priceMatch && matchVolumeMatch && creditsMatch && winRateMatch;
    }).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [proTeams, debouncedProSearch, selectedGamePro, minMatchesPro, hasLogoOnlyPro, tempBudgetRemaining, priceRangePro, tempSelectedTeams, advancedFilters.pro]);
  const filteredAmateurTeams = useMemo(() => {
    return amateurTeams.filter(t => {
      const nameMatch = t.name.toLowerCase().includes(debouncedAmSearch.toLowerCase());
      const gameMatch = selectedGameAm === 'all' || (t.esport_type ?? '') === selectedGameAm;
      const regionMatch = selectedRegionAm === 'all' || (t.region ?? '') === selectedRegionAm;
      const matchVolume = t.match_volume ?? 0;
      const matchesMatch = matchVolume >= minMatchesPrev;
      const missed = t.missed_pct ?? 100;
      const missedMatch = missed <= maxMissedPct;
      const logoMatch = !hasLogoOnlyAm || !!t.logo_url;
      const prevPlayedMatch = !hasPrevMatchesOnlyAm || matchVolume > 0;
      const budgetMatch = (t.price ?? 0) <= tempBudgetRemaining || tempSelectedTeams.find(st => st.id === t.id);
      const priceMatch = (t.price ?? 0) >= priceRangeAm[0] && (t.price ?? 0) <= priceRangeAm[1];

      // Advanced filters
      const matchVolumeMatch = (t.match_volume ?? 0) <= advancedFilters.amateur.matches;
      const creditsMatch = (t.price ?? 0) <= advancedFilters.amateur.credits;
      const abandonRateMatch = (t.abandon_rate ?? 0) <= advancedFilters.amateur.abandonRate;
      return nameMatch && gameMatch && regionMatch && matchesMatch && missedMatch && logoMatch && prevPlayedMatch && budgetMatch && priceMatch && matchVolumeMatch && creditsMatch && abandonRateMatch;
    }).sort((a, b) => (b.recent_win_rate ?? 0) - (a.recent_win_rate ?? 0));
  }, [amateurTeams, debouncedAmSearch, selectedGameAm, selectedRegionAm, minMatchesPrev, maxMissedPct, hasLogoOnlyAm, hasPrevMatchesOnlyAm, tempBudgetRemaining, priceRangeAm, tempSelectedTeams, advancedFilters.amateur]);
  const handleTeamToggle = (team: Team) => {
    const isCurrentlySelected = tempSelectedTeams.find(t => t.id === team.id);
    if (isCurrentlySelected) {
      // Remove team
      setTempSelectedTeams(tempSelectedTeams.filter(t => t.id !== team.id));
    } else {
      // Add team - check limits
      if (tempSelectedTeams.length >= 5) {
        return; // Don't add if at limit
      }
      const teamPrice = team.price ?? 0;
      const newSpent = tempBudgetSpent + teamPrice;
      if (newSpent > totalBudget) {
        return; // Don't add if over budget
      }
      setTempSelectedTeams([...tempSelectedTeams, team]);
    }
  };
  const handleRemoveSelectedTeam = (teamId: string) => {
    setTempSelectedTeams(tempSelectedTeams.filter(t => t.id !== teamId));
  };
  const handleSubmit = () => {
    onTeamsUpdate(tempSelectedTeams);
    onClose();
  };
  const handleCancel = () => {
    setTempSelectedTeams([...selectedTeams]); // Reset to original selection
    onClose();
  };
  const handleFiltersApply = (newFilters: FilterState) => {
    setAdvancedFilters(newFilters);
  };

  const handleStatsClick = (team: Team) => {
    setSelectedStatsTeam(team);
    if (team.type === 'amateur') {
      setAmateurStatsModalOpen(true);
    } else {
      setStatsModalOpen(true);
    }
  };

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setProSearch('');
      setAmSearch('');
    }
  }, [isOpen]);
  const canSubmit = tempSelectedTeams.length <= 5 && tempBudgetSpent <= totalBudget;
  return <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-l border-gray-700/50">
        <SheetHeader className="border-b border-gray-700/50 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Select Your Teams
              </SheetTitle>
              <p className="text-gray-400 text-sm mt-1">
                Choose up to 5 teams within your budget
              </p>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </Button>
            </SheetClose>
          </div>
          
          {/* Budget & Selection Status */}
          <div className="space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Budget:</span>
              <span className={`font-medium ${tempBudgetSpent > totalBudget ? 'text-red-400' : 'text-green-400'}`}>
                {tempBudgetSpent} / {totalBudget} credits
              </span>
            </div>
            {totalBudget > 50 && (
              <div className="text-xs text-orange-400">
                Base: 50 + Bonus: {totalBudget - 50} credits
              </div>
            )}
            <div 
              className="h-2 bg-black/40 rounded-full shadow-inner overflow-hidden w-full"
              role="progressbar"
              aria-valuenow={tempBudgetSpent}
              aria-valuemin={0}
              aria-valuemax={totalBudget}
              aria-label="Budget progress"
            >
              <div 
                className="h-full bg-gradient-to-r from-[#FFCC33] to-[#FF9900] rounded-full transition-all duration-200 ease-out"
                style={{ 
                  width: `${Math.min(100, (tempBudgetSpent / totalBudget * 100))}%`,
                  boxShadow: '0 0 8px rgba(255,204,51,0.6), 0 0 12px rgba(255,153,0,0.4)'
                }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Teams Selected:</span>
              <span className={`font-medium ${tempSelectedTeams.length > 5 ? 'text-red-400' : 'text-blue-400'}`}>
                {tempSelectedTeams.length} / 5
              </span>
            </div>
          </div>

          {/* Selected Teams Summary */}
          {tempSelectedTeams.length > 0}
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'pro' | 'amateur')} className="flex-1">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border border-gray-700/50">
              <TabsTrigger value="pro" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white">
                <Trophy className="w-4 h-4 mr-2" />
                Pro Teams
              </TabsTrigger>
              <TabsTrigger value="amateur" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white">
                <Users className="w-4 h-4 mr-2" />
                Amateur Teams
              </TabsTrigger>
            </TabsList>

            {/* Pro Teams Tab */}
            <TabsContent value="pro" className="mt-6 space-y-4">
              {/* Pro Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search pro teams..." 
                    value={proSearch} 
                    onChange={e => setProSearch(e.target.value)} 
                    className="pl-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none" 
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={selectedGamePro} onValueChange={setSelectedGamePro}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white flex-1">
                      <SelectValue placeholder="All Games" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="all" className="text-white">All Games</SelectItem>
                      {proGames.map(game => <SelectItem key={game} value={game} className="text-white">{game}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="icon" onClick={() => setIsFiltersOpen(true)} className="bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50 shrink-0">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  
                  
                </div>
                
                
              </div>
              
              {/* Pro Team List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProTeams.map(team => {
                const isSelected = tempSelectedTeams.find(t => t.id === team.id);
                const canAfford = (team.price ?? 0) <= tempBudgetRemaining || isSelected;
                const wouldExceedLimit = !isSelected && tempSelectedTeams.length >= 5;
                return <div key={team.id} className={`${!canAfford || wouldExceedLimit ? 'opacity-50' : ''}`}>
                      <TeamCard team={team} isSelected={!!isSelected} onClick={() => !wouldExceedLimit && canAfford ? handleTeamToggle(team) : undefined} showPrice={true} budgetRemaining={tempBudgetRemaining} variant="selection" onStatsClick={handleStatsClick} />
                    </div>;
              })}
                {filteredProTeams.length === 0 && <div className="text-center py-8 text-gray-400">
                    No pro teams match your filters
                  </div>}
              </div>
            </TabsContent>

            {/* Amateur Teams Tab */}
            <TabsContent value="amateur" className="mt-6 space-y-4">
              {/* Amateur Warning Banner */}
              
              
              {/* Amateur Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search amateur teams..." 
                    value={amSearch} 
                    onChange={e => setAmSearch(e.target.value)} 
                    className="pl-10 bg-gradient-to-b from-[#2B2F3A] to-[#1B1F28] text-white placeholder-gray-400 border-2 border-transparent hover:border-[#965AFF]/20 focus:border-[#965AFF] focus:shadow-[0_0_20px_rgba(150,90,255,0.4)] transition-all duration-[250ms] before:absolute before:inset-0 before:rounded-xl before:border before:border-white/10 before:pointer-events-none" 
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={selectedGameAm} onValueChange={setSelectedGameAm}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white flex-1">
                      <SelectValue placeholder="All Games" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="all">All Games</SelectItem>
                      {amateurGames.map(game => <SelectItem key={game} value={game}>{game}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedRegionAm} onValueChange={setSelectedRegionAm}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white flex-1">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="all">All Regions</SelectItem>
                      {amateurRegions.map(region => <SelectItem key={region} value={region}>{region}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="icon" onClick={() => setIsFiltersOpen(true)} className="bg-gray-800/50 border-gray-700/50 text-white hover:bg-gray-700/50 shrink-0">
                    <Filter className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Min Matches: {minMatchesPrev}</Label>
                    <Slider value={[minMatchesPrev]} onValueChange={([value]) => setMinMatchesPrev(value)} max={20} step={1} />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="am-matches" checked={hasPrevMatchesOnlyAm} onCheckedChange={checked => setHasPrevMatchesOnlyAm(checked === true)} />
                  <Label htmlFor="am-matches" className="text-gray-300 text-sm">Has matches last window</Label>
                </div>
              </div>
              
              {/* Amateur Teams Pricing Explanation */}
              <div className="text-xs italic text-gray-400 mb-3 px-1">
                {round.is_private || round.type === 'private' ? (
                  <>
                    Match count shows games played in the last 3 months before this round. 
                    Credits are based on win rate and abandon rate during that period.
                  </>
                ) : (
                  <>
                    Match count shows games played in the previous {round.type} period. 
                    Credits are based on win rate and abandon rate from that timeframe.
                  </>
                )}
              </div>
              
              {/* Amateur Team List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAmateurTeams.map(team => {
                const isSelected = tempSelectedTeams.find(t => t.id === team.id);
                const canAfford = (team.price ?? 0) <= tempBudgetRemaining || isSelected;
                const wouldExceedLimit = !isSelected && tempSelectedTeams.length >= 5;
                return <div key={team.id} className={`${!canAfford || wouldExceedLimit ? 'opacity-50' : ''}`}>
                      <TeamCard team={team} isSelected={!!isSelected} onClick={() => !wouldExceedLimit && canAfford ? handleTeamToggle(team) : undefined} showPrice={true} budgetRemaining={tempBudgetRemaining} variant="selection" onStatsClick={handleStatsClick} />
                    </div>;
              })}
                {filteredAmateurTeams.length === 0 && <div className="text-center py-8 text-gray-400">
                    No amateur teams match your filters
                  </div>}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Selected Teams Summary - Fixed at bottom */}
        {tempSelectedTeams.length > 0}

        {/* Bottom Actions - Always sticky */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-gray-700/50 pt-6 mt-6 space-y-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1 border-gray-600/50 text-gray-300 hover:bg-gray-800/50">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed">
              Confirm Selection ({tempSelectedTeams.length}/5)
            </Button>
          </div>
          
          {!canSubmit && <div className="text-center text-red-400 text-sm">
              {tempSelectedTeams.length > 5 && "Too many teams selected"}
              {tempBudgetSpent > totalBudget && "Budget exceeded"}
            </div>}
        </div>

        {/* Filters Overlay */}
        <TeamFiltersOverlay isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} activeTab={activeTab} proTeams={proTeams} amateurTeams={amateurTeams} onFiltersApply={handleFiltersApply} currentFilters={advancedFilters} />
        
        {/* Team Stats Modal */}
        <TeamStatsModal 
          isOpen={statsModalOpen} 
          onClose={() => setStatsModalOpen(false)} 
          team={selectedStatsTeam} 
        />

        {/* Amateur Team Stats Modal */}
        <AmateurTeamStatsModal 
          isOpen={amateurStatsModalOpen} 
          onClose={() => setAmateurStatsModalOpen(false)} 
          team={selectedStatsTeam} 
        />
      </SheetContent>
    </Sheet>;
};