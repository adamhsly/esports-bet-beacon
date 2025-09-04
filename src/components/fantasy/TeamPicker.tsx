import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Trophy, AlertTriangle, CheckCircle, Star, Info, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useDebounce } from '@/hooks/useDebounce';
import { Progress } from '@/components/ui/progress';
import { SelectedTeamsWidget } from './SelectedTeamsWidget';
import { TeamCard } from './TeamCard';
import { StarTeamConfirmModal } from './StarTeamConfirmModal';
import { LineupSuccessModal } from './LineupSuccessModal';
import { MultiTeamSelectionSheet } from './MultiTeamSelectionSheet';
import { useRoundStar } from '@/hooks/useRoundStar';
import { useRPCActions } from '@/hooks/useRPCActions';
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
  slug?: string; // optional slug for pro teams
  // Amateur metrics (previous fantasy window)
  matches_prev_window?: number;
  missed_pct?: number;
  total_scheduled?: number;
  // Pricing & metrics
  price?: number;
  recent_win_rate?: number; // 0..1
  match_volume?: number; // pro only
  abandon_rate?: number; // 0..1, amateur only
}
interface TeamPickerProps {
  round: FantasyRound;
  onBack: () => void;
  onNavigateToInProgress?: () => void;
}
export const TeamPicker: React.FC<TeamPickerProps> = ({
  round,
  onBack,
  onNavigateToInProgress
}) => {
  const {
    user
  } = useAuth();
  const {
    progressMission
  } = useRPCActions();
  const [proTeams, setProTeams] = useState<Team[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [benchTeam, setBenchTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);

  // Star Team functionality
  const [starTeamId, setStarTeamId] = useState<string | null>(null);
  const [showNoStarModal, setShowNoStarModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTeamSelectionSheet, setShowTeamSelectionSheet] = useState(false);
  const {
    setStarTeam
  } = useRoundStar(round.id);

  // Salary cap
  const SALARY_CAP = 50;
  const budgetSpent = useMemo(() => selectedTeams.reduce((sum, t) => sum + (t.price ?? 0), 0), [selectedTeams]);
  const budgetRemaining = Math.max(0, SALARY_CAP - budgetSpent);

  // Helper to format price as dollars in millions
  const formatMillions = (price?: number) => {
    if (price == null || isNaN(price)) return '';
    return `$${price.toFixed(1)}M`;
  };

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

  // Sorting
  const [proSortBy, setProSortBy] = useState<'price' | 'win_rate' | 'match_volume'>('price');
  const [proSortDir, setProSortDir] = useState<'asc' | 'desc'>('desc');
  const [amSortBy, setAmSortBy] = useState<'price' | 'win_rate' | 'abandon_rate' | 'matches_prev'>('price');
  const [amSortDir, setAmSortDir] = useState<'asc' | 'desc'>('desc');

  // Debounced search terms
  const debouncedProSearch = useDebounce(proSearch, 300);
  const debouncedAmSearch = useDebounce(amSearch, 300);
  useEffect(() => {
    if (user) {
      checkExistingSubmission();
    }
    fetchAvailableTeams();
  }, [round, user]);
  const checkExistingSubmission = async () => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.from('fantasy_round_picks').select('id').eq('user_id', user.id).eq('round_id', round.id).maybeSingle();
      if (error) throw error;
      if (data) {
        setHasExistingSubmission(true);
        // Show message and redirect to in-progress tab
        toast.error('You already have an active team for this round. You can only submit one lineup per round.', {
          action: {
            label: 'View In Progress',
            onClick: () => {
              onBack();
              if (onNavigateToInProgress) {
                onNavigateToInProgress();
              }
            }
          },
          duration: 8000
        });
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };
  const fetchAvailableTeams = async () => {
    try {
      setLoading(true);

      // Fetch pro teams from Pandascore matches within round period
      const {
        data: pandaMatches,
        error: pandaError
      } = await supabase.from('pandascore_matches').select('teams, esport_type').gte('start_time', round.start_date).lte('start_time', round.end_date).not('teams', 'is', null);
      if (pandaError) throw pandaError;

      // Extract unique pro teams with esport type and match count
      const proTeamMap = new Map<string, Team & {
        matches_in_period: number;
      }>();
      pandaMatches?.forEach(match => {
        if (match.teams && Array.isArray(match.teams)) {
          match.teams.forEach((teamObj: any) => {
            if (teamObj.type === 'Team' && teamObj.opponent) {
              const team = teamObj.opponent;
              // Use numeric PandaScore ID as primary (this matches fantasy_team_prices)
              const numericId = String(team.id);
              const existing = proTeamMap.get(numericId);
              if (existing) {
                existing.matches_in_period = (existing.matches_in_period || 0) + 1;
              } else {
                proTeamMap.set(numericId, {
                  id: numericId,
                  name: team.name || team.slug || 'Unknown Team',
                  type: 'pro',
                  logo_url: team.image_url,
                  esport_type: match.esport_type,
                  matches_in_period: 1,
                  slug: team.slug
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
      const [allTeamsRes, prevStatsRes, priceRowsRes] = await Promise.all([(supabase.rpc as any)('get_all_faceit_teams'), (supabase.rpc as any)('get_faceit_teams_prev_window_stats', {
        start_ts: prevStart.toISOString(),
        end_ts: prevEnd.toISOString()
      }), supabase.from('fantasy_team_prices').select('*').eq('round_id', round.id)]);
      if (allTeamsRes.error) throw allTeamsRes.error;
      if (prevStatsRes.error) throw prevStatsRes.error;
      if (priceRowsRes.error) throw priceRowsRes.error;
      const priceRows: Array<any> = priceRowsRes.data || [];
      const proPriceMap = new Map<string, any>();
      const amPriceMap = new Map<string, any>();
      priceRows.forEach(row => {
        if (row.team_type === 'pro') proPriceMap.set(row.team_id, row);
        if (row.team_type === 'amateur') amPriceMap.set(row.team_id, row);
      });

      // Attach prices to pro teams
      const proTeamDataWithPrice: Team[] = proTeamData.map(t => {
        const p = proPriceMap.get(t.id) ?? (t.slug ? proPriceMap.get(t.slug) : undefined);
        return {
          ...t,
          price: typeof p?.price === 'number' ? p.price : undefined,
          recent_win_rate: typeof p?.recent_win_rate === 'number' ? p.recent_win_rate : undefined,
          match_volume: typeof p?.match_volume === 'number' ? p.match_volume : t.matches_in_period
        } as Team;
      });
      console.debug('[TeamPicker] Pro teams priced', {
        roundId: round.id,
        total: proTeamDataWithPrice.length,
        priced: proTeamDataWithPrice.filter(tt => typeof tt.price === 'number').length
      });
      const stats: Array<any> = prevStatsRes.data || [];
      const statsMap = new Map<string, any>();
      stats.forEach(s => statsMap.set(s.team_id, s));
      const amateurTeamData: Team[] = (allTeamsRes.data || []).map((t: any) => {
        const s = statsMap.get(t.team_id);
        const p = amPriceMap.get(t.team_id);

        // Debug logging for first few teams
        if (Math.random() < 0.01) {
          // Log ~1% of teams to avoid spam
          console.log('[TeamPicker] Amateur team debug:', {
            teamId: t.team_id,
            teamName: t.team_name,
            priceData: p,
            matchVolume: p?.match_volume,
            finalMatchVolume: typeof p?.match_volume === 'number' ? p.match_volume : undefined
          });
        }
        return {
          id: t.team_id,
          name: t.team_name,
          type: 'amateur',
          logo_url: t.logo_url || undefined,
          esport_type: t.game,
          matches_prev_window: s?.played_matches ?? 0,
          missed_pct: typeof s?.missed_pct === 'number' ? Number(s.missed_pct) : undefined,
          total_scheduled: s?.total_scheduled ?? undefined,
          price: p?.price ?? undefined,
          abandon_rate: typeof p?.abandon_rate === 'number' ? p.abandon_rate : undefined,
          recent_win_rate: typeof p?.recent_win_rate === 'number' ? p.recent_win_rate : undefined,
          match_volume: typeof p?.match_volume === 'number' ? p.match_volume : undefined
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
      setProTeams(proTeamDataWithPrice);
      setAmateurTeams(amateurTeamData);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load available teams');
    } finally {
      setLoading(false);
    }
  };

  // Realtime: Update prices dynamically if they change
  useEffect(() => {
    const channel = supabase.channel('fantasy_team_prices_updates').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fantasy_team_prices',
      filter: `round_id=eq.${round.id}`
    }, (payload: any) => {
      const row = payload.new || payload.old;
      if (!row) return;
      if (row.team_type === 'pro') {
        setProTeams(prev => prev.map(t => t.id === row.team_id || t.slug === row.team_id ? {
          ...t,
          price: typeof row.price === 'number' ? row.price : t.price,
          recent_win_rate: typeof row.recent_win_rate === 'number' ? row.recent_win_rate : t.recent_win_rate,
          match_volume: typeof row.match_volume === 'number' ? row.match_volume : t.match_volume
        } : t));
      } else if (row.team_type === 'amateur') {
        setAmateurTeams(prev => prev.map(t => t.id === row.team_id ? {
          ...t,
          price: typeof row.price === 'number' ? row.price : t.price,
          recent_win_rate: typeof row.recent_win_rate === 'number' ? row.recent_win_rate : t.recent_win_rate,
          abandon_rate: typeof row.abandon_rate === 'number' ? row.abandon_rate : t.abandon_rate
        } : t));
      }
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [round.id]);

  // Unique game lists
  const proGames = useMemo(() => Array.from(new Set(proTeams.map(t => t.esport_type).filter(Boolean))) as string[], [proTeams]);
  const amateurGames = useMemo(() => Array.from(new Set(amateurTeams.map(t => t.esport_type).filter(Boolean))) as string[], [amateurTeams]);

  // Filtered + Sorted lists
  const filteredProTeams = useMemo(() => {
    const list = proTeams.filter(t => {
      const nameMatch = t.name.toLowerCase().includes(debouncedProSearch.toLowerCase());
      const gameMatch = selectedGamePro === 'all' || (t.esport_type ?? '') === selectedGamePro;
      const matches = t.matches_in_period ?? 0;
      const matchesMatch = matches >= minMatchesPro;
      const logoMatch = !hasLogoOnlyPro || !!t.logo_url;
      return nameMatch && gameMatch && matchesMatch && logoMatch;
    });
    const factor = proSortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = proSortBy === 'price' ? a.price ?? -Infinity : proSortBy === 'win_rate' ? a.recent_win_rate ?? -Infinity : a.match_volume ?? a.matches_in_period ?? -Infinity;
      const bv = proSortBy === 'price' ? b.price ?? -Infinity : proSortBy === 'win_rate' ? b.recent_win_rate ?? -Infinity : b.match_volume ?? b.matches_in_period ?? -Infinity;
      if (av === bv) return a.name.localeCompare(b.name);
      return (av - bv) * factor;
    });
  }, [proTeams, debouncedProSearch, selectedGamePro, minMatchesPro, hasLogoOnlyPro, proSortBy, proSortDir]);
  const filteredAmateurTeams = useMemo(() => {
    const list = amateurTeams.filter(t => {
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
    const factor = amSortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = amSortBy === 'price' ? a.price ?? -Infinity : amSortBy === 'win_rate' ? a.recent_win_rate ?? -Infinity : amSortBy === 'abandon_rate' ? a.abandon_rate ?? -Infinity : a.matches_prev_window ?? -Infinity;
      const bv = amSortBy === 'price' ? b.price ?? -Infinity : amSortBy === 'win_rate' ? b.recent_win_rate ?? -Infinity : amSortBy === 'abandon_rate' ? b.abandon_rate ?? -Infinity : b.matches_prev_window ?? -Infinity;
      if (av === bv) return a.name.localeCompare(b.name);
      return (av - bv) * factor;
    });
  }, [amateurTeams, debouncedAmSearch, selectedGameAm, minMatchesPrev, maxMissedPct, hasLogoOnlyAm, hasPrevMatchesOnlyAm, amSortBy, amSortDir]);
  const handleTeamSelect = (team: Team) => {
    if (selectedTeams.find(t => t.id === team.id)) {
      // If removing the starred team, clear star
      if (starTeamId === team.id) {
        setStarTeamId(null);
      }
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
      return;
    }
    if (selectedTeams.length >= 5) {
      toast.error('You can only select up to 5 teams');
      return;
    }
    const teamPrice = team.price ?? 0;
    const newSpent = budgetSpent + teamPrice;
    if (newSpent > SALARY_CAP) {
      toast.warning(`Budget exceeded. Adding ${team.name} (+${teamPrice}) goes over ${SALARY_CAP}.`);
      return;
    }
    setSelectedTeams([...selectedTeams, team]);
  };
  const handleTeamsUpdate = (teams: Team[]) => {
    // Clear star if the starred team is no longer selected
    if (starTeamId && !teams.find(t => t.id === starTeamId)) {
      setStarTeamId(null);
    }
    setSelectedTeams(teams);
  };
  const handleRemoveTeam = (indexOrId: number | string) => {
    let removedTeam: Team;
    let newSelectedTeams: Team[];
    if (typeof indexOrId === 'number') {
      // Handle by index (existing behavior)
      removedTeam = selectedTeams[indexOrId];
      newSelectedTeams = [...selectedTeams];
      newSelectedTeams.splice(indexOrId, 1);
    } else {
      // Handle by team ID (new behavior for TeamCard)
      removedTeam = selectedTeams.find(t => t.id === indexOrId)!;
      newSelectedTeams = selectedTeams.filter(t => t.id !== indexOrId);
    }

    // If removing the starred team, clear star
    if (starTeamId === removedTeam.id) {
      setStarTeamId(null);
    }
    setSelectedTeams(newSelectedTeams);
  };
  const handleBenchSelect = (team: Team) => {
    if (team.type !== 'amateur') {
      toast.error('Bench team must be an amateur team');
      return;
    }
    setBenchTeam(benchTeam?.id === team.id ? null : team);
  };
  const handleToggleStar = (teamId: string) => {
    if (starTeamId === teamId) {
      setStarTeamId(null);
    } else {
      setStarTeamId(teamId);
    }
  };
  const submitTeams = async () => {
    // Check again before submission in case user navigated directly
    if (hasExistingSubmission) {
      toast.error('You already have an active team for this round. You can only submit one lineup per round.', {
        action: {
          label: 'View In Progress',
          onClick: () => {
            onBack();
            if (onNavigateToInProgress) {
              onNavigateToInProgress();
            }
          }
        },
        duration: 8000
      });
      return;
    }
    try {
      setSubmitting(true);

      // Set star team if one is selected
      if (starTeamId) {
        const starResult = await setStarTeam(starTeamId);
        if (!starResult.success) {
          toast.error(starResult.error || 'Failed to set star team');
          return;
        }
      }

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
      const {
        error
      } = await supabase.from('fantasy_round_picks').insert({
        user_id: user.id,
        round_id: round.id,
        team_picks: teamPicksData,
        bench_team: benchTeamData
      });
      if (error) throw error;

      // Progress missions using MissionBus (non-blocking)
      try {
        const {
          MissionBus
        } = await import('@/lib/missionBus');
        MissionBus.onSubmitLineup();
        MissionBus.onJoinRoundAny();
        MissionBus.recordJoinType(round.type);
        MissionBus.onM2_JoinedType();
        if (selectedTeams.length >= 3) {
          MissionBus.onLineupHasThree();
        }
        const amateurCount = selectedTeams.filter(team => team.type === 'amateur').length;
        const proCount = selectedTeams.filter(team => team.type === 'pro').length;
        if (amateurCount >= 1) MissionBus.onLineupHasAmateur();
        if (amateurCount >= 3) MissionBus.onLineupHasThreeAmateurs();
        if (proCount >= 3) MissionBus.onLineupHasThreePros();
        if (starTeamId) MissionBus.onStarTeamChosen();
        // Month 1 submit (caller may gate by calendar externally)
        MissionBus.onM1_SubmitLineup();
      } catch (missionError) {
        console.warn('Mission progression failed (non-blocking)', missionError);
      }

      // Show success modal instead of navigating back immediately
      setShowSuccessModal(true);
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
        submitTeams();
      }, 500);
    }
  };
  const handleAuthModalClose = () => {
    setShowAuthModal(false);
    setPendingSubmission(false);
  };
  const getStarredTeamName = () => {
    const starredTeam = selectedTeams.find(t => t.id === starTeamId);
    return starredTeam?.name || null;
  };
  if (loading) {
    return <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading available teams...</p>
      </div>;
  }
  return <div className="space-y-6">
      

      {/* Selected Teams Widget */}
      <SelectedTeamsWidget selectedTeams={selectedTeams} benchTeam={benchTeam} budgetSpent={budgetSpent} budgetRemaining={budgetRemaining} salaryCapacity={SALARY_CAP} roundType={round.type} onRemoveTeam={handleRemoveTeam} proTeams={proTeams} amateurTeams={amateurTeams} onOpenMultiTeamSelector={() => setShowTeamSelectionSheet(true)} onTeamSelect={handleTeamSelect} starTeamId={starTeamId} onToggleStar={handleToggleStar} />

      {/* Team Selection Button */}
      <Card className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 border-gray-700/50">
        
      </Card>

      {/* Selected Teams Display */}
      {selectedTeams.length > 0}

      {/* Star Team Summary */}
      {selectedTeams.length > 0 && <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className={`h-5 w-5 ${starTeamId ? 'text-[#F5C042] fill-current' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium">
                  {getStarredTeamName() ? <>Star Team: <span className="text-[#F5C042]">{getStarredTeamName()}</span> (Double Points)</> : 'No Star Team selected'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Your Star Team scores double points this round. Choose wisely!
                </div>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your Star Team scores double points. You can still pick it once after the round starts, but only one change is allowed.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button onClick={async () => {
        if (!user) {
          setShowAuthModal(true);
          setPendingSubmission(true);
          return;
        }
        if (selectedTeams.length !== 5) {
          toast.error('Please select exactly 5 teams');
          return;
        }
        if (!starTeamId) {
          setShowNoStarModal(true);
          return;
        }
        await submitTeams();
      }} disabled={selectedTeams.length !== 5 || submitting} className="min-w-[120px] bg-theme-purple hover:bg-theme-purple/90">
          {submitting ? 'Submitting...' : 'Submit Team'}
        </Button>
      </div>

      {/* No Star Team Confirmation Modal */}
      <StarTeamConfirmModal open={showNoStarModal} onOpenChange={setShowNoStarModal} title="Proceed without a Star Team?" description="Your Star Team scores double points. You can still pick it once after the round starts, but only one change is allowed." onConfirm={async () => {
      setShowNoStarModal(false);
      await submitTeams();
    }} onCancel={() => setShowNoStarModal(false)} confirmText="Submit without Star" cancelText="Choose Star Team" />

      <LineupSuccessModal open={showSuccessModal} onOpenChange={setShowSuccessModal} roundId={round.id} roundName={`${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`} userId={user?.id || ''} starTeamName={getStarredTeamName()} onCheckProgress={() => {
      setShowSuccessModal(false);
      onBack();
    }} />

      <AuthModal isOpen={showAuthModal} onClose={handleAuthModalClose} onSuccess={handleAuthSuccess} />
      
      {/* Multi Team Selection Sheet */}
      <MultiTeamSelectionSheet isOpen={showTeamSelectionSheet} onClose={() => setShowTeamSelectionSheet(false)} proTeams={proTeams} amateurTeams={amateurTeams} selectedTeams={selectedTeams} onTeamsUpdate={handleTeamsUpdate} budgetRemaining={budgetRemaining} totalBudget={SALARY_CAP} />
    </div>;
};