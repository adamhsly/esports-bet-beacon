import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';
import { Helmet } from 'react-helmet-async';
import SearchableNavbar from '@/components/SearchableNavbar';
import Footer from '@/components/Footer';
import SEOContentBlock from '@/components/SEOContentBlock';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import { RoundSelector } from '@/components/fantasy/RoundSelector';
import { InProgressRounds } from '@/components/fantasy/InProgressRounds';
import { FinishedRounds } from '@/components/fantasy/FinishedRounds';
import { TeamPicker } from '@/components/fantasy/TeamPickerUpdated';
import { MyPrivateRounds } from '@/components/fantasy/MyPrivateRounds';
import { Calendar, Clock, Trophy, Users } from 'lucide-react';
import { useRPCActions } from '@/hooks/useRPCActions';
import { ProgressHudSticky } from '@/components/fantasy/ProgressHudSticky';
import { ProgressHudSidebar } from '@/components/fantasy/ProgressHudSidebar';
import { useMobile } from '@/hooks/useMobile';
import { FantasyRulesModal } from '@/components/fantasy/FantasyRulesModal';
import { BookOpen } from 'lucide-react';
import { useProfilePanel } from '@/components/ProfileSheet';
import { ProfileSheet } from '@/components/ProfileSheet';
import WelcomeOfferModal from '@/components/WelcomeOfferModal';
import { supabase } from '@/integrations/supabase/client';
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { FantasyWalkthrough } from '@/components/fantasy/FantasyWalkthrough';
import { toast } from 'sonner';
import { EnhancedAvatar } from '@/components/ui/enhanced-avatar';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';

