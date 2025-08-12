import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Trophy, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';

interface FantasyRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'open' | 'active' | 'finished';
}

interface Team {
  id: string;
  name: string;
  type: 'pro' | 'amateur';
  matches_in_period?: number; // Pro teams
  logo_url?: string;
  esport_type?: string;
  // Amateur metrics (previous fantasy window)
  matches_prev_window?: number;
  missed_pct?: number;
  total_scheduled?: number;
}

interface TeamPickerProps {
  round: FantasyRound;
  onBack: () => void;
  onNavigateToInProgress?: () => void;
}

export const TeamPicker: React.FC<TeamPickerProps> = ({ round, onBack, onNavigateToInProgress }) => {
  const { user } = useAuth();
  const [proTeams, setProTeams] = useState<Team[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [benchTeam, setBenchTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);

  // Filters - Pro (PandaScore)
  const [proSearch, setProSearch] = useState('');
  const [selectedGamePro, setSelectedGamePro] = useState<string>('all');
  const [minMatchesPro, setMinMatchesPro] = useState<number>(0);
  const [hasLogoOnlyPro, setHasLogoOnlyPro] = useState<boolean>(false);

  // Filters - Amateur (FACEIT)
  const [amSearch, setAmSearch] = useState('');
  const [selectedGameAm, setSelectedGameAm] = useState<string>('all');
  const [minMatchesPrev, setMinMatchesPrev] = useState<number>(0);
  const [maxMissedPct, setMaxMissedPct] = useState<number>(100);
  const [hasLogoOnlyAm, setHasLogoOnlyAm] = useState<boolean>(false);
  const [hasPrevMatchesOnlyAm, setHasPrevMatchesOnlyAm] = useState<boolean>(false);

  // Debounced search terms
  const debouncedProSearch = useDebounce(proSearch, 300);
  const debouncedAmSearch = useDebounce(amSearch, 300);

  useEffect(() => {
    fetchAvailableTeams();
  }, [round]);

  const fetchAvailableTeams = async () => {
    try {
      setLoading(true);
      
      // Fetch pro teams from Pandascore matches within round period
      const { data: pandaMatches, error: pandaError } = await supabase
        .from('pandascore_matches')
        .select('teams, esport_type')
        .gte('start_time', round.start_date)
        .lte('start_time', round.end_date)
        .not('teams', 'is', null);

      if (pandaError) throw pandaError;

      // Extract unique pro teams with esport type and match count
      const proTeamMap = new Map<string, Team & { matches_in_period: number }>();
      
      pandaMatches?.forEach(match => {
        if (match.teams && Array.isArray(match.teams)) {
          match.teams.forEach((teamObj: any) => {
            if (teamObj.type === 'Team' && teamObj.opponent) {
              const team = teamObj.opponent;
              const existing = proTeamMap.get(team.id);
              if (existing) {
                existing.matches_in_period = (existing.matches_in_period || 0) + 1;
              } else {
                proTeamMap.set(team.id, {
                  id: team.id,
                  name: team.name || team.slug || 'Unknown Team',
                  type: 'pro',
                  logo_url: team.image_url,
                  esport_type: match.esport_type,
                  matches_in_period: 1
                });
              }
            }
          });
        }
      });

      const proTeamData = Array.from(proTeamMap.values());

      // Fetch amateur teams from FACEIT database and compute previous-window stats
      const currentStart = new Date(round.start_date);
      const currentEnd = new Date(round.end_date);
      const prevEnd = currentStart;
      const prevStart = new Date(currentStart.getTime() - (currentEnd.getTime() - currentStart.getTime()));

      const [allTeamsRes, prevStatsRes] = await Promise.all([
        (supabase.rpc as any)('get_all_faceit_teams'),
        (supabase.rpc as any)('get_faceit_teams_prev_window_stats', {
          start_ts: prevStart.toISOString(),
          end_ts: prevEnd.toISOString()
        })
      ]);

      if (allTeamsRes.error) throw allTeamsRes.error;
      if (prevStatsRes.error) throw prevStatsRes.error;

      const stats: Array<any> = prevStatsRes.data || [];
      const statsMap = new Map<string, any>();
      stats.forEach((s) => statsMap.set(s.team_id, s));

      const amateurTeamData: Team[] = (allTeamsRes.data || []).map((t: any) => {
        const s = statsMap.get(t.team_id);
        return {
          id: t.team_id,
          name: t.team_name,
          type: 'amateur',
          logo_url: t.logo_url || undefined,
          esport_type: t.game,
          matches_prev_window: s?.played_matches ?? 0,
          missed_pct: typeof s?.missed_pct === 'number' ? Number(s.missed_pct) : undefined,
          total_scheduled: s?.total_scheduled ?? undefined,
        } as Team;
      }).sort((a: Team, b: Team) => {
        const aM = a.matches_prev_window || 0;
        const bM = b.matches_prev_window || 0;
        if (bM !== aM) return bM - aM;
        const aMiss = a.missed_pct ?? 999;
        const bMiss = b.missed_pct ?? 999;
        if (aMiss !== bMiss) return aMiss - bMiss;
        return a.name.localeCompare(b.name);
      });

      setProTeams(proTeamData);
      setAmateurTeams(amateurTeamData);

    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load available teams');
    } finally {
      setLoading(false);
    }
  };

  // Unique game lists
  const proGames = useMemo(() =>
    Array.from(new Set(proTeams.map((t) => t.esport_type).filter(Boolean))) as string[],
  [proTeams]);

  const amateurGames = useMemo(() =>
    Array.from(new Set(amateurTeams.map((t) => t.esport_type).filter(Boolean))) as string[],
  [amateurTeams]);

  // Filtered lists
  const filteredProTeams = useMemo(() => {
    return proTeams.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(debouncedProSearch.toLowerCase());
      const gameMatch = selectedGamePro === 'all' || (t.esport_type ?? '') === selectedGamePro;
      const matches = t.matches_in_period ?? 0;
      const matchesMatch = matches >= minMatchesPro;
      const logoMatch = !hasLogoOnlyPro || !!t.logo_url;
      return nameMatch && gameMatch && matchesMatch && logoMatch;
    });
  }, [proTeams, debouncedProSearch, selectedGamePro, minMatchesPro, hasLogoOnlyPro]);

  const filteredAmateurTeams = useMemo(() => {
    return amateurTeams.filter((t) => {
      const nameMatch = t.name.toLowerCase().includes(debouncedAmSearch.toLowerCase());
      const gameMatch = selectedGameAm === 'all' || (t.esport_type ?? '') === selectedGameAm;
      const matchesPrev = t.matches_prev_window ?? 0;
      const matchesMatch = matchesPrev >= minMatchesPrev;
      const missed = t.missed_pct ?? 100;
      const missedMatch = missed <= maxMissedPct;
      const logoMatch = !hasLogoOnlyAm || !!t.logo_url;
      const prevPlayedMatch = !hasPrevMatchesOnlyAm || matchesPrev > 0;
      return nameMatch && gameMatch && matchesMatch && missedMatch && logoMatch && prevPlayedMatch;
    });
  }, [amateurTeams, debouncedAmSearch, selectedGameAm, minMatchesPrev, maxMissedPct, hasLogoOnlyAm, hasPrevMatchesOnlyAm]);

  const handleTeamSelect = (team: Team) => {
    if (selectedTeams.find(t => t.id === team.id)) {
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
    } else if (selectedTeams.length < 5) {
      setSelectedTeams([...selectedTeams, team]);
    } else {
      toast.error('You can only select up to 5 teams');
    }
  };

  const handleBenchSelect = (team: Team) => {
    if (team.type !== 'amateur') {
      toast.error('Bench team must be an amateur team');
      return;
    }
    setBenchTeam(benchTeam?.id === team.id ? null : team);
  };

  const handleSubmit = async () => {
    if (!user) {
      setShowAuthModal(true);
      setPendingSubmission(true);
      return;
    }

    if (selectedTeams.length !== 5) {
      toast.error('Please select exactly 5 teams');
      return;
    }

    try {
      setSubmitting(true);

      // Need to convert team objects to plain objects for Supabase
      const teamPicksData = selectedTeams.map(team => ({
        id: team.id,
        name: team.name,
        type: team.type,
        logo_url: team.logo_url
      }));
      
      const benchTeamData = benchTeam ? {
        id: benchTeam.id, 
        name: benchTeam.name,
        type: benchTeam.type
      } : null;
      
      const { error } = await supabase
        .from('fantasy_round_picks')
        .insert({
          user_id: user.id,
          round_id: round.id,
          team_picks: teamPicksData,
          bench_team: benchTeamData
        });

      if (error) throw error;

      toast.success('Team submitted successfully!');
      console.log('Team submission successful, navigating to in-progress...');
      
      if (onNavigateToInProgress) {
        onNavigateToInProgress();
      } else {
        onBack();
      }
    } catch (error: any) {
      console.error('Error submitting team:', error);
      if (error.code === '23505') {
        toast.error('You have already submitted a team for this round');
      } else {
        toast.error('Failed to submit team');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    if (pendingSubmission) {
      setPendingSubmission(false);
      // Wait a bit for user state to update
      setTimeout(() => {
        handleSubmit();
      }, 500);
    }
  };

  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingSubmission(false);
  };

  const TeamCard: React.FC<{ team: Team; isSelected: boolean; onClick: () => void; showBench?: boolean; isBench?: boolean }> = ({ 
    team, isSelected, onClick, showBench = false, isBench = false 
  }) => (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md bg-card border-border ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      } ${isBench ? 'ring-2 ring-orange-500 bg-orange-50' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {team.logo_url && (
              <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded" />
            )}
            <div>
              <h4 className="font-semibold">{team.name}</h4>
              <div className="flex items-center gap-2">
                <Badge variant={team.type === 'pro' ? 'default' : 'secondary'} className="text-xs">
                  {team.type === 'pro' ? 'Pro' : 'Amateur'}
                </Badge>
                {team.type === 'amateur' && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {team.esport_type?.toUpperCase() || 'FACEIT'}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {team.matches_prev_window ?? 0} matches
                    </Badge>
                    {typeof team.missed_pct === 'number' && (
                      <Badge variant="outline" className="text-xs">
                        {team.missed_pct}% missed
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs">+25% bonus</Badge>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {team.type === 'amateur' && (
              <div className="text-right">
                <div className="text-sm font-medium">{team.matches_prev_window ?? 0} matches</div>
                <div className="text-xs text-muted-foreground">last window</div>
              </div>
            )}
            {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
            {isBench && <Badge variant="outline" className="text-xs">Bench</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading available teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold capitalize">{round.type} Round Team Selection</h2>
          <p className="text-muted-foreground">Select exactly 5 teams (mix pro and amateur). Optionally choose an amateur bench team.</p>
        </div>
      </div>

      {/* Selected Teams Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Selected Teams ({selectedTeams.length}/5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedTeams.length === 0 ? (
            <p className="text-muted-foreground">No teams selected yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedTeams.map(team => (
                <Badge key={team.id} variant="secondary" className="flex items-center gap-1">
                  {team.name}
                  {team.type === 'amateur' && <span className="text-xs text-green-600">+25%</span>}
                </Badge>
              ))}
            </div>
          )}
          {benchTeam && (
            <div className="mt-2">
              <Badge variant="outline" className="flex items-center gap-1 w-fit">
                Bench: {benchTeam.name}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Selection Tabs */}
      <Tabs defaultValue="pro" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pro">Pro Teams ({proTeams.length})</TabsTrigger>
          <TabsTrigger value="amateur">Amateur Teams ({amateurTeams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pro" className="space-y-4">
          {proTeams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No pro teams available for this round period</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Pro Team</h3>
                <p className="text-sm text-muted-foreground">Choose teams scheduled to play in this period</p>
              </div>
              
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Input
                    placeholder="Search teams..."
                    value={proSearch}
                    onChange={(e) => setProSearch(e.target.value)}
                    className="w-full md:w-64"
                  />
                  <Select value={selectedGamePro} onValueChange={setSelectedGamePro}>
                    <SelectTrigger className="w-[160px] rounded-xl bg-theme-gray-dark text-white border border-theme-gray-medium hover:bg-theme-purple/20 hover:border-theme-purple">
                      <SelectValue placeholder="Game" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-theme-gray-dark text-white border border-theme-gray-medium">
                      <SelectItem value="all" className="text-foreground text-sm md:text-base hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none">All games</SelectItem>
                      {proGames.map((g) => (
                        <SelectItem key={g} value={g as string} className="text-foreground text-sm md:text-base hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none">
                          {(g as string)?.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Min matches</Label>
                    <Slider
                      min={0}
                      max={10}
                      step={1}
                      value={[minMatchesPro]}
                      onValueChange={(v) => setMinMatchesPro(v[0] ?? 0)}
                      className="w-40"
                    />
                    <span className="text-sm text-muted-foreground w-10 text-right">{minMatchesPro}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="pro-logo" checked={hasLogoOnlyPro} onCheckedChange={(c) => setHasLogoOnlyPro(Boolean(c))} />
                    <Label htmlFor="pro-logo">With logo</Label>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Showing {filteredProTeams.length} of {proTeams.length}</div>
              </div>

              <Select onValueChange={(teamId) => {
                const team = filteredProTeams.find(t => t.id === teamId);
                if (team) handleTeamSelect(team);
              }}>
                <SelectTrigger className="w-full rounded-xl bg-theme-gray-dark text-white border border-theme-gray-medium hover:bg-theme-purple/20 hover:border-theme-purple">
                  <SelectValue placeholder="Select a pro team..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] z-50 bg-theme-gray-dark text-white border border-theme-gray-medium">
                  {filteredProTeams.map(team => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id}
                      aria-label={team.name}
                      className="text-foreground hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none"
                      disabled={!!selectedTeams.find(t => t.id === team.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {team.logo_url && (
                          <img 
                            src={team.logo_url} 
                            alt={team.name} 
                            className="w-6 h-6 rounded flex-shrink-0" 
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{team.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {team.esport_type?.toUpperCase()}
                            </Badge>
                            <Badge variant="default" className="text-xs">
                              Pro
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {team.matches_in_period} matches
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Pro Teams Display */}
              {selectedTeams.filter(t => t.type === 'pro').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Selected Pro Teams:</h4>
                  <div className="grid gap-2">
                    {selectedTeams.filter(t => t.type === 'pro').map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {team.logo_url && (
                            <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {team.esport_type?.toUpperCase()}
                              </Badge>
                              <Badge variant="default" className="text-xs">
                                Pro
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleTeamSelect(team)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="amateur" className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium text-orange-800">Amateur Team Notice</p>
                <p className="text-sm text-orange-700">
                  Amateur teams earn 25% bonus points but match activity varies. Teams with fewer matches may reduce your total score.
                </p>
              </div>
            </div>
          </div>

          {amateurTeams.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No amateur teams available for this round period</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Select Amateur Team</h3>
                <p className="text-sm text-muted-foreground">Choose amateur teams to add to your lineup</p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Input
                    placeholder="Search teams..."
                    value={amSearch}
                    onChange={(e) => setAmSearch(e.target.value)}
                    className="w-full md:w-64"
                  />
                  <Select value={selectedGameAm} onValueChange={setSelectedGameAm}>
                    <SelectTrigger className="w-[160px] rounded-xl bg-theme-gray-dark text-white border border-theme-gray-medium hover:bg-theme-purple/20 hover:border-theme-purple">
                      <SelectValue placeholder="Game" />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-theme-gray-dark text-white border border-theme-gray-medium">
                      <SelectItem value="all" className="text-foreground text-sm md:text-base hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none">All games</SelectItem>
                       {amateurGames.map((g) => (
                         <SelectItem key={g} value={g as string} className="text-foreground text-sm md:text-base hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none">
                           {(g as string)?.toUpperCase()}
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Min matches</Label>
                    <Slider
                      min={0}
                      max={20}
                      step={1}
                      value={[minMatchesPrev]}
                      onValueChange={(v) => setMinMatchesPrev(v[0] ?? 0)}
                      className="w-40"
                    />
                    <span className="text-sm text-muted-foreground w-10 text-right">{minMatchesPrev}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Max missed %</Label>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[maxMissedPct]}
                      onValueChange={(v) => setMaxMissedPct(v[0] ?? 100)}
                      className="w-40"
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">{maxMissedPct}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="am-logo" checked={hasLogoOnlyAm} onCheckedChange={(c) => setHasLogoOnlyAm(Boolean(c))} />
                    <Label htmlFor="am-logo">With logo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="am-hasprev" checked={hasPrevMatchesOnlyAm} onCheckedChange={(c) => setHasPrevMatchesOnlyAm(Boolean(c))} />
                    <Label htmlFor="am-hasprev">Has matches last window</Label>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Showing {filteredAmateurTeams.length} of {amateurTeams.length}</div>
              </div>

              {/* Amateur dropdown selection */}
              <Select onValueChange={(teamId) => {
                const team = filteredAmateurTeams.find(t => t.id === teamId);
                if (team) handleTeamSelect(team);
              }}>
                <SelectTrigger className="w-full rounded-xl bg-theme-gray-dark text-white border border-theme-gray-medium hover:bg-theme-purple/20 hover:border-theme-purple">
                  <SelectValue placeholder="Select an amateur team..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] z-50 bg-theme-gray-dark text-white border border-theme-gray-medium">
                  {filteredAmateurTeams.map(team => (
                    <SelectItem 
                      key={team.id} 
                      value={team.id}
                      aria-label={team.name}
                      className="text-foreground hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none"
                      disabled={!!selectedTeams.find(t => t.id === team.id)}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {team.logo_url && (
                          <img 
                            src={team.logo_url} 
                            alt={team.name} 
                            className="w-6 h-6 rounded flex-shrink-0" 
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{team.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {team.esport_type?.toUpperCase()}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Amateur
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {team.matches_prev_window ?? 0} matches
                            </Badge>
                            {typeof team.missed_pct === 'number' && (
                              <Badge variant="outline" className="text-xs">
                                {team.missed_pct}% missed
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Selected Amateur Teams Display */}
              {selectedTeams.filter(t => t.type === 'amateur').length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Selected Amateur Teams:</h4>
                  <div className="grid gap-2">
                    {selectedTeams.filter(t => t.type === 'amateur').map(team => (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {team.logo_url && (
                            <img src={team.logo_url} alt={team.name} className="w-8 h-8 rounded" />
                          )}
                          <div>
                            <div className="font-medium">{team.name}</div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {team.esport_type?.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                Amateur
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleTeamSelect(team)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Bench Team (Optional)</h3>
                  <p className="text-sm text-muted-foreground">Used if main team doesn't play</p>
                </div>

                <Select value={benchTeam?.id ?? "__none__"} onValueChange={(teamId) => {
                  if (teamId === "__none__") { setBenchTeam(null); return; }
                  const team = filteredAmateurTeams.find(t => t.id === teamId);
                  if (team) handleBenchSelect(team);
                }}>
                  <SelectTrigger className="w-full rounded-xl bg-theme-gray-dark text-white border border-theme-gray-medium hover:bg-theme-purple/20 hover:border-theme-purple">
                    <SelectValue placeholder="Select an amateur bench team..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] z-50 bg-theme-gray-dark text-white border border-theme-gray-medium">
                    <SelectItem value="__none__" className="text-foreground text-sm md:text-base hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none">None</SelectItem>
                    {filteredAmateurTeams.map(team => (
                      <SelectItem key={`bench-${team.id}`} value={team.id} className="text-foreground hover:bg-theme-purple/10 focus:bg-theme-purple/20 data-[state=checked]:bg-theme-purple/20 data-[state=checked]:text-white focus-visible:ring-2 focus-visible:ring-theme-purple outline-none">
                        <div className="flex items-center gap-3 w-full">
                          {team.logo_url && (
                            <img src={team.logo_url} alt={team.name} className="w-6 h-6 rounded flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{team.name}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {team.esport_type?.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">Amateur</Badge>
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={selectedTeams.length !== 5 || submitting}
          className="min-w-[120px] bg-theme-purple hover:bg-theme-purple/90"
        >
          {submitting ? 'Submitting...' : 'Submit Team'}
        </Button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
};