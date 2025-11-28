import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Users, Trophy, AlertTriangle, CheckCircle, Star, Info, Plus, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { useDebounce } from '@/hooks/useDebounce';
import { Progress } from '@/components/ui/progress';
import { SelectedTeamsWidget } from './SelectedTeamsWidget';
import { TeamCard } from './TeamCard';
import { StarTeamConfirmModal } from './StarTeamConfirmModal';
import { LineupSuccessModal } from './LineupSuccessModal';
import { MultiTeamSelectionSheet } from './MultiTeamSelectionSheet';
import { useRoundStar } from '@/hooks/useRoundStar';
import { useRPCActions } from '@/hooks/useRPCActions';
import { useBonusCredits } from '@/hooks/useBonusCredits';
import { checkStarTeamPerformance } from '@/lib/starTeamChecker';


interface FantasyRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'private';
  start_date: string;
  end_date: string;
  status: 'open' | 'active' | 'finished';
  is_private?: boolean;
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
  const { user } = useAuth();
  const { progressMission } = useRPCActions();
  const { availableCredits: availableBonusCredits, spendBonusCredits } = useBonusCredits();
  
  const [proTeams, setProTeams] = useState<Team[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [benchTeam, setBenchTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);

  // Price calculation status tracking
  const [priceStatus, setPriceStatus] = useState<'loading' | 'calculating' | 'ready' | 'error'>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 5;
  const RETRY_INTERVAL = 2000; // 2 seconds

  // Star Team functionality
  const [starTeamId, setStarTeamId] = useState<string | null>(null);
  const [showNoStarModal, setShowNoStarModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTeamSelectionSheet, setShowTeamSelectionSheet] = useState(false);
  const { setStarTeam } = useRoundStar(round.id);

  // Salary cap and budget calculations - automatic bonus credits
  const SALARY_CAP = 50;
  const totalBudget = SALARY_CAP + availableBonusCredits;
  const budgetSpent = useMemo(() => selectedTeams.reduce((sum, t) => sum + (t.price ?? 0), 0), [selectedTeams]);
  const budgetRemaining = Math.max(0, totalBudget - budgetSpent);

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
      const { data, error } = await supabase
        .from('fantasy_round_picks')
        .select('id')
        .eq('user_id', user.id)
        .eq('round_id', round.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setHasExistingSubmission(true);
        // Navigate directly to in-progress tab
        onBack();
        if (onNavigateToInProgress) {
          onNavigateToInProgress();
        }
        return;
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    }
  };

  const fetchAvailableTeams = async (isRetry = false) => {
    try {
      setLoading(true);
      setPriceStatus(isRetry ? 'calculating' : 'loading');
      
      const { data: proData, error: proError } = await supabase
        .from('fantasy_team_prices')
        .select('*')
        .eq('team_type', 'pro')
        .eq('round_id', round.id)
        .like('team_name', `%${debouncedProSearch}%`)
        .order('price', { ascending: proSortDir === 'asc' })
        .then(res => {
          if (res.error) throw res.error;
          return res;
        });

      const { data: amateurData, error: amateurError } = await supabase
        .from('fantasy_team_prices')
        .select('*')
        .eq('team_type', 'amateur')
        .eq('round_id', round.id)
        .like('team_name', `%${debouncedAmSearch}%`)
        .order('price', { ascending: amSortDir === 'asc' })
        .then(res => {
          if (res.error) throw res.error;
          return res;
        });

      if (proError) throw proError;
      if (amateurError) throw amateurError;

      // Fetch logos for pro teams from pandascore_teams
      const proTeamIds = proData?.map((p: any) => p.team_id) || [];
      let logoMap = new Map<string, string>();
      
      if (proTeamIds.length > 0) {
        const { data: teamsWithLogos } = await supabase
          .from('pandascore_teams')
          .select('team_id, logo_url')
          .in('team_id', proTeamIds);
        
        teamsWithLogos?.forEach((t: any) => {
          if (t.logo_url) {
            logoMap.set(String(t.team_id), t.logo_url);
          }
        });
      }

      // Map fantasy_team_prices data to Team interface with logos
      const filteredProTeams = proData?.map((priceData: any) => ({
        id: priceData.team_id,
        name: priceData.team_name,
        type: 'pro' as const,
        price: priceData.price,
        recent_win_rate: priceData.recent_win_rate,
        match_volume: priceData.match_volume,
        logo_url: logoMap.get(String(priceData.team_id))
      })) || [];

      const filteredAmateurTeams = amateurData?.map((priceData: any) => ({
        id: priceData.team_id,
        name: priceData.team_name,
        type: 'amateur' as const,
        price: priceData.price,
        recent_win_rate: priceData.recent_win_rate,
        abandon_rate: priceData.abandon_rate,
        match_volume: priceData.match_volume
      })) || [];

      // Check if we got any teams
      const totalTeams = filteredProTeams.length + filteredAmateurTeams.length;
      
      if (totalTeams === 0 && retryCount < MAX_RETRIES) {
        console.log(`No teams found, attempt ${retryCount + 1}/${MAX_RETRIES}`);
        
        // Trigger price calculation on first empty result
        if (retryCount === 0) {
          console.log('Triggering price calculation for round:', round.id);
          setPriceStatus('calculating');
          
          try {
            const { error: calcError } = await supabase.functions.invoke('calculate-team-prices', {
              body: { 
                round_id: round.id,
                PRO_MULTIPLIER: 1.2,
                AMATEUR_MULTIPLIER: 0.9,
                MIN_PRICE: 5,
                MAX_PRICE: 20,
                ABANDON_PENALTY_MULTIPLIER: 5
              }
            });
            
            if (calcError) {
              console.error('Error invoking price calculation:', calcError);
            } else {
              console.log('Price calculation triggered successfully');
            }
          } catch (invokeError) {
            console.error('Failed to invoke price calculation:', invokeError);
          }
        }
        
        // Schedule retry
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchAvailableTeams(true);
        }, RETRY_INTERVAL);
        return;
      }

      // Successfully got teams or exhausted retries
      setProTeams(filteredProTeams);
      setAmateurTeams(filteredAmateurTeams);
      setPriceStatus(totalTeams > 0 ? 'ready' : 'error');
      setLoading(false);
      
      if (totalTeams > 0) {
        console.log(`Loaded ${filteredProTeams.length} pro teams and ${filteredAmateurTeams.length} amateur teams`);
      } else if (retryCount >= MAX_RETRIES) {
        console.error('Failed to load teams after maximum retries');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setPriceStatus('error');
      setLoading(false);
    }
  };

  const handleManualRefresh = () => {
    console.log('Manual refresh triggered');
    setRetryCount(0);
    fetchAvailableTeams(false);
  };

  const handleTeamSelect = (team: Team) => {
    const teamPrice = team.price || 0;
    const isSelected = selectedTeams.some(t => t.id === team.id);
    
    if (isSelected) {
      setSelectedTeams(selectedTeams.filter(t => t.id !== team.id));
    } else {
      if (selectedTeams.length >= 5) {
        toast.error('You can only select 5 teams maximum.');
        return;
      }
      
      const newBudgetSpent = budgetSpent + teamPrice;
      if (newBudgetSpent > totalBudget) {
        toast.error('This team would exceed your available budget.');
        return;
      }
      
      setSelectedTeams([...selectedTeams, team]);
    }
  };

  const handleRemoveTeam = (index: number) => {
    const newSelectedTeams = [...selectedTeams];
    newSelectedTeams.splice(index, 1);
    setSelectedTeams(newSelectedTeams);
  };

  const handleTeamsUpdate = (newSelectedTeams: Team[]) => {
    if (newSelectedTeams.length > 5) {
      toast.error('You can select a maximum of 5 teams');
      return;
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
    if (hasExistingSubmission) {
      onBack();
      if (onNavigateToInProgress) {
        onNavigateToInProgress();
      }
      return;
    }

    try {
      setSubmitting(true);

      // Automatically calculate and spend bonus credits if needed
      const bonusCreditsNeeded = Math.max(0, budgetSpent - SALARY_CAP);
      if (bonusCreditsNeeded > 0) {
        const { data, error } = await supabase.rpc('spend_bonus_credits', {
          p_user: user.id,
          p_round: round.id,
          p_base_amount: Math.min(budgetSpent, SALARY_CAP),
          p_bonus_amount: bonusCreditsNeeded
        });

        if (error || !data) {
          console.error('Failed to spend bonus credits:', error);
          throw new Error(`Failed to auto-spend ${bonusCreditsNeeded} bonus credits. Please check your available balance.`);
        }
      }

      // Convert team objects to plain objects for Supabase
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
      
      // Insert the team picks
      const { error } = await supabase
        .from('fantasy_round_picks')
        .insert({
          user_id: user.id,
          round_id: round.id,
          team_picks: teamPicksData,
          bench_team: benchTeamData
        });

      if (error) throw error;

      // Set star team if one is selected
      if (starTeamId) {
        const starResult = await setStarTeam(starTeamId);
        if (!starResult.success) {
          toast.error(starResult.error || 'Failed to set star team');
        }
      }

      // Progress missions using MissionBus
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onSubmitLineup();
        MissionBus.onJoinRoundAny();
        MissionBus.recordJoinType(round.type);
        MissionBus.recordJoinTypeMonth(round.type); // s_round_types_each_month tracking
        MissionBus.onM2_JoinedType();
        
        // Award XP for lineup submission which will handle streak tracking
        await progressMission('d_submit_lineup');
        
        if (selectedTeams.length >= 3) {
          MissionBus.onLineupHasThree();
        }
        const amateurCount = selectedTeams.filter(team => team.type === 'amateur').length;
        const proCount = selectedTeams.filter(team => team.type === 'pro').length;
        if (amateurCount >= 1) MissionBus.onLineupHasAmateur();
        if (amateurCount >= 3) MissionBus.onLineupHasThreeAmateurs();
        if (proCount >= 3) MissionBus.onLineupHasThreePros();
        if (starTeamId) MissionBus.onStarTeamChosen();
        MissionBus.onM1_SubmitLineup();
      } catch (missionError) {
        console.warn('Mission progression failed (non-blocking)', missionError);
      }

      // Show success modal
      setShowSuccessModal(true);

      // Check for star team performance mission (w_star_top)
      if (starTeamId) {
        await checkStarTeamPerformance(user.id, round.id, starTeamId);
      }
    } catch (error: any) {
      console.error('Error submitting team:', error);
      if (error.code === '23505') {
        toast.error('You have already submitted a team for this round');
      } else if (error.message?.includes('bonus credits')) {
        toast.error(error.message);
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
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        {priceStatus === 'calculating' ? (
          <div className="space-y-3">
            <p className="text-muted-foreground font-medium">Setting up team prices for this round...</p>
            <p className="text-sm text-muted-foreground">This may take a few moments. (Attempt {retryCount + 1}/{MAX_RETRIES})</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Loading available teams...</p>
        )}
      </div>
    );
  }

  // Show error state with retry button if loading failed
  if (priceStatus === 'error' && proTeams.length === 0 && amateurTeams.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">Unable to load team prices</p>
          <p className="text-sm text-muted-foreground">Team prices couldn't be calculated for this round.</p>
        </div>
        <Button 
          onClick={handleManualRefresh}
          className="mx-auto"
          variant="default"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Loading Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Teams Widget */}
      <SelectedTeamsWidget 
        selectedTeams={selectedTeams} 
        benchTeam={benchTeam} 
        budgetSpent={budgetSpent} 
        budgetRemaining={budgetRemaining} 
        salaryCapacity={SALARY_CAP}
        bonusCreditsUsed={Math.max(0, budgetSpent - SALARY_CAP)}
        totalBudget={totalBudget}
        roundType={round.type} 
        onRemoveTeam={handleRemoveTeam} 
        proTeams={proTeams} 
        amateurTeams={amateurTeams} 
        onOpenMultiTeamSelector={() => setShowTeamSelectionSheet(true)} 
        onTeamSelect={handleTeamSelect} 
        starTeamId={starTeamId} 
        onToggleStar={handleToggleStar} 
      />

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button 
          onClick={async () => {
            if (!user) {
              setShowAuthModal(true);
              setPendingSubmission(true);
              return;
            }
            if (selectedTeams.length !== 5) {
              toast.error('Please select exactly 5 teams');
              return;
            }
            // Validate budget with bonus credits
            const bonusCreditsNeeded = Math.max(0, budgetSpent - SALARY_CAP);
            if (bonusCreditsNeeded > availableBonusCredits) {
              toast.error(`Need ${bonusCreditsNeeded} bonus credits but you only have ${availableBonusCredits} available.`);
              return;
            }
            if (!starTeamId) {
              setShowNoStarModal(true);
              return;
            }
            await submitTeams();
          }} 
          disabled={selectedTeams.length !== 5 || submitting} 
          className="w-full max-w-md h-14 text-lg font-semibold bg-theme-purple hover:bg-theme-purple/90"
        >
          {submitting ? 'Submitting...' : 'Submit Team'}
        </Button>
      </div>

      {/* Star Team Summary */}
      {selectedTeams.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4 border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className={`h-5 w-5 ${starTeamId ? 'text-[#F5C042] fill-current' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium">
                  {getStarredTeamName() ? (
                    <>Star Team: <span className="text-[#F5C042]">{getStarredTeamName()}</span> (Double Points)</>
                  ) : (
                    'No Star Team selected'
                  )}
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
        </div>
      )}

      {/* Bonus Credits Info - Auto-deducted */}
      {availableBonusCredits > 0 && (
        <Card className="bg-gradient-to-br from-orange-900/20 to-amber-900/20 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-300">Bonus Credits Available</h3>
                  <p className="text-sm text-orange-400">
                    {availableBonusCredits > 0 
                      ? `${availableBonusCredits} credits earned from XP rewards`
                      : 'No bonus credits available'
                    }
                  </p>
                </div>
              </div>
              {budgetSpent > SALARY_CAP && (
                <div className="text-right">
                  <p className="text-sm text-orange-300 font-medium">
                    Auto-deducting: {budgetSpent - SALARY_CAP} credits
                  </p>
                  <p className="text-xs text-orange-400">
                    Required for your current selection
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <StarTeamConfirmModal 
        open={showNoStarModal} 
        onOpenChange={setShowNoStarModal} 
        title="Proceed without a Star Team?" 
        description="Your Star Team scores double points. You can still pick it once after the round starts, but only one change is allowed." 
        onConfirm={async () => {
          setShowNoStarModal(false);
          await submitTeams();
        }} 
        onCancel={() => setShowNoStarModal(false)} 
        confirmText="Submit without Star" 
        cancelText="Choose Star Team" 
      />

      <LineupSuccessModal 
        open={showSuccessModal} 
        onOpenChange={setShowSuccessModal} 
        roundId={round.id} 
        roundName={`${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`} 
        userId={user?.id || ''} 
        starTeamName={getStarredTeamName()} 
        onCheckProgress={() => {
          setShowSuccessModal(false);
          onBack(); // Close the TeamPicker modal first
          setTimeout(() => {
            if (onNavigateToInProgress) {
              onNavigateToInProgress();
            }
          }, 100); // Small delay to ensure modal closes before navigation
        }}
      />

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={handleAuthModalClose} 
        onSuccess={handleAuthSuccess} 
      />
      
      <MultiTeamSelectionSheet 
        isOpen={showTeamSelectionSheet} 
        onClose={() => setShowTeamSelectionSheet(false)} 
        proTeams={proTeams} 
        amateurTeams={amateurTeams} 
        selectedTeams={selectedTeams} 
        onTeamsUpdate={handleTeamsUpdate} 
        budgetRemaining={budgetRemaining} 
        totalBudget={totalBudget}
        round={round}
      />
    </div>
  );
};