// Mini leaderboard preview for banner
const LeaderboardBannerPreview: React.FC = () => {
  const [top3, setTop3] = useState<Array<{
    user_id: string;
    username: string;
    avatar_url: string | null;
    avatar_frame_id: string | null;
    avatar_border_id: string | null;
    total_points: number;
    rank: number;
  }>>([]);
  const { free, premium } = useRewardsTrack();

  useEffect(() => {
    const fetchTop3 = async () => {
      try {
        const { data, error } = await supabase.rpc('get_global_leaderboard', {
          p_timeframe: 'weekly',
          p_limit: 3
        });
        if (!error && data) {
          setTop3(data.map((row: any) => ({
            user_id: row.user_id,
            username: row.username || 'Anonymous',
            avatar_url: row.avatar_url,
            avatar_frame_id: row.avatar_frame_id,
            avatar_border_id: row.avatar_border_id,
            total_points: Number(row.total_points),
            rank: Number(row.rank)
          })));
        }
      } catch (err) {
        console.error('Error fetching leaderboard preview:', err);
      }
    };
    fetchTop3();
  }, []);

  const getRankDisplay = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank.toString();
    }
  };

  const getRowHighlight = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-500/40 to-amber-500/40';
      case 2: return 'bg-gradient-to-r from-gray-400/40 to-gray-500/40';
      case 3: return 'bg-gradient-to-r from-orange-400/40 to-orange-500/40';
      default: return '';
    }
  };

  const getFrameAsset = (frameId: string | null) => {
    if (!frameId) return null;
    const frameReward = [...free, ...premium].find(
      item => item.id === frameId && item.type === 'frame'
    );
    return frameReward?.assetUrl || null;
  };

  const getBorderAsset = (borderId: string | null) => {
    if (!borderId) return null;
    const borderReward = [...free, ...premium].find(
      item => item.id === borderId && 
      item.value && 
      (item.value.toLowerCase().includes('border') || item.value.toLowerCase().includes('pulse'))
    );
    return borderReward?.assetUrl || null;
  };

  if (top3.length === 0) {
    return (
      <div className="flex-shrink-0 flex flex-col gap-1.5 md:ml-6 bg-black/20 rounded-lg p-2 md:p-3 min-w-[140px] md:min-w-[180px]">
        <div className="text-xs text-gray-400 text-center">Weekly Leaders</div>
        <div className="animate-pulse space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 py-1 px-2">
              <div className="w-4 h-4 bg-muted rounded" />
              <div className="w-4 h-4 bg-muted rounded-full" />
              <div className="w-12 md:w-16 h-3 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex flex-col gap-0.5 md:ml-6 bg-black/20 rounded-lg p-2 md:p-2.5 min-w-[140px] md:min-w-[180px]">
      <div className="text-[10px] md:text-xs text-gray-400 text-center mb-0.5">Weekly Leaders</div>
      {top3.map((entry) => (
        <div
          key={entry.user_id}
          className={`flex items-center gap-1.5 md:gap-2 py-1 px-1.5 md:px-2 rounded transition-colors ${getRowHighlight(entry.rank)}`}
        >
          <div className="w-4 md:w-5 flex items-center justify-center">
            <span className="text-[10px] md:text-xs font-medium text-white">
              {getRankDisplay(entry.rank)}
            </span>
          </div>
          <EnhancedAvatar
            src={entry.avatar_url}
            fallback={entry.username.slice(0, 2).toUpperCase()}
            frameUrl={getFrameAsset(entry.avatar_frame_id)}
            borderUrl={getBorderAsset(entry.avatar_border_id)}
            size="sm"
            className="h-4 w-4"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] md:text-xs font-medium truncate text-white max-w-[60px] md:max-w-[80px]">
              {entry.username}
            </p>
          </div>
          <span className="text-[10px] md:text-xs font-bold text-white">
            {entry.total_points.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};


const FantasyPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('join');
  const [selectedRound, setSelectedRound] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [loadingRoundFromUrl, setLoadingRoundFromUrl] = useState(!!searchParams.get('roundId'));
  const { awardXP, progressMission } = useRPCActions();
  const isMobile = useMobile();
  const { isOpen, openProfile, closeProfile } = useProfilePanel();
  const { user, loading: authLoading } = useAuth();
  const {
    status: welcomeOfferStatus,
    displayState,
    loading: welcomeOfferLoading,
    justUnlockedTier2,
    markTier2UnlockSeen,
    shouldShowTier2OnLogin,
    markTier2LoginShown,
  } = useWelcomeOffer();
  const navigate = useNavigate();

  const [showWelcomeOfferModal, setShowWelcomeOfferModal] = useState(false);
  const [walkthroughCompletedTick, setWalkthroughCompletedTick] = useState(0);
  const welcomeOfferAutoPopupArmedRef = useRef(false);
  const tier2PopupShownRef = useRef(false);
  const roundSelectorRefetchRef = useRef<(() => void) | null>(null);

  const handleFantasyWalkthroughComplete = () => {
    setWalkthroughCompletedTick((v) => v + 1);
  };

  // Reset tier-specific popup guard when user signs out (so a new login can trigger the 2nd popup)
  useEffect(() => {
    if (!user) {
      tier2PopupShownRef.current = false;
    }
  }, [user]);

  // Tier 2: show immediately when unlocked (or first time we detect tier 2 without a prior popup)
  useEffect(() => {
    if (!user || authLoading || welcomeOfferLoading || tier2PopupShownRef.current) return;
    if (!justUnlockedTier2) return;

    tier2PopupShownRef.current = true;

    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      markTier2UnlockSeen();
      setShowWelcomeOfferModal(true);
    }, 650);

    return () => {
      window.clearTimeout(timer);
      if (!fired) tier2PopupShownRef.current = false;
    };
  }, [user?.id, authLoading, welcomeOfferLoading, justUnlockedTier2, markTier2UnlockSeen]);

  // Tier 2: show again on the next login only
  useEffect(() => {
    if (!user || authLoading || welcomeOfferLoading || tier2PopupShownRef.current) return;
    if (!shouldShowTier2OnLogin) return;

    tier2PopupShownRef.current = true;

    let fired = false;
    const timer = window.setTimeout(() => {
      fired = true;
      markTier2LoginShown();
      setShowWelcomeOfferModal(true);
    }, 650);

    return () => {
      window.clearTimeout(timer);
      if (!fired) tier2PopupShownRef.current = false;
    };
  }, [user?.id, authLoading, welcomeOfferLoading, shouldShowTier2OnLogin, markTier2LoginShown]);

  // Auto-show welcome offer modal on first and second login.
  // Waits for the FantasyWalkthrough to be completed first.
  useEffect(() => {
    if (!user || authLoading || welcomeOfferLoading) return;

    // Tier 2 has its own popup rules (handled above)
    if (welcomeOfferStatus?.tier === 2) return;

    // Eligible states: new-user progress OR active promo balance
    if (displayState !== 'progress' && displayState !== 'active') return;

    // Must complete the walkthrough first
    const walkthroughCompleted = localStorage.getItem('fantasy_walkthrough_completed') === 'true';
    if (!walkthroughCompleted) return;

    const loginCountKey = `welcomeOfferLoginCount_${user.id}`;
    const sessionShownKey = `welcomeOfferShownSession_${user.id}`;

    // Only once per browser session
    if (sessionStorage.getItem(sessionShownKey) === 'true') return;

    // Only for first 2 sessions
    const loginCount = parseInt(localStorage.getItem(loginCountKey) || '0', 10);
    if (loginCount >= 2) return;

    if (welcomeOfferAutoPopupArmedRef.current) return;
    welcomeOfferAutoPopupArmedRef.current = true;

    const timer = setTimeout(() => {
      sessionStorage.setItem(sessionShownKey, 'true');
      localStorage.setItem(loginCountKey, String(loginCount + 1));
      setShowWelcomeOfferModal(true);
    }, 650);

    return () => {
      clearTimeout(timer);
      welcomeOfferAutoPopupArmedRef.current = false;
    };
  }, [user?.id, authLoading, welcomeOfferLoading, displayState, welcomeOfferStatus?.tier, walkthroughCompletedTick]);
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect new visitors to welcome page immediately (don't wait for auth)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    if (!hasSeenWelcome) {
      // Preserve URL parameters when redirecting
      const currentSearch = window.location.search;
      navigate('/welcome' + currentSearch);
    }
  }, [navigate]);

  // Clear selectedRound when user navigates to / or /fantasy without roundId (e.g. clicking navbar)
  useEffect(() => {
    const roundId = searchParams.get('roundId');
    if (!roundId && selectedRound) {
      setSelectedRound(null);
    }
  }, [location.key]);


  // Allow deep-linking to a tab via URL (e.g. /fantasy?tab=join)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (!tab) return;

    if (tab === 'join' || tab === 'in-progress' || tab === 'finished' || tab === 'my-private') {
      setActiveTab(tab);
    }

    // Clear after applying
    searchParams.delete('tab');
    setSearchParams(searchParams);
  }, [searchParams, setSearchParams]);

  const banners = [
    {
      src: '/lovable-uploads/Spend_5_Get_10_v5.png',
      alt: 'Free Paid Entry - Fantasy League Esports - Prizes every round',
      link: null
    },
    {
      src: '/lovable-uploads/build_roster_banner.png',
      alt: 'Draft your ultimate roster - Pick teams and win prizes',
      link: null
    },
    {
      src: '/images/swap-star-banner.png',
      alt: 'Use your in-round team swap and star team change wisely',
      link: null
    },
    {
      src: null,
      alt: 'Global Leaderboard - See how you rank',
      link: '/leaderboard',
      isLeaderboardBanner: true
    }
  ];

  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  // Handle roundId from URL parameters
  useEffect(() => {
    const roundId = searchParams.get('roundId');
    if (roundId && !selectedRound) {
      setLoadingRoundFromUrl(true);
      // Fetch the round details and select it
      const fetchRound = async () => {
        try {
          const { data, error } = await supabase
            .from('fantasy_rounds')
            .select('*')
            .eq('id', roundId)
            .single();
          
          if (data && !error) {
            setSelectedRound(data);
            // Clear the URL parameter after selecting
            searchParams.delete('roundId');
            setSearchParams(searchParams);
          }
        } catch (err) {
          console.error('Error fetching round:', err);
        } finally {
          setLoadingRoundFromUrl(false);
        }
      };
      fetchRound();
    }
  }, [searchParams, selectedRound, setSearchParams]);

  // Handle payment success - apply pending team picks after promo/payment checkout
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const roundId = searchParams.get('round_id');
    
    if (paymentStatus === 'success' && roundId && user) {
      const applyPendingPicks = async () => {
        try {
          // Ensure promo balance UI updates immediately after promo-covered entry
          await queryClient.invalidateQueries({ queryKey: ['welcomeOffer'] });

          // Check for pending submission in sessionStorage
          const pendingKey = `fantasy:pending_lineup_submit:${roundId}`;
          const raw = sessionStorage.getItem(pendingKey);
          
          if (!raw) {
            // No pending picks - just show success and load round for team selection
            setLoadingRoundFromUrl(true);
            const { data: roundData } = await supabase
              .from('fantasy_rounds')
              .select('*')
              .eq('id', roundId)
              .single();
            
            if (roundData) {
              setSelectedRound(roundData);
            }
            toast.success('Entry successful! Now pick your teams.');
            setLoadingRoundFromUrl(false);
            // Clear URL params
            searchParams.delete('payment');
            searchParams.delete('round_id');
            setSearchParams(searchParams, { replace: true });
            return;
          }

          const pending = JSON.parse(raw);
          
          // Validate pending data
          if (!pending.selectedTeams || pending.selectedTeams.length === 0) {
            sessionStorage.removeItem(pendingKey);
            searchParams.delete('payment');
            searchParams.delete('round_id');
            setSearchParams(searchParams, { replace: true });
            return;
          }

          // Find the user's pick entry for this round (created by checkout)
          const { data: pickEntry } = await supabase
            .from('fantasy_round_picks')
            .select('id, team_picks')
            .eq('round_id', roundId)
            .eq('user_id', user.id)
            .single();

          if (pickEntry) {
            // Update the pick with pending teams
            const teamPicksData = pending.selectedTeams.map((team: any) => ({
              id: team.id,
              name: team.name,
              type: team.type,
              logo_url: team.logo_url
            }));

            const benchTeamData = pending.benchTeam ? {
              id: pending.benchTeam.id,
              name: pending.benchTeam.name,
              type: pending.benchTeam.type
            } : null;

            await supabase
              .from('fantasy_round_picks')
              .update({
                team_picks: teamPicksData,
                bench_team: benchTeamData,
                submitted_at: new Date().toISOString()
              })
              .eq('id', pickEntry.id);

            // Set star team if one was selected
            if (pending.starTeamId) {
              await supabase.functions.invoke('set-star-team', {
                body: { round_id: roundId, team_id: pending.starTeamId }
              });
            }

            toast.success('Teams submitted successfully!');
            
            // Clear pending and params
            sessionStorage.removeItem(pendingKey);
            searchParams.delete('payment');
            searchParams.delete('round_id');
            setSearchParams(searchParams, { replace: true });
            
            // Navigate to in-progress tab and exit team picker view
            setSelectedRound(null);
            setActiveTab('in-progress');
          }
        } catch (err) {
          console.error('Error applying pending picks:', err);
          toast.error('Entry successful but failed to apply team picks. Please select your teams.');
          searchParams.delete('payment');
          searchParams.delete('round_id');
          setSearchParams(searchParams, { replace: true });
        }
      };

      applyPendingPicks();
    }
  }, [searchParams, user, setSearchParams]);

  const fantasySEOContent = {
    title: "Free Fantasy Esports Leagues – Daily, Weekly & Monthly Rounds",
    paragraphs: [
      "Join the ultimate fantasy esports experience on Frags & Fortunes. Our free-to-play fantasy leagues let you build your dream roster from professional CS2, Valorant, Dota 2, and League of Legends teams. Compete in daily quick-fire rounds for instant action, weekly contests for sustained competition, or monthly marathon rounds to prove your esports expertise.",
      "Our fantasy pick'ems feature both professional teams from major tournaments and amateur talent from FACEIT competitive leagues. With dynamic team pricing based on recent performance, every pick matters. Use your budget wisely to assemble the strongest roster and outperform your competition on global leaderboards.",
      "Strategic features like the Star Team mechanic (2x points multiplier) and mid-round team swaps add depth to your fantasy experience. Designate your most confident pick as your Star Team to maximize points, or use your one-time swap to pivot your strategy based on match results.",
      "Free rounds award credits and exclusive cosmetic rewards including badges, avatar frames, and titles. Paid entry rounds offer Steam voucher prizes – compete for $100, $50, and more. Create private rounds with custom join codes to challenge friends, streaming communities, or esports fan groups.",
      "Track your progress across all active rounds, view detailed scoring breakdowns by team and match, and climb the seasonal leaderboards. Whether you're a fantasy esports veteran or new to pick'ems, Frags & Fortunes offers the perfect competitive experience for every skill level.",
    ],
  };

  // Show loading screen when coming from welcome page with roundId
  if (loadingRoundFromUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-theme-gray-dark">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-lg text-muted-foreground">Loading your round...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark theme-alt-card">
      <Helmet>
        <title>Fantasy Esports Pick'ems | Free Daily, Weekly & Monthly Rounds - Frags & Fortunes</title>
        <meta name="description" content="Play free fantasy esports pick'ems. Build rosters from CS2, Valorant, Dota 2, and LoL teams. Compete in daily, weekly, and monthly rounds. Win Steam vouchers and exclusive rewards." />
        <meta name="keywords" content="fantasy esports, esports pick'ems, fantasy CS2, fantasy Valorant, fantasy Dota 2, fantasy LoL, free fantasy esports, esports fantasy league, win Steam vouchers" />
        <link rel="canonical" href="https://fragsandfortunes.com/fantasy" />
      </Helmet>
      <SearchableNavbar />

      <div className="flex-grow w-full">
        <div className="mx-2 md:mx-4 my-8">
          {!selectedRound && (
            <div className="mb-8 max-w-4xl mx-auto">
              <Carousel
                plugins={[plugin.current] as any}
                className="w-full md:w-3/4 mx-auto"
              >
                <CarouselContent>
                  {banners.map((banner, index) => (
                    <CarouselItem key={index}>
                      {banner.isLeaderboardBanner ? (
                        <div 
                          onClick={() => navigate('/leaderboard')}
                          className="w-full aspect-[3/1] rounded-xl bg-gradient-to-r from-purple-900/80 via-indigo-900/80 to-blue-900/80 border border-purple-500/30 px-3 md:px-6 py-3 md:py-4 cursor-pointer hover:border-purple-400/50 transition-all group flex items-center overflow-hidden"
                        >
                          <div className="flex items-center justify-between w-full gap-2 md:gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base md:text-2xl font-bold text-white mb-1 md:mb-2 flex items-center gap-1.5 md:gap-2">
                                <Trophy className="w-4 h-4 md:w-6 md:h-6 text-yellow-400 flex-shrink-0" />
                                <span className="truncate">Global Leaderboard</span>
                              </h3>
                              <p className="text-gray-300 text-xs md:text-sm mb-1.5 md:mb-3 hidden sm:block">See how you rank against all players</p>
                              <div className="flex flex-wrap gap-1 md:gap-2 text-[10px] md:text-xs text-muted-foreground mb-2 md:mb-4">
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-white/10 rounded">🏆 Top 1% = 100pts</span>
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-white/10 rounded">🥇 Top 5% = 70pts</span>
                                <span className="px-1.5 md:px-2 py-0.5 md:py-1 bg-white/10 rounded hidden sm:inline-flex">🥈 Top 10% = 50pts</span>
                              </div>
                              <Button size="sm" className="bg-purple-600 hover:bg-purple-500 group-hover:shadow-[0_0_12px_rgba(168,85,247,0.4)] transition-all text-xs md:text-sm h-7 md:h-9 px-2 md:px-4">
                                View Leaderboard
                              </Button>
                            </div>
                            <LeaderboardBannerPreview />
                          </div>
                        </div>
                      ) : (
                        <img 
                          src={banner.src!}
                          alt={banner.alt}
                          className={`w-full rounded-xl ${banner.link ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                          onClick={() => banner.link && navigate(banner.link)}
                        />
                      )}
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
              <button
                onClick={() => setRulesModalOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#8B5CF6] hover:text-[#7C3AED] transition-colors mt-4"
              >
                <BookOpen className="h-4 w-4" />
                View Rules & Scoring
              </button>
            </div>
          )}

          <div className="max-w-2xl mx-auto">
            {!selectedRound && (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="w-full overflow-x-auto scrollbar-hide">
                  <TabsList className="inline-flex bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1.5 gap-1.5 min-w-full md:w-auto md:mx-auto">
                    <TabsTrigger
                      value="join"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Join a Round
                    </TabsTrigger>
                    <TabsTrigger
                      value="in-progress"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Clock className="h-4 w-4" />
                      My Picks
                    </TabsTrigger>
                    <TabsTrigger
                      value="finished"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Trophy className="h-4 w-4" />
                      Finished
                    </TabsTrigger>
                    <TabsTrigger
                      value="my-private"
                      className="flex-1 min-w-[120px] whitespace-nowrap text-center py-2.5 px-4 rounded-lg font-medium text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-2"
                    >
                      <Users className="h-4 w-4" />
                      My Private Rounds
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="join">
                  {loading ? (
                    <p className="text-muted-foreground text-center mt-4">Loading rounds...</p>
                  ) : (
                    <RoundSelector 
                      onNavigateToInProgress={() => setActiveTab('in-progress')} 
                      onJoinRound={setSelectedRound}
                      onRefetchRef={roundSelectorRefetchRef}
                    />
                  )}
                </TabsContent>

                <TabsContent value="in-progress">
                  <ProtectedRoute>
                    <InProgressRounds />
                  </ProtectedRoute>
                </TabsContent>

                <TabsContent value="finished">
                  <ProtectedRoute>
                    <FinishedRounds />
                  </ProtectedRoute>
                </TabsContent>

                <TabsContent value="my-private">
                  <ProtectedRoute>
                    <MyPrivateRounds onSelectRound={setSelectedRound} />
                  </ProtectedRoute>
                </TabsContent>
              </Tabs>
            )}

            {selectedRound && (
              <TeamPicker 
                round={selectedRound} 
                onBack={() => setSelectedRound(null)}
                onNavigateToInProgress={() => setActiveTab('in-progress')}
              />
            )}
          </div>
        </div>
      </div>

      {/* SEO Content Block */}
      <SEOContentBlock title={fantasySEOContent.title} paragraphs={fantasySEOContent.paragraphs} />

      <Footer />
      
      {/* Progress HUD - Responsive */}
      {isMobile ? (
        <ProgressHudSticky />
      ) : (
        <div className="fixed bottom-4 right-4 z-50">
          <ProgressHudSidebar onClick={openProfile} />
        </div>
      )}

      {/* Fantasy Rules Modal */}
      <FantasyRulesModal open={rulesModalOpen} onOpenChange={setRulesModalOpen} />

      {/* Welcome Offer Modal (auto-shown after walkthrough on first 2 logins) */}
      <WelcomeOfferModal 
        open={showWelcomeOfferModal} 
        onOpenChange={setShowWelcomeOfferModal}
        onRoundOpened={() => roundSelectorRefetchRef.current?.()}
      />
      
      {/* Profile Sheet */}
      <ProfileSheet isOpen={isOpen} onOpenChange={closeProfile} />
      
      {/* First-time visitor walkthrough */}
      {!selectedRound && activeTab === 'join' && (
        <FantasyWalkthrough onComplete={handleFantasyWalkthroughComplete} />
      )}
    </div>
  );
};

export default FantasyPage;
