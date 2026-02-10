// src/pages/Index.tsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Trophy } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/contexts/AuthContext";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";

import SearchableNavbar from "@/components/SearchableNavbar";
import SEOContentBlock from "@/components/SEOContentBlock";
import Footer from "@/components/Footer";
import { MatchCard, MatchInfo } from "@/components/MatchCard";
import { FilterPills } from "@/components/FilterPills";
import { EsportsLogoFilter } from "@/components/EsportsLogoFilter";
import { DateMatchPicker } from "@/components/DateMatchPicker";
import LiveDataTestPanel from "@/components/LiveDataTestPanel";
import WelcomeOfferModal from "@/components/WelcomeOfferModal";

import { formatMatchDate } from "@/utils/dateMatchUtils";
import { MatchCountBreakdown } from "@/utils/matchCountUtils";
import { startOfDay, isToday } from "date-fns";

// helpers that call Supabase RPCs
import { getMatchesForDate, getDayCountsFiltered } from "@/lib/supabaseMatchFunctions";

/* -------------------------------------------
   Helpers (status mapping + ID normalization)
-------------------------------------------- */
const normalizeMatchId = (id: string) => id.replace(/^(amateur|professional)_/i, "");

const getFaceitStatusCategory = (status: string): "live" | "upcoming" | "finished" | null => {
  const s = (status || "").toLowerCase();
  if (["finished", "completed", "cancelled", "aborted"].includes(s)) return "finished";
  if (["ongoing", "running", "live"].includes(s)) return "live";
  if (["upcoming", "ready", "scheduled", "configured"].includes(s)) return "upcoming";
  return null;
};

const getPandaScoreStatusCategory = (status: string): "live" | "upcoming" | "finished" | null => {
  const s = (status || "").toLowerCase();
  if (["finished", "completed", "cancelled", "canceled", "postponed", "forfeit"].includes(s)) return "finished";
  if (["live", "running", "ongoing"].includes(s)) return "live";
  if (["scheduled", "upcoming", "ready", "not_started"].includes(s)) return "upcoming";
  return null;
};

/* -------------------------------------------
   Game type → server query mapping
   (use substrings that safely match DB values)
-------------------------------------------- */
const mapGameTypeToQuery = (v: string): string => {
  const key = (v || "all").toLowerCase();
  // Counter-Strike: special value to trigger OR query in backend
  if (key === "counter-strike") return "cs-all-variants";
  
  const map: Record<string, string> = {
    all: "all",
    lol: "lol", // matches "LoL"
    valorant: "valorant",
    dota2: "dota", // matches "Dota 2"
    "ea-sports-fc": "ea sports fc",
    "rainbow-6-siege": "siege",
    "rocket-league": "rocket league",
    "starcraft-2": "starcraft",
    overwatch: "overwatch",
    "king-of-glory": "king of glory",
    "call-of-duty": "call of duty",
    "lol-wild-rift": "wild rift",
    pubg: "pubg",
    "mobile-legends": "mobile legends",
  };
  return map[key] ?? key;
};

/* -------------------------------------------
   Tournament helpers (same as your old UI)
-------------------------------------------- */
const formatPrizePool = (prizePool: number | string) => {
  console.log("💰 formatPrizePool input:", prizePool, typeof prizePool);

  if (!prizePool) {
    console.log("❌ No prize pool provided");
    return null;
  }

  // Handle different string formats like "100000 Brazilian Real"
  let amount: number;
  if (typeof prizePool === "string") {
    // Extract numeric part from strings like "100000 Brazilian Real"
    const match = prizePool.match(/[\d,]+/);
    if (match) {
      amount = parseInt(match[0].replace(/,/g, ""));
    } else {
      amount = parseInt(prizePool);
    }
  } else {
    amount = prizePool;
  }

  console.log("💰 Parsed amount:", amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    console.log("❌ Invalid amount after parsing");
    return null;
  }

  let result: string;
  if (amount >= 1_000_000) result = `$${(amount / 1_000_000).toFixed(1)}M`;
  else if (amount >= 1_000) result = `$${(amount / 1_000).toFixed(0)}K`;
  else result = `$${amount}`;

  console.log("✅ Formatted result:", result);
  return result;
};

