import React, { useEffect, useMemo, useRef, useState } from 'react';
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
 import { usePaidRoundCheckout, TeamPickData } from '@/hooks/usePaidRoundCheckout';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';
import { checkStarTeamPerformance } from '@/lib/starTeamChecker';
import { TeamPickerWalkthrough } from './TeamPickerWalkthrough';
import { RoundDetailsModal } from './RoundDetailsModal';
 import { PaymentMethodModal, PaymentMethod } from '@/components/PaymentMethodModal';
import { formatCurrency } from '@/utils/currencyUtils';


interface FantasyRound {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'private';
  start_date: string;
  end_date: string;
  status: 'open' | 'active' | 'finished' | 'scheduled';
  is_private?: boolean;
  game_type?: string;
  team_type?: 'pro' | 'amateur' | 'both';
  round_name?: string;
  entry_fee?: number | null;
  prize_type?: 'credits' | 'vouchers';
  prize_1st?: number;
  prize_2nd?: number;
  prize_3rd?: number;
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

type PendingLineupSubmission = {
  roundId: string;
  selectedTeams: Team[];
  benchTeam: Team | null;
  starTeamId: string | null;
  createdAt: number;
};

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
  const { user, loading: authLoading } = useAuth();
  const { progressMission } = useRPCActions();
  const { availableCredits: availableBonusCredits, spendBonusCredits } = useBonusCredits();
  const { initiateCheckout, loading: checkoutLoading } = usePaidRoundCheckout();
  const { status: welcomeOfferStatus } = useWelcomeOffer();
  
  const [proTeams, setProTeams] = useState<Team[]>([]);
  const [amateurTeams, setAmateurTeams] = useState<Team[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Team[]>([]);
  const [benchTeam, setBenchTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [hasExistingSubmission, setHasExistingSubmission] = useState(false);
  const [existingPickId, setExistingPickId] = useState<string | null>(null);
  const [existingSubmissionChecked, setExistingSubmissionChecked] = useState(false);
  const autoSubmitInFlightRef = useRef(false);
  const authFlowCompletedRef = useRef(false);
  
  // User's promo balance for determining free entry eligibility
  const [userPromoBalance, setUserPromoBalance] = useState<number>(0);

  const pendingStorageKey = useMemo(
    () => `fantasy:pending_lineup_submit:${round.id}`,
    [round.id]
  );
  const PENDING_TTL_MS = 15 * 60 * 1000;

  const persistPendingSubmission = (payload: PendingLineupSubmission) => {
    try {
      sessionStorage.setItem(pendingStorageKey, JSON.stringify(payload));
    } catch {}
  };

  const clearPersistedPendingSubmission = () => {
    try {
      sessionStorage.removeItem(pendingStorageKey);
    } catch {}
  };

  // Restore queued submission (and the user's picks) after returning from /auth
  // or an email-confirmation redirect.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(pendingStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as PendingLineupSubmission | null;
      if (!parsed || parsed.roundId !== round.id) return;

      if (Date.now() - (parsed.createdAt ?? 0) > PENDING_TTL_MS) {
        clearPersistedPendingSubmission();
        return;
      }

      if (Array.isArray(parsed.selectedTeams) && parsed.selectedTeams.length > 0) {
        setSelectedTeams(parsed.selectedTeams);
        setBenchTeam(parsed.benchTeam ?? null);
        setStarTeamId(parsed.starTeamId ?? null);
        setPendingSubmission(true);
      }
    } catch {
      clearPersistedPendingSubmission();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingStorageKey, round.id]);

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
  const [sheetHasBeenOpened, setSheetHasBeenOpened] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
   const [showPaymentModal, setShowPaymentModal] = useState(false);
   const [pendingPaymentData, setPendingPaymentData] = useState<{
     teamPicksData: TeamPickData[];
     benchTeamData: { id: string; name: string; type: string } | null;
     starTeamId: string | null;
   } | null>(null);
  const { setStarTeam } = useRoundStar(round.id);

