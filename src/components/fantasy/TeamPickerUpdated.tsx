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
import { SelectedTeamsWidgetNew } from './SelectedTeamsWidgetNew';
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
  const { user } = useAuth();
  const { progressMission } = useRPCActions();
  const { availableCredits, spendBonusCredits } = useBonusCredits();
  
  const [proTeams, setProTeams] = useState<Team[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [benchTeam, setBenchTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);

  // Bonus Credits State
  const [useBonusCreditsState, setUseBonusCreditsState] = useState(false);
  const [bonusCreditsAmount, setBonusCreditsAmount] = useState(0);

  // Star Team functionality
  const [starTeamId, setStarTeamId] = useState<string | null>(null);
  const [showNoStarModal, setShowNoStarModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showTeamSelectionSheet, setShowTeamSelectionSheet] = useState(false);
  const { setStarTeam } = useRoundStar(round.id);

  // Salary cap and budget calculations
  const SALARY_CAP = 50;
  const totalBudget = SALARY_CAP + (useBonusCreditsState ? bonusCreditsAmount : 0);
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

  const fetchAvailableTeams = async () => {
    try {
      setLoading(true);
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

      // Map fantasy_team_prices data to Team interface
      const filteredProTeams = proData?.map((priceData: any) => ({
        id: priceData.team_id,
        name: priceData.team_name,
        type: 'pro' as const,
        price: priceData.price,
        recent_win_rate: priceData.recent_win_rate,
        match_volume: priceData.match_volume
      })) || [];

      const filteredAmateurTeams = amateurData?.map((priceData: any) => ({
        id: priceData.team_id,
        name: priceData.team_name,
        type: 'amateur' as const,
        price: priceData.price,
        recent_win_rate: priceData.recent_win_rate,
        abandon_rate: priceData.abandon_rate
      })) || [];

      setProTeams(filteredProTeams);
      setAmateurTeams(filteredAmateurTeams);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setLoading(false);
    }
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

      // Spend bonus credits if being used
      if (useBonusCreditsState && bonusCreditsAmount > 0) {
        const bonusSpent = await spendBonusCredits(round.id, bonusCreditsAmount);
        if (!bonusSpent) {
          throw new Error('Failed to spend bonus credits');
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
        MissionBus.onM2_JoinedType();
        MissionBus.onTypePerMonth(); // s_round_types_each_month tracking
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

      // Show success message
      toast.success(
        useBonusCreditsState 
          ? `Lineup saved with ${(bonusCreditsAmount).toFixed(1)} bonus credits used!`
          : 'Teams submitted successfully!'
      );

      // Check for star team performance mission (w_star_top)
      if (starTeamId) {
        await checkStarTeamPerformance(user.id, round.id, starTeamId);
      }

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
        <p className="text-muted-foreground">Loading available teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selected Teams Widget */}
      <SelectedTeamsWidgetNew 
        selectedTeams={selectedTeams} 
        benchTeam={benchTeam} 
        budgetSpent={budgetSpent} 
        budgetRemaining={budgetRemaining} 
        salaryCapacity={SALARY_CAP}
        bonusCreditsUsed={useBonusCreditsState ? bonusCreditsAmount : 0}
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

      {/* Bonus Credits Section */}
      {availableCredits > 0 && (
        <div className="bg-glass-card backdrop-blur-glass border border-glass-border rounded-xl p-4 shadow-glass">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-glass-text">
              💎 Bonus Credits Available
            </h3>
            <span className="text-glass-accent font-bold">
              {availableCredits.toFixed(1)}
            </span>
          </div>
          <p className="text-sm text-glass-muted mb-4">
            Use your earned credits to boost your budget for this round (one-time use).
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="useBonusCredits"
                checked={useBonusCreditsState}
                onCheckedChange={(checked) => {
                  setUseBonusCreditsState(!!checked);
                  if (!checked) {
                    setBonusCreditsAmount(0);
                  } else {
                    setBonusCreditsAmount(Math.min(availableCredits, 15));
                  }
                }}
              />
              <Label htmlFor="useBonusCredits" className="text-sm font-medium text-glass-text">
                Use bonus credits for this round
              </Label>
            </div>
            {useBonusCreditsState && (
              <div>
                <Label className="block text-sm font-medium text-glass-text mb-2">
                  Amount to use (max {availableCredits.toFixed(1)}):
                </Label>
                <Slider
                  value={[bonusCreditsAmount]}
                  onValueChange={(values) => setBonusCreditsAmount(values[0])}
                  max={availableCredits}
                  min={0}
                  step={1}
                  className="w-full"
                />
                <div className="text-center text-sm text-glass-accent font-medium mt-1">
                  {bonusCreditsAmount.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Star Team Summary */}
      {selectedTeams.length > 0 && (
        <div className="bg-glass-card backdrop-blur-glass border border-glass-border rounded-xl p-4 shadow-glass">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className={`h-5 w-5 ${starTeamId ? 'text-glass-accent fill-current' : 'text-glass-muted'}`} />
              <div>
                <div className="font-medium text-glass-text">
                  {getStarredTeamName() ? (
                    <>Star Team: <span className="text-glass-accent">{getStarredTeamName()}</span> (Double Points)</>
                  ) : (
                    'No Star Team selected'
                  )}
                </div>
                <div className="text-sm text-glass-muted">
                  Your Star Team scores double points this round. Choose wisely!
                </div>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-glass-muted hover:text-glass-text">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Your Star Team scores double points. You can change it once after the round starts.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}

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
            if (!starTeamId) {
              setShowNoStarModal(true);
              return;
            }
            await submitTeams();
          }} 
          disabled={selectedTeams.length !== 5 || submitting} 
          className="min-w-[120px] bg-glass-primary hover:bg-glass-primary/80 text-white backdrop-blur-sm"
        >
          {submitting ? 'Submitting...' : 'Submit Team'}
        </Button>
      </div>

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
          if (onNavigateToInProgress) {
            onNavigateToInProgress();
          } else {
            onBack();
          }
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
      />
    </div>
  );
};
