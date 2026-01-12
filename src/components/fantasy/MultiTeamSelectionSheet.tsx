import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { Search, Filter, Trophy, Users, AlertTriangle, X, Plus, Trash2, Info } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { TeamCard } from './TeamCard';
import { Progress } from '@/components/ui/progress';
import { TeamFiltersOverlay, FilterState } from './TeamFiltersOverlay';
import { TeamStatsModal } from './TeamStatsModal';
import { AmateurTeamStatsModal } from './AmateurTeamStatsModal';
import { RoundDetailsModal } from './RoundDetailsModal';
import { TeamMatchesModal } from './TeamMatchesModal';
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
    status: 'open' | 'active' | 'finished' | 'scheduled';
    is_private?: boolean;
    game_type?: string;
    team_type?: 'pro' | 'amateur' | 'both';
    round_name?: string;
  };
  swapMode?: boolean;
  swappingTeamBudget?: number;
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
  round,
  swapMode = false,
  swappingTeamBudget
}) => {
  // Debug logging - check incoming proTeams data
  useEffect(() => {
    if (isOpen && proTeams.length > 0) {
      console.log('🔍 MultiTeamSelectionSheet - proTeams sample:', proTeams.slice(0, 3));
      console.log('🔍 First pro team price:', proTeams[0]?.price);
    }
  }, [isOpen, proTeams]);

  // Initialize activeTab based on round team_type - run when sheet opens
  useEffect(() => {
    if (isOpen) {
      if (round.team_type === 'pro') {
        setActiveTab('pro');
      } else if (round.team_type === 'amateur') {
        setActiveTab('amateur');
      }
    }
  }, [round.team_type, isOpen]);

  const [activeTab, setActiveTab] = useState<'pro' | 'amateur'>('pro');
  const [tempSelectedTeams, setTempSelectedTeams] = useState<Team[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Stats modal state
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [amateurStatsModalOpen, setAmateurStatsModalOpen] = useState(false);
  const [selectedStatsTeam, setSelectedStatsTeam] = useState<Team | null>(null);
  const [roundDetailsOpen, setRoundDetailsOpen] = useState(false);
  const [matchesModalOpen, setMatchesModalOpen] = useState(false);
  const [selectedMatchesTeam, setSelectedMatchesTeam] = useState<Team | null>(null);

  // Pro team filters
  const [proSearch, setProSearch] = useState('');
  const [selectedGamePro, setSelectedGamePro] = useState<string>('all');
  const [minMatchesPro, setMinMatchesPro] = useState<number>(0);
  const [hasLogoOnlyPro, setHasLogoOnlyPro] = useState<boolean>(false);
  const [priceRangePro, setPriceRangePro] = useState<number[]>([0, 1000]);

  // Amateur team filters
  const [amSearch, setAmSearch] = useState('');
  const [selectedGameAm, setSelectedGameAm] = useState<string>('all');
  const [selectedRegionAm, setSelectedRegionAm] = useState<string>('all');
  const [minMatchesPrev, setMinMatchesPrev] = useState<number>(0);
  const [maxMissedPct, setMaxMissedPct] = useState<number>(100);
  const [hasLogoOnlyAm, setHasLogoOnlyAm] = useState<boolean>(false);
  const [priceRangeAm, setPriceRangeAm] = useState<number[]>([0, 1000]);

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
  const debouncedAdvancedFilters = useDebounce(advancedFilters, 300);

  // Initialize temp selection with current selection when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTempSelectedTeams([...selectedTeams]);
    }
  }, [isOpen, selectedTeams]);

  // Calculate budget for temp selection
  const tempBudgetSpent = useMemo(() => tempSelectedTeams.reduce((sum, t) => sum + (t.price ?? 0), 0), [tempSelectedTeams]);
  const effectiveTotalBudget = swapMode ? (swappingTeamBudget ?? totalBudget) : totalBudget;
  const tempBudgetRemaining = Math.max(0, effectiveTotalBudget - tempBudgetSpent);

  // Get unique games and price ranges
  const proGames = useMemo(() => Array.from(new Set(proTeams.map(t => t.esport_type).filter(Boolean))) as string[], [proTeams]);
  const amateurGames = useMemo(() => Array.from(new Set(amateurTeams.map(t => t.esport_type).filter(Boolean))) as string[], [amateurTeams]);
  const amateurRegions = useMemo(() => Array.from(new Set(amateurTeams.map(t => t.region).filter(Boolean))) as string[], [amateurTeams]);

  // Calculate price ranges
  const proPrices = useMemo(() => proTeams.map(t => t.price ?? 0), [proTeams]);
  const amateurPrices = useMemo(() => amateurTeams.map(t => t.price ?? 0), [amateurTeams]);
  const maxProPrice = useMemo(() => Math.max(...proPrices, 0), [proPrices]);
  const maxAmateurPrice = useMemo(() => Math.max(...amateurPrices, 0), [amateurPrices]);

  // Update price ranges when teams change - only if valid prices loaded
  useEffect(() => {
    if (maxProPrice > 0) {
      setPriceRangePro([0, maxProPrice]);
    }
  }, [maxProPrice]);
  useEffect(() => {
    if (maxAmateurPrice > 0) {
      setPriceRangeAm([0, maxAmateurPrice]);
    }
  }, [maxAmateurPrice]);

  // Helper to check if esport type is a Counter-Strike variant
  const isCSVariant = (esportType: string) => {
    const lower = (esportType ?? '').toLowerCase();
    return lower === 'counter-strike' || lower === 'cs2' || lower === 'csgo';
  };

  // Step 1: Base filtered teams (search, game, region) + round configuration
  const baseFilteredProTeams = useMemo(() => {
    return proTeams.filter(t => {
      // Apply round team_type filter
      if (round.team_type === 'amateur') return false; // Hide all pro teams if only amateur selected
      
      const nameMatch = t.name.toLowerCase().includes(debouncedProSearch.toLowerCase());
      const gameMatch = selectedGamePro === 'all' || (t.esport_type ?? '') === selectedGamePro;
      
      // Apply round game_type filter if configured - 'all' or empty means no filter
      // Map cs2/counter-strike to all CS variants
      let roundGameMatch = !round.game_type || round.game_type === 'all';
      if (!roundGameMatch && round.game_type) {
        const gameTypeLower = round.game_type.toLowerCase();
        if (gameTypeLower === 'cs2' || gameTypeLower === 'counter-strike') {
          roundGameMatch = isCSVariant(t.esport_type ?? '');
        } else {
          roundGameMatch = (t.esport_type ?? '').toLowerCase() === gameTypeLower;
        }
      }
      
      return nameMatch && gameMatch && roundGameMatch;
    });
  }, [proTeams, debouncedProSearch, selectedGamePro, round.team_type, round.game_type]);

  const baseFilteredAmateurTeams = useMemo(() => {
    return amateurTeams.filter(t => {
      // Apply round team_type filter
      if (round.team_type === 'pro') return false; // Hide all amateur teams if only pro selected
      
      const nameMatch = t.name.toLowerCase().includes(debouncedAmSearch.toLowerCase());
      const gameMatch = selectedGameAm === 'all' || (t.esport_type ?? '') === selectedGameAm;
      const regionMatch = selectedRegionAm === 'all' || (t.region ?? '') === selectedRegionAm;
      
      // Apply round game_type filter if configured - 'all' or empty means no filter (amateur teams are cs2)
      const roundGameMatch = !round.game_type || round.game_type === 'all' || round.game_type.toLowerCase() === 'counter-strike' || round.game_type.toLowerCase() === 'cs2';
      
      return nameMatch && gameMatch && regionMatch && roundGameMatch;
    });
  }, [amateurTeams, debouncedAmSearch, selectedGameAm, selectedRegionAm, round.team_type, round.game_type]);

  // Step 2: Budget and basic filters
  const budgetFilteredProTeams = useMemo(() => {
    return baseFilteredProTeams.filter(t => {
      // Always show currently selected teams so user can deselect them
      const isSelected = tempSelectedTeams.some(st => st.id === t.id);
      if (isSelected) return true;
      
      const matches = t.match_volume ?? 0;
      const matchesMatch = matches >= minMatchesPro;
      const logoMatch = !hasLogoOnlyPro || !!t.logo_url;
      const budgetMatch = swapMode 
        ? (t.price ?? 0) <= (swappingTeamBudget ?? 0)
        : (t.price ?? 0) <= tempBudgetRemaining;
      const priceMatch = (t.price ?? 0) >= priceRangePro[0] && (t.price ?? 0) <= priceRangePro[1];
      return matchesMatch && logoMatch && budgetMatch && priceMatch;
    });
  }, [baseFilteredProTeams, minMatchesPro, hasLogoOnlyPro, tempBudgetRemaining, priceRangePro, tempSelectedTeams, swapMode, swappingTeamBudget]);

  const budgetFilteredAmateurTeams = useMemo(() => {
    return baseFilteredAmateurTeams.filter(t => {
      // Always show currently selected teams so user can deselect them
      const isSelected = tempSelectedTeams.some(st => st.id === t.id);
      if (isSelected) return true;
      
      const matchVolume = t.match_volume ?? 0;
      const matchesMatch = matchVolume >= minMatchesPrev;
      const missed = t.missed_pct ?? 100;
      const missedMatch = missed <= maxMissedPct;
      const logoMatch = !hasLogoOnlyAm || !!t.logo_url;
      const budgetMatch = swapMode 
        ? (t.price ?? 0) <= (swappingTeamBudget ?? 0)
        : (t.price ?? 0) <= tempBudgetRemaining;
      const priceMatch = (t.price ?? 0) >= priceRangeAm[0] && (t.price ?? 0) <= priceRangeAm[1];
      return matchesMatch && missedMatch && logoMatch && budgetMatch && priceMatch;
    });
  }, [baseFilteredAmateurTeams, minMatchesPrev, maxMissedPct, hasLogoOnlyAm, tempBudgetRemaining, priceRangeAm, tempSelectedTeams, swapMode, swappingTeamBudget]);

  // Step 3: Advanced filters (debounced)
  const filteredProTeams = useMemo(() => {
    return budgetFilteredProTeams.filter(t => {
      const matchVolumeMatch = (t.match_volume ?? 0) <= debouncedAdvancedFilters.pro.matches;
      const creditsMatch = (t.price ?? 0) <= debouncedAdvancedFilters.pro.credits;
      const winRateMatch = (t.recent_win_rate ?? 0) <= debouncedAdvancedFilters.pro.winRate;
      return matchVolumeMatch && creditsMatch && winRateMatch;
    }).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [budgetFilteredProTeams, debouncedAdvancedFilters.pro]);

  const filteredAmateurTeams = useMemo(() => {
    return budgetFilteredAmateurTeams.filter(t => {
      const matchVolumeMatch = (t.match_volume ?? 0) <= debouncedAdvancedFilters.amateur.matches;
      const creditsMatch = (t.price ?? 0) <= debouncedAdvancedFilters.amateur.credits;
      const abandonRateMatch = (t.abandon_rate ?? 0) <= debouncedAdvancedFilters.amateur.abandonRate;
      return matchVolumeMatch && creditsMatch && abandonRateMatch;
    }).sort((a, b) => (b.recent_win_rate ?? 0) - (a.recent_win_rate ?? 0));
  }, [budgetFilteredAmateurTeams, debouncedAdvancedFilters.amateur]);
  const handleTeamToggle = (team: Team) => {
    if (swapMode) {
      // In swap mode, only allow selecting one team
      setTempSelectedTeams([team]);
      return;
    }
    
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

  const handleMatchesClick = (team: Team) => {
    setSelectedMatchesTeam(team);
    setMatchesModalOpen(true);
  };

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setProSearch('');
      setAmSearch('');
    }
  }, [isOpen]);
  const canSubmit = swapMode 
    ? tempSelectedTeams.length === 1 
    : (tempSelectedTeams.length <= 5 && tempBudgetSpent <= effectiveTotalBudget);
  return <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl bg-gradient-to-br from-[#0B0F14] to-[#12161C] border-l border-gray-700/50 flex flex-col h-full overflow-hidden">
        <SheetHeader className="border-b border-gray-700/50 pb-3">
          
          {/* Budget & Selection Status */}
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Budget:</span>
              <span className={`font-medium ${tempBudgetSpent > effectiveTotalBudget ? 'text-red-400' : 'text-green-400'}`}>
                {tempBudgetSpent} / {effectiveTotalBudget} credits
              </span>
            </div>
            {effectiveTotalBudget > 50 && !swapMode && (
              <div className="text-xs text-orange-400">
                Base: 50 + Bonus: {effectiveTotalBudget - 50} credits
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
          </div>

          {/* Selected Teams Summary */}
          {tempSelectedTeams.length > 0}
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-3 flex-1 flex flex-col min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'pro' | 'amateur')} className="flex-1 flex flex-col min-h-0">
            {round.team_type === 'both' || !round.team_type ? (
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
            ) : null}

            {/* Pro Teams Tab */}
            {(!round.team_type || round.team_type === 'both' || round.team_type === 'pro') && (
            <TabsContent value="pro" className="mt-3 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
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
                
              </div>
              
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Pick your teams ({tempSelectedTeams.length}/5)
                </h3>
                <button 
                  onClick={() => setRoundDetailsOpen(true)}
                  className="w-5 h-5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-colors"
                >
                  <Info className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              
              {/* Pro Team List */}
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pb-4">
                {filteredProTeams.map(team => {
                const isSelected = tempSelectedTeams.find(t => t.id === team.id);
                const canAfford = (team.price ?? 0) <= tempBudgetRemaining || isSelected;
                const wouldExceedLimit = !isSelected && tempSelectedTeams.length >= 5;
                return <div key={team.id} className={`${!canAfford || wouldExceedLimit ? 'opacity-50' : ''}`}>
                      <TeamCard team={team} isSelected={!!isSelected} onClick={() => !wouldExceedLimit && canAfford ? handleTeamToggle(team) : undefined} showPrice={true} budgetRemaining={tempBudgetRemaining} variant="selection" onStatsClick={handleStatsClick} onMatchesClick={handleMatchesClick} />
                    </div>;
              })}
                {filteredProTeams.length === 0 && <div className="text-center py-8 text-gray-400">
                    No pro teams match your filters
                  </div>}
              </div>
            </TabsContent>
            )}

            {/* Amateur Teams Tab */}
            {(!round.team_type || round.team_type === 'both' || round.team_type === 'amateur') && (
            <TabsContent value="amateur" className="mt-3 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
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
              </div>
              
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Pick your teams ({tempSelectedTeams.length}/5)
                </h3>
                <button 
                  onClick={() => setRoundDetailsOpen(true)}
                  className="w-5 h-5 rounded-full bg-gray-700/50 hover:bg-gray-600/50 flex items-center justify-center transition-colors"
                >
                  <Info className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              
              {/* Amateur Team List */}
              <div className="space-y-3 flex-1 overflow-y-auto min-h-0 pb-4">
                {filteredAmateurTeams.map(team => {
                const isSelected = tempSelectedTeams.find(t => t.id === team.id);
                const canAfford = (team.price ?? 0) <= tempBudgetRemaining || isSelected;
                const wouldExceedLimit = !isSelected && tempSelectedTeams.length >= 5;
                return <div key={team.id} className={`${!canAfford || wouldExceedLimit ? 'opacity-50' : ''}`}>
                      <TeamCard team={team} isSelected={!!isSelected} onClick={() => !wouldExceedLimit && canAfford ? handleTeamToggle(team) : undefined} showPrice={true} budgetRemaining={tempBudgetRemaining} variant="selection" onStatsClick={handleStatsClick} onMatchesClick={handleMatchesClick} />
                    </div>;
              })}
                {filteredAmateurTeams.length === 0 && <div className="text-center py-8 text-gray-400">
                    No amateur teams match your filters
                  </div>}
              </div>
            </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Selected Teams Summary - Fixed at bottom */}
        {tempSelectedTeams.length > 0}

        {/* Bottom Actions - Always sticky */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-gray-700/50 pt-6 mt-6 space-y-3">
          {/* Budget Error Message */}
          {(() => {
            const teamsNeeded = 5 - tempSelectedTeams.length;
            const allAvailableTeams = [...proTeams, ...amateurTeams].filter(
              t => !tempSelectedTeams.some(s => s.id === t.id)
            );
            const cheapestTeamPrice = allAvailableTeams.length > 0 
              ? Math.min(...allAvailableTeams.map(t => t.price || 0))
              : 0;
            const showBudgetError = !swapMode && teamsNeeded > 0 && tempBudgetRemaining < cheapestTeamPrice;
            
            return showBudgetError ? (
              <div className="text-center px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-3">
                <p className="text-red-400 text-sm font-medium">
                  You've used your available budget without adding 5 teams. Remove a team and pick teams worth less credits!
                </p>
              </div>
            ) : null;
          })()}
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1 border-gray-600/50 text-gray-300 hover:bg-gray-800/50">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed">
              {swapMode ? 'Confirm Swap' : `Confirm Selection (${tempSelectedTeams.length}/5)`}
            </Button>
          </div>
          
          {!canSubmit && !swapMode && <div className="text-center text-red-400 text-sm">
              {tempSelectedTeams.length > 5 && "Too many teams selected"}
              {tempBudgetSpent > effectiveTotalBudget && "Budget exceeded"}
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

        {/* Round Details Modal */}
        <RoundDetailsModal 
          round={round} 
          open={roundDetailsOpen} 
          onOpenChange={setRoundDetailsOpen} 
        />

        {/* Team Matches Modal */}
        <TeamMatchesModal
          isOpen={matchesModalOpen}
          onClose={() => setMatchesModalOpen(false)}
          team={selectedMatchesTeam}
          roundStartDate={round.start_date}
          roundEndDate={round.end_date}
        />
      </SheetContent>
    </Sheet>;
};