const getPrizeValueFromMetadata = (metadata: any): number | null => {
  if (!metadata || metadata.prizePool == null) return null;
  const raw = metadata.prizePool;
  const value = typeof raw === "string" ? parseInt(raw) : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const getTierValueFromMetadata = (metadata: any): number => {
  if (!metadata || !metadata.tier) return 999;
  const tier = String(metadata.tier).toLowerCase();
  if (tier === "s") return -1;
  if (tier === "a") return 0;
  if (tier === "b") return 1;
  if (tier === "c") return 2;
  if (tier === "d") return 3;
  return 999;
};

const renderTournamentMetadata = (metadata: any) => {
  console.log("🎨 renderTournamentMetadata called with:", metadata);

  if (!metadata) {
    console.log("❌ No metadata provided, returning null");
    return null;
  }

  const items: React.ReactNode[] = [];

  if (metadata.prizePool) {
    console.log("💰 Processing prize pool:", metadata.prizePool);
    const formatted = formatPrizePool(metadata.prizePool);
    console.log("💰 Formatted prize pool:", formatted);
    if (formatted) {
      items.push(
        <span key="prize" className="flex items-center gap-1 text-xs text-green-400 font-medium">
          <Trophy size={12} />
          {formatted}
        </span>,
      );
    }
  }
  if (metadata.tier && metadata.tier !== "unranked") {
    console.log("🏆 Adding tier:", metadata.tier);
    items.push(
      <span key="tier" className="text-xs text-blue-400 font-medium uppercase">
        Tier: {metadata.tier}
      </span>,
    );
  }
  if (metadata.region) {
    items.push(
      <span key="region" className="text-xs text-orange-400 font-medium uppercase">
        {metadata.region}
      </span>,
    );
  }
  if (metadata.competitionType && metadata.competitionType !== "Matchmaking") {
    items.push(
      <span key="compType" className="text-xs text-yellow-400 font-medium">
        {metadata.competitionType}
      </span>,
    );
  }

  console.log("🎨 Final items to render:", items.length, items);
  return items.length > 0 ? <div className="flex items-center justify-center gap-2 ml-2 mt-1">{items}</div> : null;
};

/* -------------------------------------------
   League grouping (same as your old UI)
-------------------------------------------- */
const generateTournamentId = (match: MatchInfo) => {
  if (match.source === "professional" && match.rawData) {
    const raw: any = match.rawData;
    if (raw.tournament?.id) return `pandascore_${raw.tournament.id}`;
    if (raw.league?.id) return `pandascore_${raw.league.id}`;
  }
  if (match.source === "amateur") {
    const competitionName = match.tournament;
    if (competitionName && competitionName !== "Matchmaking") {
      return `faceit_${competitionName.replace(/\s+/g, "_").toLowerCase()}`;
    }
  }
  const valid = [
    "pandascore_16836",
    "pandascore_16673",
    "pandascore_16652",
    "pandascore_16651",
    "pandascore_16650",
    "pandascore_16649",
    "faceit_faceit_championship_series",
    "faceit_premier_league",
  ];
  return valid[Math.floor(Math.random() * valid.length)];
};

function groupMatchesByLeague(matches: MatchInfo[]) {
  return matches.reduce((acc: Record<string, { matches: MatchInfo[]; tournamentId?: string }>, match) => {
    let league: string;
    if (match.source === "professional" && match.league_name && match.tournament_name) {
      league = `${match.league_name} - ${match.tournament_name}`;
    } else {
      league = match.tournament_name || match.tournament || match.league_name || "Unknown League";
    }
    if (!acc[league]) acc[league] = { matches: [], tournamentId: generateTournamentId(match) };
    acc[league].matches.push(match);
    return acc;
  }, {});
}

/* -------------------------------------------
   Component
-------------------------------------------- */
const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { 
    displayState, 
    loading: welcomeOfferLoading, 
    justUnlockedTier2, 
    markTier2UnlockSeen,
    shouldShowTier2OnLogin,
    markTier2LoginShown,
    status: welcomeOfferStatus
  } = useWelcomeOffer();
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [selectedGameType, setSelectedGameType] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>("all");
  const [selectedRegionFilter, setSelectedRegionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Welcome offer modal auto-show state
  const [showWelcomeOfferModal, setShowWelcomeOfferModal] = useState(false);
  const welcomeOfferShownRef = useRef(false);
  const tier2PopupShownRef = useRef(false);

  // Auto-show tier 2 popup when user just unlocked it
  useEffect(() => {
    if (!user || loading || welcomeOfferLoading || tier2PopupShownRef.current) return;
    
    if (justUnlockedTier2) {
      tier2PopupShownRef.current = true;
      markTier2UnlockSeen();
      // Small delay to ensure page is ready
      const timer = setTimeout(() => {
        setShowWelcomeOfferModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, welcomeOfferLoading, justUnlockedTier2, markTier2UnlockSeen]);

  // Auto-show tier 2 popup on next login (2nd time)
  useEffect(() => {
    if (!user || loading || welcomeOfferLoading || tier2PopupShownRef.current) return;
    
    if (shouldShowTier2OnLogin) {
      tier2PopupShownRef.current = true;
      markTier2LoginShown();
      const timer = setTimeout(() => {
        setShowWelcomeOfferModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, loading, welcomeOfferLoading, shouldShowTier2OnLogin, markTier2LoginShown]);

  // Auto-show tier 1 welcome offer modal on first and second login (session-based tracking)
  // Waits for fantasy walkthrough to complete first
  useEffect(() => {
    if (!user || loading || welcomeOfferLoading || welcomeOfferShownRef.current) return;
    
    // Skip if this is tier 2 (handled separately above)
    if (welcomeOfferStatus?.tier === 2) return;
    
    // Check if offer is still active (progress or active state)
    if (displayState !== 'progress' && displayState !== 'active') return;
    
    // Track login count (persists across sessions) and shown-this-session flag
    const loginCountKey = `welcomeOfferLoginCount_${user.id}`;
    const sessionShownKey = `welcomeOfferShownSession_${user.id}`;
    
    // Check if already shown this session (browser session)
    const shownThisSession = sessionStorage.getItem(sessionShownKey) === 'true';
    if (shownThisSession) return;
    
    // Get login count from localStorage
    const loginCount = parseInt(localStorage.getItem(loginCountKey) || '0', 10);
    
    // Only show if this is the 1st or 2nd login (loginCount < 2)
    if (loginCount >= 2) return;
    
    // Function to show the modal
    const showModal = () => {
      welcomeOfferShownRef.current = true;
      sessionStorage.setItem(sessionShownKey, 'true');
      setShowWelcomeOfferModal(true);
      localStorage.setItem(loginCountKey, String(loginCount + 1));
    };
    
    // Check if fantasy walkthrough is completed
    const walkthroughCompleted = localStorage.getItem('fantasy_walkthrough_completed') === 'true';
    
    if (walkthroughCompleted) {
      // Walkthrough already done, show modal after brief delay
      const timer = setTimeout(showModal, 1000);
      return () => clearTimeout(timer);
    } else {
      // Poll for walkthrough completion (user may be going through it now)
      const pollInterval = setInterval(() => {
        const completed = localStorage.getItem('fantasy_walkthrough_completed') === 'true';
        if (completed) {
          clearInterval(pollInterval);
          // Show modal shortly after walkthrough completes
          setTimeout(showModal, 500);
        }
      }, 500);
      
      // Also set a max timeout - if no walkthrough after 60s, show anyway
      const maxTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        if (!welcomeOfferShownRef.current) {
          showModal();
        }
      }, 60000);
      
      return () => {
        clearInterval(pollInterval);
        clearTimeout(maxTimeout);
      };
    }
  }, [user, loading, welcomeOfferLoading, displayState, welcomeOfferStatus?.tier]);

  const fantasyBanners = [
    {
      src: '/lovable-uploads/play_now_hero_banner.png',
      alt: 'Play Now - Pick your teams, score points, win prizes'
    },
    {
      src: '/lovable-uploads/build_roster_banner.png',
      alt: 'Draft your ultimate roster - Pick teams and win prizes'
    },
    {
      src: '/images/swap-star-banner.png',
      alt: 'Use your in-round team swap and star team change wisely'
    },
    {
      src: '/lovable-uploads/Spend_5_Get_10_v5.png',
      alt: 'Free Paid Entry - Fantasy League Esports - Prizes every round'
    }
  ];

  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  // Redirect new visitors to welcome page immediately (don't wait for auth)
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome') === 'true';
    if (!hasSeenWelcome) {
      const currentSearch = window.location.search;
      navigate('/welcome' + currentSearch);
    }
  }, [navigate]);

  const [dateFilteredLiveMatches, setDateFilteredLiveMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredUpcomingMatches, setDateFilteredUpcomingMatches] = useState<MatchInfo[]>([]);
  const [dateFilteredFinishedMatches, setDateFilteredFinishedMatches] = useState<MatchInfo[]>([]);

  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [detailedMatchCounts, setDetailedMatchCounts] = useState<Record<string, MatchCountBreakdown>>({});

  const [loadingDateFiltered, setLoadingDateFiltered] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  const isSelectedDateToday = isToday(selectedDate);

  /* --------------------- Game type filter (unchanged client logic) --------------------- */
  const filterMatchesByGameType = (matches: MatchInfo[], gameType: string) => {
    if (gameType === "all") return matches;
    return matches.filter((match) => {
      const esportType = match.esportType?.toLowerCase?.() ?? "";
      const original = match.esportType ?? "";
      const map: Record<string, () => boolean> = {
        "counter-strike": () =>
          ["csgo", "cs2", "cs", "counter-strike", "counterstrike"].includes(esportType) ||
          esportType.includes("counter") ||
          original === "Counter-Strike",
        lol: () =>
          ["lol", "leagueoflegends", "league-of-legends", "league of legends"].includes(esportType) ||
          esportType.includes("league") ||
          original === "LoL",
        valorant: () => ["valorant", "val"].includes(esportType) || original === "Valorant",
        dota2: () =>
          ["dota2", "dota", "dota-2", "dota 2"].includes(esportType) ||
          esportType.includes("dota") ||
          original === "Dota 2",
        "ea-sports-fc": () =>
          ["ea sports fc", "easportsfc", "fifa", "football", "soccer"].includes(esportType) ||
          original === "EA Sports FC",
        "rainbow-6-siege": () =>
          ["rainbow 6 siege", "rainbow6siege", "r6", "siege"].includes(esportType) || original === "Rainbow 6 Siege",
        "rocket-league": () =>
          ["rocket league", "rocketleague", "rl"].includes(esportType) || original === "Rocket League",
        "starcraft-2": () => ["starcraft 2", "starcraft2", "sc2"].includes(esportType) || original === "StarCraft 2",
        overwatch: () => ["overwatch", "ow"].includes(esportType) || original === "Overwatch",
        "king-of-glory": () =>
          ["king of glory", "kingofglory", "kog"].includes(esportType) || original === "King of Glory",
        "call-of-duty": () => ["call of duty", "callofduty", "cod"].includes(esportType) || original === "Call of Duty",
        "lol-wild-rift": () =>
          ["lol wild rift", "lolwildrift", "wild rift", "wildrift"].includes(esportType) ||
          original === "LoL Wild Rift",
        pubg: () => ["pubg", "playerunknowns battlegrounds"].includes(esportType) || original === "PUBG",
        "mobile-legends": () =>
          ["mobile legends: bang bang", "mobile legends", "mobilelegends", "ml", "mlbb"].includes(esportType) ||
          original === "Mobile Legends: Bang Bang",
      };
      const fn = map[gameType];
      if (fn) return fn();
      return esportType === gameType || original.toLowerCase() === gameType;
    });
  };

  const applyAllFilters = useCallback((matches: MatchInfo[]) => {
    // Filter out BYE teams from amateur matches
    let filtered = matches.filter((m) => {
      if (m.source === "amateur") {
        const team1Name = (m.teams[0]?.name || "").toLowerCase().trim();
        const team2Name = (m.teams[1]?.name || "").toLowerCase().trim();
        if (team1Name === "bye" || team2Name === "bye") {
          return false;
        }
      }
      return true;
    });

    // Extra safety client-side: drop cancelled/aborted
    filtered = filtered.filter((m) => {
      const s = (m.status || "").toLowerCase();
      return !s.startsWith("cancel") && !s.startsWith("abort");
    });

    filtered = filterMatchesByGameType(filtered, selectedGameType);

    if (selectedStatusFilter !== "all") {
      filtered = filtered.filter((match) => {
        const cat =
          match.source === "amateur"
            ? getFaceitStatusCategory(match.status || "")
            : getPandaScoreStatusCategory(match.status || "");
        return cat === selectedStatusFilter;
      });
    }

    if (selectedSourceFilter !== "all") {
      filtered = filtered.filter((match) => match.source === selectedSourceFilter);
    }

    if (selectedRegionFilter !== "all") {
      filtered = filtered.filter((match) => {
        const region = match.rawData?.region;
        return region === selectedRegionFilter || !region;
      });
    }

    // Search filter - fuzzy matching on teams and tournaments
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      filtered = filtered.filter((match) => {
        const team1Name = (match.teams?.[0]?.name || "").toLowerCase();
        const team2Name = (match.teams?.[1]?.name || "").toLowerCase();
        const tournamentName = (match.tournament || match.tournament_name || "").toLowerCase();
        const leagueName = (match.league_name || "").toLowerCase();
        
        return (
          team1Name.includes(query) ||
          team2Name.includes(query) ||
          tournamentName.includes(query) ||
          leagueName.includes(query)
        );
      });
    }

    return filtered;
  }, [selectedGameType, selectedStatusFilter, selectedSourceFilter, selectedRegionFilter, debouncedSearchQuery]);

  /* --------------------- 📅 Calendar counts (±30d, server-filtered) --------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCalendar(true);
      try {
        const esportQuery = mapGameTypeToQuery(selectedGameType);
        const rows = await getDayCountsFiltered({
          date: selectedDate,
          windowDays: 30,
          source: selectedSourceFilter as "all" | "amateur" | "professional",
          status: selectedStatusFilter as "all" | "live" | "upcoming" | "finished",
          esportType: esportQuery, // substring/equal match on server
        });

        // rows: [{ match_date, total_count, professional_count, amateur_count, live_count, upcoming_count }]
        const breakdown: Record<string, MatchCountBreakdown> = {};
        const totals: Record<string, number> = {};

        for (const r of rows as any[]) {
          const day = String(r.match_date);
          
          const professional = Number(r.professional_count || 0);
          const amateur = Number(r.amateur_count || 0);
          const live = Number(r.live_count || 0);
          const upcoming = Number(r.upcoming_count || 0);
          const total = professional + amateur;

          breakdown[day] = {
            total,
            professional,
            amateur,
            live,
            upcoming,
          };
          totals[day] = total;
        }

        if (!cancelled) {
          setDetailedMatchCounts(breakdown);
          setMatchCounts(totals);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Calendar counts error", err);
          setDetailedMatchCounts({});
          setMatchCounts({});
        }
      } finally {
        if (!cancelled) setLoadingCalendar(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedSourceFilter, selectedStatusFilter, selectedGameType]);

  /* --------------------- 🗓️ Load matches for selected day (local-day) --------------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDateFiltered(true);
      try {
        const sourceParam =
          selectedSourceFilter === "all" ? "all" : (selectedSourceFilter as "amateur" | "professional");
        const esportQuery = mapGameTypeToQuery(selectedGameType);

        const rawMatches = await getMatchesForDate({
          date: selectedDate,
          limit: 200,
          source: sourceParam,
          esportType: esportQuery, // keep server & calendar consistent
        });

        // normalize IDs (strip any "amateur_/professional_" prefixes)
        const normalized = rawMatches.map((m) => ({ ...m, id: normalizeMatchId(m.id) }));

        // DB already returns the correct local-day window; no extra date filtering needed here
        const filtered = applyAllFilters(normalized);

        // Split into live/upcoming/finished
        const live: MatchInfo[] = [];
        const upcoming: MatchInfo[] = [];
        const finished: MatchInfo[] = [];

        for (const match of filtered) {
          const cat =
            match.source === "amateur"
              ? getFaceitStatusCategory(match.status || "")
              : getPandaScoreStatusCategory(match.status || "");
          if (cat === "live") live.push(match);
          else if (cat === "finished") finished.push(match);
          else upcoming.push(match);
        }

        const byTime = (a: MatchInfo, b: MatchInfo) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

        if (!cancelled) {
          setDateFilteredLiveMatches(live.sort(byTime));
          setDateFilteredUpcomingMatches(upcoming.sort(byTime));
          setDateFilteredFinishedMatches(finished.sort(byTime));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Date matches error", err);
          setDateFilteredLiveMatches([]);
          setDateFilteredUpcomingMatches([]);
          setDateFilteredFinishedMatches([]);
        }
      } finally {
        if (!cancelled) setLoadingDateFiltered(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedGameType, selectedStatusFilter, selectedSourceFilter, applyAllFilters]);

  /* --------------------- Grouping & metadata (same as before) --------------------- */
  const getTournamentMetadata = (matches: MatchInfo[]) => {
    if (matches.length === 0) return null;
    const sample = matches[0];
    let meta: any = {};

    if (sample.source === "professional" && sample.rawData) {
      const raw: any = sample.rawData;
      if (raw.tournament) {
        meta.prizePool = raw.tournament.prizepool;
        meta.tier = raw.tournament.tier;
      }
      if (raw.league) {
        meta.prizePool = meta.prizePool || raw.league.prizepool;
        meta.tier = meta.tier || raw.league.tier;
      }
      if (raw.serie) {
        meta.serieInfo = { fullName: raw.serie.full_name, year: raw.serie.year, season: raw.serie.season };
      }
    }
    if (sample.source === "amateur" && (sample as any).faceitData) {
      const fd: any = (sample as any).faceitData;
      meta.region = fd.region;
      meta.competitionType = fd.competitionType;
      meta.organizedBy = fd.organizedBy;
    }
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const groupedLive = useMemo(() => groupMatchesByLeague(dateFilteredLiveMatches), [dateFilteredLiveMatches]);
  const groupedUpcoming = useMemo(
    () => groupMatchesByLeague(dateFilteredUpcomingMatches),
    [dateFilteredUpcomingMatches],
  );
  const groupedFinished = useMemo(
    () => groupMatchesByLeague(dateFilteredFinishedMatches),
    [dateFilteredFinishedMatches],
  );

  const homepageSEOContent = {
    title: "Fantasy Esports Pick'ems – Your Ultimate Competitive Gaming Destination",
    paragraphs: [
      "Welcome to Frags & Fortunes, the premier free-to-play fantasy esports platform where you can build your dream roster and compete against players worldwide. Our fantasy pick'ems system lets you select teams from professional leagues and amateur competitions, earning points based on real match results from Counter-Strike 2 (CS2), Valorant, Dota 2, and League of Legends tournaments.",
      "Choose from hundreds of professional esports teams including legendary organizations competing in major championships like IEM, BLAST Premier, VCT, The International, and Worlds. Our platform also features rising amateur talent from FACEIT leagues, giving you access to the full spectrum of competitive esports – from tier-1 professionals to up-and-coming stars.",
      "Our unique fantasy scoring system rewards strategic thinking. Earn points for match wins, draws, map victories, clean sweeps, and tournament championships. Use the Star Team feature to double your points on your most confident pick, or swap teams mid-round if your strategy needs adjustment. With budget caps and team pricing based on recent performance, every roster decision matters.",
      "Compete in daily quick-fire rounds for fast action, weekly contests for sustained competition, or monthly marathon rounds for the ultimate test of esports knowledge. Free rounds award credits and exclusive rewards, while paid entry rounds offer Steam voucher prizes for top performers. Create private leaderboards to challenge friends, colleagues, or your gaming community.",
      "Track every match in real-time with our comprehensive live scores and match tracker. Follow tournament brackets, view team statistics, and analyze head-to-head records to inform your fantasy picks. Our database covers all major esports competitions including CS2 Majors, Valorant Champions, Dota 2 Majors, and League of Legends World Championship.",
      "Join thousands of esports fans already competing on Frags & Fortunes. Create an account for free, pick your teams, and start climbing the leaderboards today. Whether you're a casual fan or a dedicated esports enthusiast, our fantasy pick'ems platform offers the perfect blend of strategy, competition, and rewards.",
    ],
  };

  /* -------------------------------------------
     Render
  -------------------------------------------- */
  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden bg-theme-gray-dark">
      <SearchableNavbar />
      <div className="flex-grow">
        <div className="w-full">
          {process.env.NODE_ENV === "development" && (
            <div className="mb-8 mx-2 md:mx-4">
              <LiveDataTestPanel />
            </div>
          )}

          <div className="mb-12">
            {/* ESPORTS LOGO FILTER BAR */}
            <div className="mx-2 md:mx-4">
              <EsportsLogoFilter selectedGameType={selectedGameType} onGameTypeChange={setSelectedGameType} />
            </div>

            {/* FILTER PILLS */}
            <div className="mx-2 md:mx-4">
              <div className="flex flex-wrap items-center gap-2 mb-6 px-4 py-1">
          <FilterPills
            gameType={selectedGameType}
            statusFilter={selectedStatusFilter}
            sourceFilter={selectedSourceFilter}
            regionFilter={selectedRegionFilter}
            onGameTypeChange={setSelectedGameType}
            onStatusFilterChange={setSelectedStatusFilter}
            onSourceFilterChange={setSelectedSourceFilter}
            onRegionFilterChange={setSelectedRegionFilter}
            hideRegionFilter={true}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
              </div>
            </div>

            {/* HORIZONTAL DAY SELECTOR */}
            {!loadingCalendar && (
              <div className="mx-2 md:mx-4">
                <DateMatchPicker
                  selectedDate={selectedDate}
                  onDateSelect={(d) => d && setSelectedDate(startOfDay(d))}
                  matchCounts={matchCounts}
                  detailedMatchCounts={detailedMatchCounts}
                />
              </div>
            )}

            {/* Fantasy Banner Carousel */}
            <div className="mx-2 md:mx-4 mb-8">
              <div className="max-w-4xl mx-auto">
                <Link to="/fantasy" className="block hover:opacity-90 transition-opacity">
                  <Carousel
                    plugins={[autoplayPlugin.current] as any}
                    className="w-full md:w-3/4 mx-auto"
                  >
                    <CarouselContent>
                      {fantasyBanners.map((banner, index) => (
                        <CarouselItem key={index}>
                          <img 
                            src={banner.src}
                            alt={banner.alt}
                            className="w-full rounded-xl"
                          />
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </Link>
              </div>
            </div>

            {/* MATCH SECTIONS */}
            {loadingDateFiltered ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-theme-purple mr-2" />
                <span className="text-primary-foreground">Loading matches for selected date...</span>
              </div>
            ) : (
              <>
                {/* Live (today only) */}
                {isSelectedDateToday && Object.keys(groupedLive).length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupedLive)
                      .map(([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        const prizeValue = getPrizeValueFromMetadata(metadata);
                        const tierValue = getTierValueFromMetadata(metadata);
                        return { league, matches, tournamentId, metadata, prizeValue, tierValue };
                      })
                      .sort((a, b) =>
                        a.tierValue !== b.tierValue
                          ? a.tierValue - b.tierValue
                          : (b.prizeValue ?? -1) - (a.prizeValue ?? -1),
                      )
                      .map(({ league, matches, tournamentId, metadata }) => (
                        <div key={league} className="mb-6">
                          <div className="px-2 sm:px-4 lg:px-6 ml-3 mb-2">
                            <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">
                              {league}
                            </div>
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                            {matches.map((match) => (
                              <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                <MatchCard match={match} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Upcoming */}
                {Object.keys(groupedUpcoming).length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupedUpcoming)
                      .map(([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        const prizeValue = getPrizeValueFromMetadata(metadata);
                        const tierValue = getTierValueFromMetadata(metadata);
                        return { league, matches, tournamentId, metadata, prizeValue, tierValue };
                      })
                      .sort((a, b) =>
                        a.tierValue !== b.tierValue
                          ? a.tierValue - b.tierValue
                          : (b.prizeValue ?? -1) - (a.prizeValue ?? -1),
                      )
                      .map(({ league, matches, tournamentId, metadata }) => (
                        <div key={league} className="mb-6">
                          <div className="px-2 sm:px-4 lg:px-6 ml-3 mb-2">
                            <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">
                              {league}
                            </div>
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                            {matches.map((match) => (
                              <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                <MatchCard match={match} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* Finished */}
                {Object.keys(groupedFinished).length > 0 && (
                  <div className="mb-8">
                    {Object.entries(groupedFinished)
                      .map(([league, { matches, tournamentId }]) => {
                        const metadata = getTournamentMetadata(matches);
                        const prizeValue = getPrizeValueFromMetadata(metadata);
                        const tierValue = getTierValueFromMetadata(metadata);
                        return { league, matches, tournamentId, metadata, prizeValue, tierValue };
                      })
                      .sort((a, b) =>
                        a.tierValue !== b.tierValue
                          ? a.tierValue - b.tierValue
                          : (b.prizeValue ?? -1) - (a.prizeValue ?? -1),
                      )
                      .map(({ league, matches, tournamentId, metadata }) => (
                        <div key={league} className="mb-6">
                          <div className="px-2 sm:px-4 lg:px-6 ml-3 mb-2">
                            <div className="font-semibold text-sm text-theme-purple uppercase tracking-wide">
                              {league}
                            </div>
                            {renderTournamentMetadata(metadata)}
                          </div>
                          <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                            {matches.map((match) => (
                              <div key={match.id} className="px-2 sm:px-4 lg:px-6">
                                <MatchCard match={match} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {/* No matches */}
                {(!isSelectedDateToday || Object.keys(groupedLive).length === 0) &&
                  Object.keys(groupedUpcoming).length === 0 &&
                  Object.keys(groupedFinished).length === 0 && (
                    <div className="text-center py-8 bg-theme-gray-dark/50 rounded-md">
                      <p className="text-gray-400 mb-4">No matches scheduled for {formatMatchDate(selectedDate)}.</p>
                      <p className="text-sm text-gray-500 mb-4">
                        Try selecting a different date or use the sync buttons below to refresh match data.
                      </p>
                    </div>
                  )}
              </>
            )}
          </div>

          {/* SEO Content Block */}
          <SEOContentBlock title={homepageSEOContent.title} paragraphs={homepageSEOContent.paragraphs} />
        </div>
      </div>
      <Footer />
      
      {/* Welcome Offer Modal - auto-shows on login for eligible users */}
      <WelcomeOfferModal 
        open={showWelcomeOfferModal} 
        onOpenChange={setShowWelcomeOfferModal} 
      />
    </div>
  );
};

export default Index;
