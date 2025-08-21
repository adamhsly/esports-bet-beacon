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
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerOverlay, DrawerPortal } from '@/components/ui/drawer';
import { Search, Filter, Trophy, Users, AlertTriangle, X, Plus } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface TeamSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  proTeams: Team[];
  amateurTeams: Team[];
  selectedTeams: Team[];
  onTeamSelect: (team: Team) => void;
  budgetRemaining: number;
  slotIndex: number;
}

export const TeamSelectionModal: React.FC<TeamSelectionModalProps> = ({
  isOpen,
  onClose,
  proTeams,
  amateurTeams,
  selectedTeams,
  onTeamSelect,
  budgetRemaining,
  slotIndex
}) => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'pro' | 'amateur'>('pro');
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // Pro team filters
  const [proSearch, setProSearch] = useState('');
  const [selectedGamePro, setSelectedGamePro] = useState<string>('all');
  const [minMatchesPro, setMinMatchesPro] = useState<number>(0);
  const [hasLogoOnlyPro, setHasLogoOnlyPro] = useState<boolean>(false);

  // Amateur team filters
  const [amSearch, setAmSearch] = useState('');
  const [selectedGameAm, setSelectedGameAm] = useState<string>('all');
  const [minMatchesPrev, setMinMatchesPrev] = useState<number>(0);
  const [maxMissedPct, setMaxMissedPct] = useState<number>(100);
  const [hasLogoOnlyAm, setHasLogoOnlyAm] = useState<boolean>(false);
  const [hasPrevMatchesOnlyAm, setHasPrevMatchesOnlyAm] = useState<boolean>(false);

  const debouncedProSearch = useDebounce(proSearch, 300);
  const debouncedAmSearch = useDebounce(amSearch, 300);

  // Get unique games
  const proGames = useMemo(() => 
    Array.from(new Set(proTeams.map(t => t.esport_type).filter(Boolean))) as string[], 
    [proTeams]
  );
  const amateurGames = useMemo(() => 
    Array.from(new Set(amateurTeams.map(t => t.esport_type).filter(Boolean))) as string[], 
    [amateurTeams]
  );

  // Filter teams
  const filteredProTeams = useMemo(() => {
    return proTeams.filter(t => {
      const nameMatch = t.name.toLowerCase().includes(debouncedProSearch.toLowerCase());
      const gameMatch = selectedGamePro === 'all' || (t.esport_type ?? '') === selectedGamePro;
      const matches = t.matches_in_period ?? 0;
      const matchesMatch = matches >= minMatchesPro;
      const logoMatch = !hasLogoOnlyPro || !!t.logo_url;
      const budgetMatch = (t.price ?? 0) <= budgetRemaining;
      const notAlreadySelected = !selectedTeams.find(st => st.id === t.id);
      
      return nameMatch && gameMatch && matchesMatch && logoMatch && budgetMatch && notAlreadySelected;
    }).sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  }, [proTeams, debouncedProSearch, selectedGamePro, minMatchesPro, hasLogoOnlyPro, budgetRemaining, selectedTeams]);

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
      const budgetMatch = (t.price ?? 0) <= budgetRemaining;
      const notAlreadySelected = !selectedTeams.find(st => st.id === t.id);
      
      return nameMatch && gameMatch && matchesMatch && missedMatch && logoMatch && prevPlayedMatch && budgetMatch && notAlreadySelected;
    }).sort((a, b) => (b.recent_win_rate ?? 0) - (a.recent_win_rate ?? 0));
  }, [amateurTeams, debouncedAmSearch, selectedGameAm, minMatchesPrev, maxMissedPct, hasLogoOnlyAm, hasPrevMatchesOnlyAm, budgetRemaining, selectedTeams]);

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
  };

  const handleAddTeam = () => {
    if (selectedTeam) {
      onTeamSelect(selectedTeam);
      onClose();
    }
  };

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTeam(null);
      setProSearch('');
      setAmSearch('');
    }
  }, [isOpen]);

  const TeamCard: React.FC<{ team: Team; isSelected: boolean; onClick: () => void }> = ({ 
    team, 
    isSelected, 
    onClick 
  }) => {
    const isAmateur = team.type === 'amateur';
    const canAfford = (team.price ?? 0) <= budgetRemaining;
    
    return (
      <Card 
        className={`cursor-pointer transition-all duration-250 hover:scale-[1.02] ${
          isSelected 
            ? `ring-2 ${isAmateur ? 'ring-orange-400 bg-orange-500/10' : 'ring-blue-400 bg-blue-500/10'} shadow-lg ${isAmateur ? 'shadow-orange-400/20' : 'shadow-blue-400/20'}` 
            : `hover:shadow-md ${canAfford ? 'hover:ring-1 hover:ring-gray-400/30' : 'opacity-50 cursor-not-allowed'}`
        } bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50`}
        onClick={canAfford ? onClick : undefined}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            {/* Team Logo */}
            <div className={`relative p-2 rounded-lg ${
              isAmateur 
                ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30' 
                : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-400/30'
            }`}>
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.name} className="w-8 h-8 object-contain" />
              ) : (
                isAmateur ? <Users className="w-8 h-8 text-orange-400" /> : <Trophy className="w-8 h-8 text-blue-400" />
              )}
            </div>
            
            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate">{team.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={isAmateur ? 'secondary' : 'default'} className="text-xs">
                  {isAmateur ? 'Amateur' : 'Pro'}
                </Badge>
                {isAmateur && (
                  <Badge className="text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-400/50">
                    +25% Bonus
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Price */}
            <div className="text-right">
              <div className={`font-bold text-lg ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                {team.price ?? 0}
              </div>
              <div className="text-xs text-gray-400">credits</div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Matches:</span>
              <span className="ml-1 text-white font-medium">
                {isAmateur ? team.matches_prev_window ?? 0 : team.matches_in_period ?? 0}
              </span>
            </div>
            {team.recent_win_rate !== undefined && (
              <div>
                <span className="text-gray-400">Win Rate:</span>
                <span className="ml-1 text-white font-medium">
                  {Math.round((team.recent_win_rate ?? 0) * 100)}%
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const modalContent = (
    <div className="flex flex-col h-full max-h-[80vh] bg-gradient-to-br from-[#0B0F14] to-[#12161C]">
      {/* Header */}
      <div className="relative p-6 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Select Team for Slot {slotIndex + 1}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Budget remaining: <span className="text-green-400 font-medium">{budgetRemaining} credits</span>
            </p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-gray-800/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pro' | 'amateur')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800/50 border border-gray-700/50">
            <TabsTrigger 
              value="pro" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 transition-all duration-250"
            >
              <Trophy className="w-4 h-4 mr-2" />
              Pro Teams
            </TabsTrigger>
            <TabsTrigger 
              value="amateur" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-red-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25 transition-all duration-250"
            >
              <Users className="w-4 h-4 mr-2" />
              Amateur Teams
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} className="h-full flex flex-col">
          <TabsContent value="pro" className="flex-1 overflow-hidden m-0 p-6 space-y-4">
            {/* Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search pro teams..."
                  value={proSearch}
                  onChange={(e) => setProSearch(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 focus:border-blue-400/50 focus:ring-blue-400/25"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={selectedGamePro} onValueChange={setSelectedGamePro}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white">
                    <SelectValue placeholder="All Games" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Games</SelectItem>
                    {proGames.map(game => (
                      <SelectItem key={game} value={game}>{game}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Min Matches: {minMatchesPro}</Label>
                  <Slider
                    value={[minMatchesPro]}
                    onValueChange={([value]) => setMinMatchesPro(value)}
                    max={10}
                    step={1}
                    className="[&_[role=slider]]:bg-blue-500 [&_[role=slider]]:border-blue-400"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="pro-logo" 
                    checked={hasLogoOnlyPro} 
                    onCheckedChange={(checked) => setHasLogoOnlyPro(checked === true)}
                    className="border-gray-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-400"
                  />
                  <Label htmlFor="pro-logo" className="text-gray-300 text-sm">With logo only</Label>
                </div>
              </div>
            </div>
            
            {/* Team List */}
            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {filteredProTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isSelected={selectedTeam?.id === team.id}
                  onClick={() => handleTeamClick(team)}
                />
              ))}
              {filteredProTeams.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No pro teams match your filters
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="amateur" className="flex-1 overflow-hidden m-0 p-6 space-y-4">
            {/* Amateur Warning Banner */}
            <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-400/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-orange-400 mb-1">Amateur Team Bonus 25%</h4>
                </div>
              </div>
            </div>
            
            {/* Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search amateur teams..."
                  value={amSearch}
                  onChange={(e) => setAmSearch(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-700/50 text-white placeholder-gray-400 focus:border-orange-400/50 focus:ring-orange-400/25"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={selectedGameAm} onValueChange={setSelectedGameAm}>
                  <SelectTrigger className="bg-gray-800/50 border-gray-700/50 text-white">
                    <SelectValue placeholder="All Games" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="all">All Games</SelectItem>
                    {amateurGames.map(game => (
                      <SelectItem key={game} value={game}>{game}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Min Matches: {minMatchesPrev}</Label>
                  <Slider
                    value={[minMatchesPrev]}
                    onValueChange={([value]) => setMinMatchesPrev(value)}
                    max={20}
                    step={1}
                    className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-400"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Max Missed %: {maxMissedPct}%</Label>
                  <Slider
                    value={[maxMissedPct]}
                    onValueChange={([value]) => setMaxMissedPct(value)}
                    max={100}
                    step={5}
                    className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-400"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="am-logo" 
                      checked={hasLogoOnlyAm} 
                      onCheckedChange={(checked) => setHasLogoOnlyAm(checked === true)}
                      className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-400"
                    />
                    <Label htmlFor="am-logo" className="text-gray-300 text-sm">With logo only</Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="am-matches" 
                      checked={hasPrevMatchesOnlyAm} 
                      onCheckedChange={(checked) => setHasPrevMatchesOnlyAm(checked === true)}
                      className="border-gray-600 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-400"
                    />
                    <Label htmlFor="am-matches" className="text-gray-300 text-sm">Has matches last window</Label>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Team List */}
            <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {filteredAmateurTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  isSelected={selectedTeam?.id === team.id}
                  onClick={() => handleTeamClick(team)}
                />
              ))}
              {filteredAmateurTeams.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No amateur teams match your filters
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sticky Bottom Button */}
      <div className="border-t border-gray-700/50 p-6 bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm">
        <Button 
          onClick={handleAddTeam}
          disabled={!selectedTeam}
          className={`w-full py-4 text-lg font-semibold transition-all duration-250 ${
            selectedTeam 
              ? `bg-gradient-to-r ${
                  selectedTeam.type === 'amateur' 
                    ? 'from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 shadow-lg shadow-orange-500/25' 
                    : 'from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 shadow-lg shadow-blue-500/25'
                } text-white border-0 hover:scale-[1.02]` 
              : 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          {selectedTeam ? `Add Team: ${selectedTeam.name}` : 'Select a team to add'}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerPortal>
          <DrawerOverlay className="fixed inset-0 z-50 bg-black/80" />
          <DrawerContent className="fixed inset-x-0 bottom-0 z-50 h-[80vh] rounded-t-xl border-t border-gray-700/50">
            {modalContent}
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
        <DialogContent className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl max-h-[90vh] translate-x-[-50%] translate-y-[-50%] border border-gray-700/50 shadow-2xl duration-250 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-xl overflow-hidden">
          {modalContent}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};