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
}
export const MultiTeamSelectionSheet: React.FC<MultiTeamSelectionSheetProps> = ({
  isOpen,
  onClose,
  proTeams,
  amateurTeams,
  selectedTeams,
  onTeamsUpdate,
  budgetRemaining,
  totalBudget
}) => {
  const [activeTab, setActiveTab] = useState<'pro' | 'amateur'>('pro');
  const [tempSelectedTeams, setTempSelectedTeams] = useState<Team[]>([]);

  // Pro team filters
  const [proSearch, setProSearch] = useState('');
  const [selectedGamePro, setSelectedGamePro] = useState<string>('all');
  const [minMatchesPro, setMinMatchesPro] = useState<number>(0);
  const [hasLogoOnlyPro, setHasLogoOnlyPro] = useState<boolean>(false);
  const [priceRangePro, setPriceRangePro] = useState<number[]>([0, 100]);

  // Amateur team filters
  const [amSearch, setAmSearch] = useState('');
  const [selectedGameAm, setSelectedGameAm] = useState<string>('all');
  const [minMatchesPrev, setMinMatchesPrev] = useState<number>(0);
  const [maxMissedPct, setMaxMissedPct] = useState<number>(100);
  const [hasLogoOnlyAm, setHasLogoOnlyAm] = useState<boolean>(false);
  const [hasPrevMatchesOnlyAm, setHasPrevMatchesOnlyAm] = useState<boolean>(false);
  const [priceRangeAm, setPriceRangeAm] = useState<number[]>([0, 100]);
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
      const matches = t.matches_in_period ?? 0;
      const matchesMatch = matches >= minMatchesPro;
      const logoMatch = !hasLogoOnlyPro || !!t.logo_url;
      const budgetMatch = (t.price ?? 0) <= tempBudgetRemaining || tempSelectedTeams.find(st => st.id === t.id);
      const priceMatch = (t.price ?? 0) >= priceRangePro[0] && (t.price ?? 0) <= priceRangePro[1];
      return nameMatch && gameMatch && matchesMatch && logoMatch && budgetMatch && priceMatch;
    }).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [proTeams, debouncedProSearch, selectedGamePro, minMatchesPro, hasLogoOnlyPro, tempBudgetRemaining, priceRangePro, tempSelectedTeams]);
  const filteredAmateurTeams = useMemo(() => {
    return amateurTeams.filter(t => {
      const nameMatch = t.name.toLowerCase().includes(debouncedAmSearch.toLowerCase());
      const gameMatch = selectedGameAm === 'all' || (t.esport_type ?? '') === selectedGameAm;
      const matchesPrev = t.matches_prev_window ?? 0;
      const matchesMatch = matchesPrev >= minMatchesPrev;
      const missed = t.missed_pct ?? 100;
      const missedMatch = missed <= maxMissedPct;
      const logoMatch = !hasLogoOnlyAm || !!t.logo_url;
      const prevPlayedMatch = !hasPrevMatchesOnlyAm || matchesPrev > 0;
      const budgetMatch = (t.price ?? 0) <= tempBudgetRemaining || tempSelectedTeams.find(st => st.id === t.id);
      const priceMatch = (t.price ?? 0) >= priceRangeAm[0] && (t.price ?? 0) <= priceRangeAm[1];
      return nameMatch && gameMatch && matchesMatch && missedMatch && logoMatch && prevPlayedMatch && budgetMatch && priceMatch;
    }).sort((a, b) => (b.recent_win_rate ?? 0) - (a.recent_win_rate ?? 0));
  }, [amateurTeams, debouncedAmSearch, selectedGameAm, minMatchesPrev, maxMissedPct, hasLogoOnlyAm, hasPrevMatchesOnlyAm, tempBudgetRemaining, priceRangeAm, tempSelectedTeams]);
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
            <Progress value={tempBudgetSpent / totalBudget * 100} className="w-full h-2" />
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
                  <Input placeholder="Search pro teams..." value={proSearch} onChange={e => setProSearch(e.target.value)} className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={selectedGamePro} onValueChange={setSelectedGamePro}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white">
                      <SelectValue placeholder="All Games" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Games</SelectItem>
                      {proGames.map(game => <SelectItem key={game} value={game}>{game}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-sm">Min Matches: {minMatchesPro}</Label>
                    <Slider value={[minMatchesPro]} onValueChange={([value]) => setMinMatchesPro(value)} max={10} step={1} />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox id="pro-logo" checked={hasLogoOnlyPro} onCheckedChange={checked => setHasLogoOnlyPro(checked === true)} />
                  <Label htmlFor="pro-logo" className="text-gray-300 text-sm">With logo only</Label>
                </div>
              </div>
              
              {/* Pro Team List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredProTeams.map(team => {
                const isSelected = tempSelectedTeams.find(t => t.id === team.id);
                const canAfford = (team.price ?? 0) <= tempBudgetRemaining || isSelected;
                const wouldExceedLimit = !isSelected && tempSelectedTeams.length >= 5;
                return <div key={team.id} className={`${!canAfford || wouldExceedLimit ? 'opacity-50' : ''}`}>
                      <TeamCard team={team} isSelected={!!isSelected} onClick={() => !wouldExceedLimit && canAfford ? handleTeamToggle(team) : undefined} showPrice={true} budgetRemaining={tempBudgetRemaining} variant="selection" />
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
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-orange-400 mb-1">Amateur Team Bonus +25%</h4>
                    <p className="text-orange-300 text-sm">Amateur teams earn 25% bonus points</p>
                  </div>
                </div>
              </div>
              
              {/* Amateur Filters */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input placeholder="Search amateur teams..." value={amSearch} onChange={e => setAmSearch(e.target.value)} className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={selectedGameAm} onValueChange={setSelectedGameAm}>
                    <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white">
                      <SelectValue placeholder="All Games" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="all">All Games</SelectItem>
                      {amateurGames.map(game => <SelectItem key={game} value={game}>{game}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  
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
              
              {/* Amateur Team List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAmateurTeams.map(team => {
                const isSelected = tempSelectedTeams.find(t => t.id === team.id);
                const canAfford = (team.price ?? 0) <= tempBudgetRemaining || isSelected;
                const wouldExceedLimit = !isSelected && tempSelectedTeams.length >= 5;
                return <div key={team.id} className={`${!canAfford || wouldExceedLimit ? 'opacity-50' : ''}`}>
                      <TeamCard team={team} isSelected={!!isSelected} onClick={() => !wouldExceedLimit && canAfford ? handleTeamToggle(team) : undefined} showPrice={true} budgetRemaining={tempBudgetRemaining} variant="selection" />
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
        {tempSelectedTeams.length > 0 && (
          <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-gray-700/50 p-4 mt-6">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Selected Teams ({tempSelectedTeams.length}/5)</h4>
              <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                {tempSelectedTeams.map(team => (
                  <Badge 
                    key={team.id} 
                    variant="secondary" 
                    className="flex items-center gap-2 bg-gray-800/50 text-gray-300 border-gray-600/50 px-3 py-1"
                  >
                    <span className="truncate max-w-24">{team.name}</span>
                    <span className="text-xs text-green-400">{team.price}c</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveSelectedTeam(team.id)}
                      className="p-0 h-4 w-4 hover:bg-red-500/20"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions - Always sticky */}
        <div className="sticky bottom-0 left-0 right-0 bg-gradient-to-r from-[#0B0F14] to-[#12161C] border-t border-gray-700/50 pt-6 mt-6 space-y-3">
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1 border-gray-600/50 text-gray-300 hover:bg-gray-800/50">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!canSubmit} 
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirm Selection ({tempSelectedTeams.length}/5)
            </Button>
          </div>
          
          {!canSubmit && (
            <div className="text-center text-red-400 text-sm">
              {tempSelectedTeams.length > 5 && "Too many teams selected"}
              {tempBudgetSpent > totalBudget && "Budget exceeded"}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>;
};