  // Track if sheet has ever been opened (for skipping walkthrough)
  useEffect(() => {
    if (showTeamSelectionSheet && !sheetHasBeenOpened) {
      setSheetHasBeenOpened(true);
    }
  }, [showTeamSelectionSheet, sheetHasBeenOpened]);

  // Salary cap and budget calculations - automatic bonus credits (only for authenticated users)
  const SALARY_CAP = 50;
  const isFreeRound = !round.entry_fee || round.entry_fee === 0;
  // For unauthenticated users on free rounds, only show base budget
  const effectiveBonusCredits = user ? availableBonusCredits : 0;
  const totalBudget = SALARY_CAP + effectiveBonusCredits;
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

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch user's promo balance for free entry eligibility
  useEffect(() => {
    const fetchPromoBalance = async () => {
      if (!user) {
        setUserPromoBalance(0);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('promo_balance_pence')
          .eq('id', user.id)
          .single();
        setUserPromoBalance(data?.promo_balance_pence || 0);
      } catch (err) {
        console.error('Error fetching promo balance:', err);
      }
    };
    fetchPromoBalance();
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      checkExistingSubmission();
    } else {
      setExistingSubmissionChecked(false);
    }
    fetchAvailableTeams();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round.id, user?.id]);

  const checkExistingSubmission = async () => {
    if (!user) return;
    setExistingSubmissionChecked(false);

    try {
      const { data, error } = await supabase
        .from('fantasy_round_picks')
        .select('id, team_picks')
        .eq('user_id', user.id)
        .eq('round_id', round.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Check if team_picks is populated (has actual teams selected)
        const teamPicks = data.team_picks as any[];
        const hasTeams = teamPicks && Array.isArray(teamPicks) && teamPicks.length > 0;

        if (hasTeams) {
          // Already submitted with teams - redirect to in-progress
          setHasExistingSubmission(true);
          onBack();
          if (onNavigateToInProgress) {
            onNavigateToInProgress();
          }
          return;
        } else {
          // Empty picks exist (from paid entry) - allow team selection
          console.log('Found empty pick entry from paid round, allowing team selection');
          setExistingPickId(data.id);
          setHasExistingSubmission(false);
        }
      }
    } catch (error) {
      console.error('Error checking existing submission:', error);
    } finally {
      setExistingSubmissionChecked(true);
    }
  };

  const fetchAvailableTeams = async (isRetry = false) => {
    try {
      setLoading(true);
      setPriceStatus(isRetry ? 'calculating' : 'loading');
      
      // Skip pro query entirely if team_type is set to amateur only
      const shouldFetchPro = !round.team_type || round.team_type !== 'amateur';
      // Skip amateur query entirely if team_type is set to pro only
      const shouldFetchAmateur = !round.team_type || round.team_type !== 'pro';
      
      // Build queries with round filters - only apply search if non-empty
      let proQuery = supabase
        .from('fantasy_team_prices')
        .select('*')
        .eq('team_type', 'pro')
        .eq('round_id', round.id);
      
      if (debouncedProSearch) {
        proQuery = proQuery.ilike('team_name', `%${debouncedProSearch}%`);
      }
      
      let amateurQuery = supabase
        .from('fantasy_team_prices')
        .select('*')
        .eq('team_type', 'amateur')
        .eq('round_id', round.id);
      
      if (debouncedAmSearch) {
        amateurQuery = amateurQuery.ilike('team_name', `%${debouncedAmSearch}%`);
      }

      const { data: proData, error: proError } = shouldFetchPro 
        ? await proQuery.order('price', { ascending: proSortDir === 'asc' })
        : { data: [], error: null };

      const { data: amateurData, error: amateurError } = shouldFetchAmateur
        ? await amateurQuery.order('price', { ascending: amSortDir === 'asc' })
        : { data: [], error: null };

      if (proError) throw proError;
      if (amateurError) throw amateurError;

      console.log(`Initial fetch: ${proData?.length || 0} pro prices, ${amateurData?.length || 0} amateur prices for round ${round.id}`);

      // Fetch logos and esport_type for pro teams from pandascore_teams
      const proTeamIds = proData?.map((p: any) => p.team_id) || [];
      let teamInfoMap = new Map<string, { logo_url?: string; esport_type?: string }>();
      
      if (proTeamIds.length > 0) {
        const { data: teamsWithInfo } = await supabase
          .from('pandascore_teams')
          .select('team_id, logo_url, esport_type')
          .in('team_id', proTeamIds);
        
        teamsWithInfo?.forEach((t: any) => {
          teamInfoMap.set(String(t.team_id), {
            logo_url: t.logo_url,
            esport_type: t.esport_type
          });
        });
      }

      // Map fantasy_team_prices data to Team interface with logos and esport_type
      let filteredProTeams = proData?.map((priceData: any) => {
        const teamInfo = teamInfoMap.get(String(priceData.team_id));
        return {
          id: priceData.team_id,
          name: priceData.team_name,
          type: 'pro' as const,
          price: priceData.price,
          recent_win_rate: priceData.recent_win_rate,
          match_volume: priceData.match_volume,
          logo_url: teamInfo?.logo_url,
          esport_type: teamInfo?.esport_type
        };
      }) || [];
      
      // Apply game_type filter if configured (only for specific game types, not 'all')
      if (round.game_type && round.game_type !== 'all' && filteredProTeams.length > 0) {
        const gameTypeLower = round.game_type.toLowerCase();
        // Map cs2 to Counter-Strike variants
        const isCSVariant = (esportType: string) => {
          const lower = esportType.toLowerCase();
          return lower === 'counter-strike' || lower === 'cs2' || lower === 'csgo';
        };
        
        filteredProTeams = filteredProTeams.filter((team: any) => {
          const teamEsport = (team.esport_type ?? '').toLowerCase();
          // If looking for CS2, match all CS variants
          if (gameTypeLower === 'cs2' || gameTypeLower === 'counter-strike') {
            return isCSVariant(team.esport_type ?? '');
          }
          return teamEsport === gameTypeLower;
        });
      }

      let filteredAmateurTeams = amateurData?.map((priceData: any) => ({
        id: priceData.team_id,
        name: priceData.team_name,
        type: 'amateur' as const,
        price: priceData.price,
        recent_win_rate: priceData.recent_win_rate,
        abandon_rate: priceData.abandon_rate,
        match_volume: priceData.match_volume,
        esport_type: 'cs2' // All amateur teams are from FACEIT CS2
      })) || [];
      
      // Apply game_type filter if configured (amateur teams are cs2)
      if (round.game_type && round.game_type !== 'all' && filteredAmateurTeams.length > 0) {
        const gameTypeLower = round.game_type.toLowerCase();
        // Only show amateur teams if game_type is cs-related
        if (gameTypeLower !== 'counter-strike' && gameTypeLower !== 'cs2') {
          filteredAmateurTeams = [];
        }
      }

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

    // Auth can take a moment to propagate after signup/login; avoid crashing on user.id
    if (!user) {
      toast.error('Finishing sign-in… please wait a moment and try again.');
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
      
      // Check if we're updating an existing empty pick (from paid entry) or inserting new
      if (existingPickId) {
        // Update existing empty pick from paid entry
        const { error } = await supabase
          .from('fantasy_round_picks')
          .update({
            team_picks: teamPicksData,
            bench_team: benchTeamData,
            submitted_at: new Date().toISOString()
          })
          .eq('id', existingPickId);

        if (error) throw error;
      } else {
        // Check if this is a paid round without existing entry - needs checkout first
        const isPaidRound = round.entry_fee && round.entry_fee > 0;
        
        if (isPaidRound) {
         // Store the payment data and show payment method modal
         setPendingPaymentData({
           teamPicksData,
           benchTeamData,
           starTeamId,
         });
         setShowPaymentModal(true);
         setSubmitting(false);
         return;
        }
        
        // Insert new pick for free round
        const { error } = await supabase
          .from('fantasy_round_picks')
          .insert({
            user_id: user.id,
            round_id: round.id,
            team_picks: teamPicksData,
            bench_team: benchTeamData
          });

        if (error) throw error;

        // Track affiliate activation for free round entries
        try {
          await supabase.functions.invoke('track-affiliate-activation', {
            body: { round_id: round.id }
          });
        } catch (affiliateError) {
          console.warn('Affiliate tracking failed (non-blocking):', affiliateError);
        }
      }

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
      clearPersistedPendingSubmission();
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

  const handleAuthSuccess = () => {
    // Called on sign-in OR after successful sign-up (even if email confirmation is required).
    authFlowCompletedRef.current = true;
    setShowAuthModal(false);
  };

  useEffect(() => {
    if (!pendingSubmission) return;
    if (authLoading) return;
    if (!user?.id) return;
    if (!existingSubmissionChecked) return;
    if (autoSubmitInFlightRef.current) return;

    // If no star team chosen yet, keep `pendingSubmission` true so once they pick a star
    // team we can submit immediately.
    if (!starTeamId) {
      setShowNoStarModal(true);
      return;
    }

    autoSubmitInFlightRef.current = true;
    clearPersistedPendingSubmission();
    setPendingSubmission(false);

    void (async () => {
      try {
        await submitTeams();
      } finally {
        autoSubmitInFlightRef.current = false;
      }
    })();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSubmission, authLoading, user?.id, existingSubmissionChecked, starTeamId]);

  const handleAuthModalClose = () => {
    setShowAuthModal(false);

    // If the user dismissed the modal without completing sign-in/sign-up, cancel the queued submit.
    if (!user?.id && !authFlowCompletedRef.current) {
      setPendingSubmission(false);
      clearPersistedPendingSubmission();
    }

    // Reset for next time
    authFlowCompletedRef.current = false;
  };


  const getStarredTeamName = () => {
    const starredTeam = selectedTeams.find(t => t.id === starTeamId);
    return starredTeam?.name || null;
  };

  if (loading) {
    return (
      <>
        <TeamPickerWalkthrough skip={sheetHasBeenOpened} />
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
      </>
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

  // Get display title for round
  const getRoundDisplayTitle = () => {
    const name = round.round_name || `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`;
    const parts = name.split(' - ');
    return parts[parts.length - 1].trim();
  };

  // Format prize amount based on type (using proper currency formatting)
  const formatPrize = (amount: number, prizeType: 'credits' | 'vouchers' = 'credits') => {
    if (prizeType === 'vouchers') {
      return formatCurrency(amount);
    }
    return amount.toString();
  };

  // Format total prize pot (same as RoundSelector - using proper currency formatting)
  const formatTotalPrize = (prize1st: number, prize2nd: number, prize3rd: number, prizeType: 'credits' | 'vouchers' = 'credits') => {
    const total = prize1st + prize2nd + prize3rd;
    if (prizeType === 'vouchers') {
      return formatCurrency(total);
    }
    return `${total} Credits`;
  };

  const prizeType = round.prize_type || 'credits';
  const totalPrizeDisplay = formatTotalPrize(round.prize_1st ?? 200, round.prize_2nd ?? 100, round.prize_3rd ?? 50, prizeType);

  return (
    <div className="space-y-4">
      <TeamPickerWalkthrough skip={sheetHasBeenOpened} />

      {/* Round Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold text-white">
            {getRoundDisplayTitle()}
          </h2>
          <button 
            onClick={() => setShowRulesModal(true)}
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Info className="h-4 w-4 text-gray-300" />
          </button>
        </div>
        
        {/* Prize Display - Aggregated like RoundSelector */}
        <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 rounded-lg px-4 py-2">
          <Trophy className="h-5 w-5 text-emerald-300" />
          <span className="text-base font-bold text-emerald-300">{totalPrizeDisplay} in prizes</span>
        </div>
      </div>

      {/* Selected Teams Widget */}
      {(() => {
        // Calculate if budget error should be shown
        const teamsNeeded = 5 - selectedTeams.length;
        const allAvailableTeams = [...proTeams, ...amateurTeams].filter(
          t => !selectedTeams.some(s => s.id === t.id)
        );
        const cheapestTeamPrice = allAvailableTeams.length > 0 
          ? Math.min(...allAvailableTeams.map(t => t.price || 0))
          : 0;
        const showBudgetError = teamsNeeded > 0 && budgetRemaining < cheapestTeamPrice;
        
        return (
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
            showBudgetError={showBudgetError}
          />
        );
      })()}

      {/* Pick For Me Button */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={() => {
            // Combine all available teams based on round's team_type
            let availableTeams: Team[] = [];
            if (round.team_type === 'pro') {
              availableTeams = [...proTeams];
            } else if (round.team_type === 'amateur') {
              availableTeams = [...amateurTeams];
            } else {
              availableTeams = [...proTeams, ...amateurTeams];
            }

            if (availableTeams.length < 5) {
              toast.error('Not enough teams available to pick from');
              return;
            }

            // Shuffle and pick teams that fit within budget
            const shuffled = availableTeams.sort(() => Math.random() - 0.5);
            const picked: Team[] = [];
            let spent = 0;
            const budget = user ? totalBudget : SALARY_CAP;

            for (const team of shuffled) {
              if (picked.length >= 5) break;
              const price = team.price ?? 0;
              if (spent + price <= budget) {
                picked.push(team);
                spent += price;
              }
            }

            if (picked.length < 5) {
              // If we couldn't get 5 teams within budget, just pick the 5 cheapest
              const sortedByPrice = [...availableTeams].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
              picked.length = 0;
              for (let i = 0; i < 5 && i < sortedByPrice.length; i++) {
                picked.push(sortedByPrice[i]);
              }
            }

            setSelectedTeams(picked);
            // Set the first team as star team
            if (picked.length > 0) {
              setStarTeamId(picked[0].id);
            }
            toast.success('Random lineup selected!');
          }}
          disabled={loading || proTeams.length + amateurTeams.length < 5}
          className="w-full max-w-md flex items-center justify-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          Pick for me
        </Button>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button 
          data-walkthrough="submit-button"
          onClick={async () => {
            if (selectedTeams.length !== 5) {
              toast.error('Please select exactly 5 teams');
              return;
            }
            
            // Check if this is a free round (no entry fee)
            const isFreeRound = !round.entry_fee || round.entry_fee === 0;
            
            // For unauthenticated users, queue an auto-submit and send them through auth
            if (!user) {
              if (isFreeRound) {
                // Validate budget stays within base 50 credits for unauthenticated users
                if (budgetSpent > SALARY_CAP) {
                  toast.error('Please stay within the 50 credit budget. Login to use bonus credits.');
                  return;
                }
              }

              authFlowCompletedRef.current = false;
              persistPendingSubmission({
                roundId: round.id,
                selectedTeams,
                benchTeam,
                starTeamId,
                createdAt: Date.now()
              });

              setShowAuthModal(true);
              setPendingSubmission(true);
              return;
            }

            // For authenticated users, validate budget with bonus credits
            const bonusCreditsNeeded = Math.max(0, budgetSpent - SALARY_CAP);
            if (bonusCreditsNeeded > availableBonusCredits) {
              toast.error(`Need ${bonusCreditsNeeded} bonus credits but you only have ${availableBonusCredits} available.`);
              return;
            }
            if (!starTeamId) {
              setShowNoStarModal(true);
              return;
            }

            clearPersistedPendingSubmission();
            await submitTeams();
          }} 
          disabled={selectedTeams.length !== 5 || submitting || checkoutLoading} 
          className="w-full max-w-md h-14 text-lg font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all disabled:opacity-50 disabled:shadow-none"
        >
        {submitting || checkoutLoading ? 'Processing...' : (
          user 
            ? (round.entry_fee && round.entry_fee > 0 
                ? (() => {
                    // Check if user has promo balance OR unclaimed tier 1 free entry
                    // IMPORTANT: Don't show free entry if they've already used one
                    const hasUnclaimedFreeEntry = welcomeOfferStatus?.tier === 1 && !welcomeOfferStatus?.offerClaimed && !welcomeOfferStatus?.hasUsedPromoEntry;
                    const effectiveBalance = userPromoBalance > 0 ? userPromoBalance : (hasUnclaimedFreeEntry ? (welcomeOfferStatus?.rewardPence || 250) : 0);
                    return effectiveBalance >= round.entry_fee ? 'Submit Team' : 'Pay & Submit';
                  })()
                : 'Submit Team') 
            : 'Create Account & Submit'
        )}
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
          clearPersistedPendingSubmission();
          setPendingSubmission(false);
          await submitTeams();
        }} 
        onCancel={() => setShowNoStarModal(false)} 
        confirmText="Submit without Star" 
        cancelText="Choose Star Team" 
      />

      <LineupSuccessModal 
        open={showSuccessModal} 
        onOpenChange={(open) => {
          setShowSuccessModal(open);
          if (!open) {
            onBack();
            setTimeout(() => {
              if (onNavigateToInProgress) {
                onNavigateToInProgress();
              }
            }, 100);
          }
        }} 
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

      <RoundDetailsModal 
        round={round} 
        open={showRulesModal} 
        onOpenChange={setShowRulesModal} 
      />
 
     <PaymentMethodModal
       open={showPaymentModal}
       onOpenChange={(open) => {
         setShowPaymentModal(open);
         if (!open) setPendingPaymentData(null);
       }}
       onSelect={async (method: PaymentMethod) => {
         if (!pendingPaymentData) return;
         
         setSubmitting(true);
         const result = await initiateCheckout(round.id, {
           teamPicks: pendingPaymentData.teamPicksData,
           benchTeam: pendingPaymentData.benchTeamData,
           starTeamId: pendingPaymentData.starTeamId,
           paymentMethod: method,
         });
         
         // If promo covered the entry, picks are already saved - show success
         if (result?.promoCovered) {
           clearPersistedPendingSubmission();
           setShowPaymentModal(false);
           setPendingPaymentData(null);
           
           // Progress missions
           try {
             const { MissionBus } = await import('@/lib/missionBus');
             MissionBus.onSubmitLineup();
             MissionBus.onJoinRoundAny();
             MissionBus.recordJoinType(round.type);
             MissionBus.recordJoinTypeMonth(round.type);
             MissionBus.onM2_JoinedType();
             await progressMission('d_submit_lineup');
             if (selectedTeams.length >= 3) MissionBus.onLineupHasThree();
             const amateurCount = selectedTeams.filter(team => team.type === 'amateur').length;
             const proCount = selectedTeams.filter(team => team.type === 'pro').length;
             if (amateurCount >= 1) MissionBus.onLineupHasAmateur();
             if (amateurCount >= 3) MissionBus.onLineupHasThreeAmateurs();
             if (proCount >= 3) MissionBus.onLineupHasThreePros();
             if (pendingPaymentData.starTeamId) MissionBus.onStarTeamChosen();
             MissionBus.onM1_SubmitLineup();
           } catch (missionError) {
             console.warn('Mission progression failed (non-blocking)', missionError);
           }
           
           setShowSuccessModal(true);
           setSubmitting(false);
           return;
         }
         
         // If redirecting to payment, store submission for after payment
         if (result?.redirecting) {
           persistPendingSubmission({
             roundId: round.id,
             selectedTeams,
             benchTeam,
             starTeamId: pendingPaymentData.starTeamId,
             createdAt: Date.now()
           });
         }
         
         setSubmitting(false);
       }}
       loading={submitting || checkoutLoading}
       entryFee={round.entry_fee || undefined}
       roundName={round.round_name || `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`}
     />
    </div>
  );
};
