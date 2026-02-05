import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Clock, Info, Users, Gamepad2, Coins, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";
import { usePaidRoundCheckout } from "@/hooks/usePaidRoundCheckout";
import { useWelcomeOffer } from "@/hooks/useWelcomeOffer";
import { RoundFilters, RoundFiltersState, defaultFilters, applyRoundFilters } from "./RoundFilters";
import { format } from "date-fns";
import { RoundDetailsModal } from "./RoundDetailsModal";
import { formatCurrency, formatDollarAmount } from "@/utils/currencyUtils";
import { trackAddToCart, trackLead } from "@/utils/metaPixel";
import { useStripeFxRate } from "@/hooks/useStripeFxRate";
import { RoundCardMiniLeaderboard } from "./RoundCardMiniLeaderboard";
 import { PaymentMethodModal, PaymentMethod } from '@/components/PaymentMethodModal';

interface Round {
  id: string;
  type: "daily" | "weekly" | "monthly";
  start_date: string;
  end_date: string;
  status: "open" | "scheduled" | "in_progress" | "finished";
  is_paid?: boolean;
  entry_fee?: number;
  round_name?: string;
  game_type?: string;
  team_type?: "pro" | "amateur" | "both";
  stripe_price_id?: string;
  prize_type?: "credits" | "vouchers";
  prize_1st?: number;
  prize_2nd?: number;
  prize_3rd?: number;
  section_name?: string;
  minimum_reservations?: number;
}

// Format prize amount based on type
const formatPrize = (amount: number, prizeType: "credits" | "vouchers" = "credits") => {
  if (prizeType === "vouchers") {
    return formatCurrency(amount);
  }
  return amount.toString();
};

// Format total prize pot
const formatTotalPrize = (prize1st: number, prize2nd: number, prize3rd: number, prizeType: "credits" | "vouchers" = "credits") => {
  const total = prize1st + prize2nd + prize3rd;
  if (prizeType === "vouchers") {
    return `${formatCurrency(total)} Prizes`;
  }
  return `${total} Credits`;
};
const SectionHeading: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <h2 className="text-xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
    {children}
  </h2>
);

// Format entry fee from pence to dollars
const formatEntryFee = (feePence: number) => {
  return formatCurrency(feePence);
};


const RoundCard: React.FC<{
  round?: Round;
  type: "daily" | "weekly" | "monthly" | "private";
  onClick: () => void;
  onPaidEntry?: () => void;
  onSubmitPaidTeams?: () => void;
  isPaidCheckoutLoading?: boolean;
  userEntryCount?: number;
  hasPaidButEmptyPicks?: boolean;
  pickCount?: number;
  hasFreeEntry?: boolean;
  hasExistingPicks?: boolean;
}> = ({ 
  round, 
  type, 
  onClick, 
  onPaidEntry, 
  onSubmitPaidTeams, 
  isPaidCheckoutLoading, 
  userEntryCount = 0, 
  hasPaidButEmptyPicks = false,
  pickCount = 0,
  hasFreeEntry = false,
  hasExistingPicks = false,
}) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  const getRoundImage = (roundType: string, gameType?: string | null, platform: "mobile" | "desktop" = "desktop") => {
    // Handle private rounds separately
    if (roundType === "private") {
      return "/lovable-uploads/private_round.png";
    }

    // Map game_type to image filename prefix
    const getGameImageKey = (game: string | null | undefined): string => {
      if (!game || game === "all") return "all";
      const normalizedGame = game.toLowerCase();
      if (normalizedGame === "cs2" || normalizedGame === "counter-strike" || normalizedGame === "csgo") {
        return "cs2";
      }
      if (normalizedGame === "valorant") return "valorant";
      if (normalizedGame === "dota-2" || normalizedGame === "dota2") return "dota2";
      if (normalizedGame === "league-of-legends" || normalizedGame === "lol") return "league-of-legends";
      return "all"; // Default to all games if unknown
    };

    const gameKey = getGameImageKey(gameType);
    // Note: file naming is inverted - "desktop" files are for mobile, "mobile" files are for desktop/tablet
    const fileSuffix = platform === "mobile" ? "desktop" : "mobile";
    return `/lovable-uploads/rounds/${gameKey}-${fileSuffix}.png`;
  };
  if (type === "private") {
    return (
      <Card
        className="relative cursor-pointer transition-all duration-250 hover:scale-[1.01] hover:shadow-md hover:ring-1 hover:ring-gray-400/30 bg-slate-700 border-gray-700/50 overflow-hidden"
        onClick={onClick}
      >
        {/* Mobile Layout */}
        <CardContent className="p-4 md:hidden flex flex-col items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Private Round</h3>
          <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
            <img src={getRoundImage("private")} alt="Private round" className="w-20 h-20 object-contain" />
          </div>
          <p className="text-sm text-purple-300 text-center">Play your way - Create or join private leagues</p>
          <Button className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm py-2 mt-1">
            Enter
          </Button>
        </CardContent>

        {/* Desktop Layout */}
        <CardContent className="p-4 hidden md:flex items-center gap-4">
          <div className="flex-shrink-0">
            <div className="relative p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-400/30">
              <img src={getRoundImage("private")} alt="Private round" className="w-20 h-20 object-contain" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Private Round</h3>
            <p className="text-sm text-purple-300">Play your way - Create or join private leagues</p>
          </div>
          <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium text-sm px-6">Enter</Button>
        </CardContent>
      </Card>
    );
  }
  if (!round) return null;
  const isPaid = round.is_paid && round.entry_fee;
  const prizeType = round.prize_type || "credits";
  const prize1st = formatPrize(round.prize_1st ?? 200, prizeType);
  const prize2nd = formatPrize(round.prize_2nd ?? 100, prizeType);
  const prize3rd = formatPrize(round.prize_3rd ?? 50, prizeType);
  const isScheduled = round.status === "scheduled" || new Date() < new Date(round.start_date);
  const isInProgress = () => {
    const now = new Date();
    const start = new Date(round.start_date);
    const end = new Date(round.end_date);
    return now >= start && now <= end;
  };

  // Calculate countdown text for pills
  const getCountdownText = (targetDate: Date) => {
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    if (diffMs <= 0) return "";
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays >= 1) {
      return ` - ${diffDays}d`;
    } else if (diffHours >= 1) {
      return ` - ${diffHours}h`;
    } else {
      return ` - ${diffMins}m`;
    }
  };
  const handleClick = () => {
    // If user has paid but hasn't submitted teams, go to team picker
    if (hasPaidButEmptyPicks && onSubmitPaidTeams) {
      onSubmitPaidTeams();
    } else {
      // For all rounds (free or paid), navigate to team picker
      // Payment for paid rounds happens on submit in TeamPickerUpdated
      onClick();
    }
  };

  const getButtonText = () => {
    if (isPaidCheckoutLoading) return "Loading...";
    if (isPaid) {
      // Show "Use Free Entry" if user has sufficient promo balance
      if (hasFreeEntry) {
        if (hasExistingPicks) {
          return "Use Free Entry Again";
        }
        return "Use Free Entry";
      }
      // Show "Submit Team Again" if user already has picks for this round
      if (hasExistingPicks) {
        return "Submit Team Again - Paid";
      }
      return "Submit Team - Paid";
    }
    return "Submit Team - Free";
  };
  
  // Show player count for all rounds
  const getPlayerCountDisplay = () => {
    // For all rounds, show submitted picks
    if (pickCount > 0) {
      return `${pickCount} playing`;
    }
    return null;
  };
  
  const playerCountText = getPlayerCountDisplay();
  // Determine neon border class based on team_type
  const getNeonBorderClass = () => {
    switch (round.team_type) {
      case "pro":
        return "neon-border-purple";
      case "amateur":
        return "neon-border-orange";
      case "both":
      default:
        return "neon-border-split";
    }
  };

  // Get team type pill styling based on team_type
  const getTeamTypePillClass = () => {
    switch (round.team_type) {
      case "pro":
        return "bg-[hsl(272_91%_65%/0.2)] text-[hsl(272_91%_75%)] border-[hsl(272_91%_65%/0.5)]";
      case "amateur":
        return "bg-[hsl(25_95%_53%/0.2)] text-[hsl(25_95%_63%)] border-[hsl(25_95%_53%/0.5)]";
      case "both":
      default:
        return "team-type-pill-split";
    }
  };

  return (
    <Card
      className={`relative transition-all duration-250 overflow-hidden ${getNeonBorderClass()} ${isPaid ? "bg-gradient-to-br from-amber-900/30 to-slate-700" : "bg-slate-700"}`}
    >
      {/* Status Pills */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 flex-wrap justify-end">
        {isScheduled && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white border border-blue-500 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Coming Soon{getCountdownText(new Date(round.start_date))}
          </span>
        )}
        {!isScheduled && isInProgress() && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white border border-green-500 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3" />
            In Progress{getCountdownText(new Date(round.end_date))}
          </span>
        )}
      </div>

      {/* Mobile Layout */}
      <CardContent className="p-0 md:hidden flex flex-col">
        <div className="relative w-full h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <img
            src={getRoundImage(round.type, round.game_type, "mobile")}
            alt={`${round.type} round`}
            className="w-full h-20 object-cover"
          />
          {/* Round name overlay */}
          {round.round_name && (
            <div className="absolute bottom-0 left-0 right-0 bg-black px-2 py-1 flex items-center justify-between">
              <p className="text-base font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate flex-1">{round.round_name}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsModal(true);
                }}
                className="ml-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <Info className="h-4 w-4 text-gray-300" />
              </button>
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full">
              {round.game_type || "All Games"}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${getTeamTypePillClass()}`}>
              {round.team_type === "pro" ? "Pro Teams" : round.team_type === "amateur" ? "Amateur Teams" : "Pro & Amateur"}
            </span>
            {playerCountText && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1">
                <Users className="h-3 w-3" />
                {playerCountText}
              </span>
            )}
          </div>

          {/* Mini Leaderboard for in-progress rounds */}
          {isInProgress() && (
            <RoundCardMiniLeaderboard roundId={round.id} />
          )}

          <div className="w-full cursor-pointer hover:scale-[1.02] transition-transform" onClick={handleClick}>
            <div className="w-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 border-b-0 rounded-t-lg px-4 py-2 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-300" />
              <span className="text-base font-bold text-emerald-300">
                {formatTotalPrize(round.prize_1st ?? 0, round.prize_2nd ?? 0, round.prize_3rd ?? 0, prizeType)}
              </span>
            </div>
            <div className="w-full overflow-hidden rounded-b-lg">
              <Button
                className={`w-full font-medium text-sm py-2.5 !rounded-none before:hidden ${
                  hasFreeEntry ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/30" :
                  isPaid ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" : 
                  "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                }`}
                disabled={isPaidCheckoutLoading}
              >
                {getButtonText()}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Desktop Layout */}
      <CardContent className="p-0 hidden md:flex items-stretch min-h-[150px]">
        <div className="flex-shrink-0 w-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
          <img
            src={getRoundImage(round.type, round.game_type, "desktop")}
            alt={`${round.type} round`}
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
          {/* Round name */}
          {round.round_name && (
            <div className="flex items-center justify-center gap-2 mb-2">
              <p className="text-lg font-bold truncate bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{round.round_name}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDetailsModal(true);
                }}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              >
                <Info className="h-4 w-4 text-gray-300" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 rounded-full">
              {round.game_type || "All Games"}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium border rounded-full ${getTeamTypePillClass()}`}>
              {round.team_type === "pro" ? "Pro Teams" : round.team_type === "amateur" ? "Amateur Teams" : "Pro & Amateur"}
            </span>
          </div>
          {/* Player count display - centered below pills on desktop/tablet */}
          {playerCountText && (
            <div className="flex justify-center mt-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full flex items-center gap-1">
                <Users className="h-3 w-3" />
                {playerCountText}
              </span>
            </div>
          )}
          
          {/* Mini Leaderboard for in-progress rounds */}
          {isInProgress() && (
            <div className="mt-2">
              <RoundCardMiniLeaderboard roundId={round.id} />
            </div>
          )}
        </div>

        <div className="p-4 pt-8 flex flex-col items-center justify-center gap-2">
          <div className="w-full min-w-[140px] cursor-pointer hover:scale-[1.02] transition-transform" onClick={handleClick}>
            <div className="w-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 border-b-0 rounded-t-lg px-5 py-2 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-300" />
              <span className="text-base font-bold text-emerald-300">
                {formatTotalPrize(round.prize_1st ?? 0, round.prize_2nd ?? 0, round.prize_3rd ?? 0, prizeType)}
              </span>
            </div>
            <div className="w-full overflow-hidden rounded-b-lg">
              <Button
                className={`w-full font-medium text-sm !rounded-none before:hidden ${
                  hasFreeEntry ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white shadow-lg shadow-emerald-500/30" :
                  isPaid ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white" : 
                  "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                }`}
                disabled={isPaidCheckoutLoading}
              >
                {getButtonText()}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* Round Details Modal */}
      <RoundDetailsModal
        round={round}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />
    </Card>
  );
};
export const RoundSelector: React.FC<{
  onNavigateToInProgress?: () => void;
  onJoinRound?: (round: Round) => void;
  onRefetchRef?: React.MutableRefObject<(() => void) | null>;
}> = ({ onNavigateToInProgress, onJoinRound, onRefetchRef }) => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userEntryCounts, setUserEntryCounts] = useState<Record<string, number>>({});
  const [paidButEmptyPicks, setPaidButEmptyPicks] = useState<Record<string, string>>({});
  const [joinedFreeRounds, setJoinedFreeRounds] = useState<Set<string>>(new Set());
  const [paidRoundsWithPicks, setPaidRoundsWithPicks] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<RoundFiltersState>(defaultFilters);
  const [pickCounts, setPickCounts] = useState<Record<string, number>>({});
  const [userPromoBalance, setUserPromoBalance] = useState(0);
  const { initiateCheckout, loading: checkoutLoading } = usePaidRoundCheckout();
  const { status: welcomeOfferStatus } = useWelcomeOffer();
   const [showPaymentModal, setShowPaymentModal] = useState(false);
   const [pendingPaidRound, setPendingPaidRound] = useState<Round | null>(null);
  
  // User has free entry if they have promo balance OR they're tier 1 with unclaimed offer (free entry waiting to be claimed)
  // BUT NOT if they've already used a promo entry (prevents double free entry bug)
  const hasUnclaimedFreeEntry = welcomeOfferStatus?.tier === 1 && !welcomeOfferStatus?.offerClaimed && !welcomeOfferStatus?.hasUsedPromoEntry;
  const effectivePromoBalance = userPromoBalance > 0 ? userPromoBalance : (hasUnclaimedFreeEntry ? (welcomeOfferStatus?.rewardPence || 1000) : 0);

  // Expose refetch function to parent via ref
  useEffect(() => {
    if (onRefetchRef) {
      onRefetchRef.current = () => {
        fetchOpenRounds();
      };
    }
    return () => {
      if (onRefetchRef) {
        onRefetchRef.current = null;
      }
    };
  }, [onRefetchRef]);

  useEffect(() => {
    fetchOpenRounds();
  }, []);

  useEffect(() => {
    if (rounds.length > 0) {
      fetchPickCounts();
      if (user) {
        fetchUserEntryCounts();
        fetchPaidButEmptyPicks();
        fetchJoinedFreeRounds();
        fetchUserPromoBalance();
      }
    }
  }, [user, rounds]);

  // Fetch user's promo balance to check if they have a free entry
  const fetchUserPromoBalance = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('promo_balance_pence')
        .eq('id', user.id)
        .single();
      
      if (!error && data) {
        setUserPromoBalance(data.promo_balance_pence || 0);
      }
    } catch (err) {
      console.error('Error fetching promo balance:', err);
    }
  };

  // Fetch pick counts for all rounds
  const fetchPickCounts = async () => {
    const counts: Record<string, number> = {};
    
    for (const round of rounds) {
      try {
        const { count, error } = await supabase
          .from('fantasy_round_picks')
          .select('*', { count: 'exact', head: true })
          .eq('round_id', round.id);
        
        if (!error) {
          counts[round.id] = count || 0;
        }
      } catch {
        counts[round.id] = 0;
      }
    }
    setPickCounts(counts);
  };
  const fetchOpenRounds = async () => {
    try {
      const nowIso = new Date().toISOString();

      // Calculate date 2 months from now
      const twoMonthsFromNow = new Date();
      twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);

      // Fetch two sets of rounds:
      // 1. Free rounds: only scheduled/open rounds that haven't started yet
      // 2. Paid rounds: allow open rounds even if they've started (late entry)

      // Free rounds - must not have started
      const { data: freeRounds, error: freeError } = await supabase
        .from("fantasy_rounds")
        .select("*")
        .in("status", ["open", "scheduled"])
        .eq("is_private", false)
        .or("is_paid.is.null,is_paid.eq.false")
        .gt("start_date", nowIso)
        .lte("start_date", twoMonthsFromNow.toISOString())
        .order("start_date", { ascending: true });
      
      if (freeError) throw freeError;

      // Paid rounds - scheduled ones must not have started, but open ones can have started
      // Fetch scheduled paid rounds (not started)
      const { data: scheduledPaidRounds, error: scheduledPaidError } = await supabase
        .from("fantasy_rounds")
        .select("*")
        .eq("status", "scheduled")
        .eq("is_private", false)
        .eq("is_paid", true)
        .gt("start_date", nowIso)
        .lte("start_date", twoMonthsFromNow.toISOString())
        .order("start_date", { ascending: true });
      
      if (scheduledPaidError) throw scheduledPaidError;

      // Fetch open paid rounds (can have started, but must not have ended)
      const { data: openPaidRounds, error: openPaidError } = await supabase
        .from("fantasy_rounds")
        .select("*")
        .eq("status", "open")
        .eq("is_private", false)
        .eq("is_paid", true)
        .gt("end_date", nowIso)
        .order("start_date", { ascending: true });
      
      if (openPaidError) throw openPaidError;

      // Combine all rounds and deduplicate by id
      const allRoundsMap = new Map<string, Round>();
      [...(freeRounds || []), ...(scheduledPaidRounds || []), ...(openPaidRounds || [])].forEach(r => {
        allRoundsMap.set(r.id, r as Round);
      });
      
      // Sort by start_date ascending
      const combinedRounds = Array.from(allRoundsMap.values()).sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
      
      setRounds(combinedRounds);
    } catch (err) {
      console.error("Error fetching rounds:", err);
      toast.error("Failed to load rounds");
    } finally {
      setLoading(false);
    }
  };
  const fetchUserEntryCounts = async () => {
    if (!user) return;
    const paidRoundIds = rounds.filter((r) => r.is_paid).map((r) => r.id);
    if (paidRoundIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from("round_entries")
        .select("round_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .in("round_id", paidRoundIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((entry) => {
        counts[entry.round_id] = (counts[entry.round_id] || 0) + 1;
      });
      setUserEntryCounts(counts);
    } catch (err) {
      console.error("Error fetching entry counts:", err);
    }
  };
  
  // Fetch entries that need team submission by comparing:
  // - Number of completed round_entries (paid entries)
  // - Number of fantasy_round_picks with non-empty team_picks (submitted rosters)
  // If completedEntries > submittedPicks, user needs to submit teams
  const fetchPaidButEmptyPicks = async () => {
    if (!user) return;
    const paidRoundIds = rounds.filter((r) => r.is_paid).map((r) => r.id);
    if (paidRoundIds.length === 0) return;
    try {
      // Get all completed entries for this user
      const { data: completedEntries, error: entriesError } = await supabase
        .from("round_entries")
        .select("id, round_id, pick_id")
        .eq("user_id", user.id)
        .eq("status", "completed")
        .in("round_id", paidRoundIds);
      
      if (entriesError) throw entriesError;
      
      // Get all picks for this user
      const { data: allPicks, error: picksError } = await supabase
        .from("fantasy_round_picks")
        .select("id, round_id, team_picks")
        .eq("user_id", user.id)
        .in("round_id", paidRoundIds);
      
      if (picksError) throw picksError;
      
      // Count completed entries per round
      const entryCountsByRound: Record<string, number> = {};
      const unlinkedEntriesByRound: Record<string, string[]> = {};
      (completedEntries || []).forEach((entry) => {
        entryCountsByRound[entry.round_id] = (entryCountsByRound[entry.round_id] || 0) + 1;
        // Track unlinked entries for later linking
        if (!entry.pick_id) {
          if (!unlinkedEntriesByRound[entry.round_id]) {
            unlinkedEntriesByRound[entry.round_id] = [];
          }
          unlinkedEntriesByRound[entry.round_id].push(entry.id);
        }
      });
      
      // Count submitted picks (non-empty team_picks) and find empty picks per round
      const submittedPicksCountByRound: Record<string, number> = {};
      const emptyPicksByRound: Record<string, string[]> = {};
      const roundsWithSubmittedPicks = new Set<string>();
      (allPicks || []).forEach((pick) => {
        const teamPicks = pick.team_picks as unknown[];
        const hasTeams = teamPicks && Array.isArray(teamPicks) && teamPicks.length > 0;
        if (hasTeams) {
          submittedPicksCountByRound[pick.round_id] = (submittedPicksCountByRound[pick.round_id] || 0) + 1;
          roundsWithSubmittedPicks.add(pick.round_id);
        } else {
          if (!emptyPicksByRound[pick.round_id]) {
            emptyPicksByRound[pick.round_id] = [];
          }
          emptyPicksByRound[pick.round_id].push(pick.id);
        }
      });
      
      // Track which paid rounds have existing picks (for "Submit Team Again" CTA)
      setPaidRoundsWithPicks(roundsWithSubmittedPicks);
      
      // Determine which rounds need team submission
      const needsSubmission: Record<string, string> = {};
      paidRoundIds.forEach((roundId) => {
        const entryCount = entryCountsByRound[roundId] || 0;
        const submittedCount = submittedPicksCountByRound[roundId] || 0;
        
        // Only show "Paid - Submit Teams" if user has more paid entries than submitted picks
        if (entryCount > submittedCount) {
          // First priority: use an existing empty pick
          const emptyPicks = emptyPicksByRound[roundId] || [];
          if (emptyPicks.length > 0) {
            needsSubmission[roundId] = emptyPicks[0];
          } else {
            // Second priority: use an unlinked entry to create a new pick
            const unlinkedEntries = unlinkedEntriesByRound[roundId] || [];
            if (unlinkedEntries.length > 0) {
              needsSubmission[roundId] = `entry:${unlinkedEntries[0]}`;
            }
          }
        }
      });
      
      setPaidButEmptyPicks(needsSubmission);
    } catch (err) {
      console.error("Error fetching paid but empty picks:", err);
    }
  };
  
  // Fetch free rounds the user has already joined (one entry max per free round)
  const fetchJoinedFreeRounds = async () => {
    if (!user) return;
    const freeRoundIds = rounds.filter((r) => !r.is_paid).map((r) => r.id);
    if (freeRoundIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from("fantasy_round_picks")
        .select("round_id")
        .eq("user_id", user.id)
        .in("round_id", freeRoundIds);
      if (error) throw error;
      const joined = new Set((data || []).map((p) => p.round_id));
      setJoinedFreeRounds(joined);
    } catch (err) {
      console.error("Error fetching joined free rounds:", err);
    }
  };

  // Detect payment=success in URL and refetch entry data
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success' && user && rounds.length > 0) {
      // Refetch entry data after successful payment/promo entry
      fetchUserEntryCounts();
      fetchPaidButEmptyPicks();
      fetchJoinedFreeRounds();
      // Clear the payment param to prevent refetching on every render
      searchParams.delete('payment');
      searchParams.delete('round_id');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, user, rounds]);
  
  const handleJoinRound = (round: Round) => {
    const hasStarted = new Date() >= new Date(round.start_date);
    const isPaidRound = round.is_paid && round.entry_fee;
    const isOpenPaidRound = isPaidRound && round.status === 'open';
    
    // For free rounds, block if started. For paid rounds, allow if status is 'open'
    if (hasStarted && !isOpenPaidRound) {
      toast.error("This round has already started and can't be joined.");
      return;
    }

    // Allow unauthenticated users to join free rounds - auth will be required at submission
    const isFreeRound = !round.is_paid && (!round.entry_fee || round.entry_fee === 0);
    if (!user && !isFreeRound) {
      setShowAuthModal(true);
      return;
    }
    
    // Track Lead for free round joins
    if (isFreeRound) {
      trackLead(`free_round_join_${round.type}`);
    }
    
    onJoinRound ? onJoinRound(round) : onNavigateToInProgress?.();
  };
  const handlePaidEntry = (round: Round) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    
    // Track AddToCart for paid round entry
    trackAddToCart(round.id, round.round_name, round.entry_fee);
    
     // Show payment method selection modal
     setPendingPaidRound(round);
     setShowPaymentModal(true);
  };
 
   const handlePaymentMethodSelect = async (method: PaymentMethod) => {
     if (!pendingPaidRound) return;
     
     const result = await initiateCheckout(pendingPaidRound.id, { paymentMethod: method });
     
     // If promo covered the entry, close modal and refresh
     if (result?.promoCovered) {
       setShowPaymentModal(false);
       setPendingPaidRound(null);
       fetchOpenRounds();
     }
     
     // If redirecting to payment, the page will navigate away
   };

  const handleSubmitPaidTeams = async (round: Round) => {
    const pickId = paidButEmptyPicks[round.id];
    if (!pickId) return;
    
    // If it's an orphan entry (no pick created), create the pick now
    if (pickId.startsWith("entry:")) {
      const entryId = pickId.replace("entry:", "");
      try {
        // Create a new picks entry
        const { data: newPick, error } = await supabase
          .from("fantasy_round_picks")
          .insert({
            round_id: round.id,
            user_id: user!.id,
            team_picks: [],
          })
          .select()
          .single();
        
        if (error) throw error;
        
        // Link the pick to the entry
        await supabase
          .from("round_entries")
          .update({ pick_id: newPick.id })
          .eq("id", entryId);
        
        window.location.href = `/fantasy?roundId=${round.id}&pickId=${newPick.id}`;
      } catch (err) {
        console.error("Error creating pick for orphan entry:", err);
        toast.error("Failed to create entry. Please try again.");
      }
    } else {
      window.location.href = `/fantasy?roundId=${round.id}&pickId=${pickId}`;
    }
  };
  const handlePrivateRound = () => {
    window.location.href = "/fantasy/private";
  };

  // Filter out free rounds the user has already joined
  const baseFilteredRounds = rounds.filter((round) => {
    // Keep all paid rounds (unlimited entries)
    if (round.is_paid) return true;
    // For free rounds, hide if user already joined
    if (user && joinedFreeRounds.has(round.id)) return false;
    return true;
  });

  // Apply user-selected filters
  const filteredRounds = applyRoundFilters(baseFilteredRounds, filters);

  // Group rounds by section_name, fallback to default sections
  const groupedRounds = filteredRounds.reduce<Record<string, Round[]>>((acc, round) => {
    let sectionKey = round.section_name;
    
    // Default section logic if no section_name set
    if (!sectionKey) {
      if (round.prize_type === "vouchers" || round.type === "monthly") {
        sectionKey = "Win Steam Vouchers";
      } else {
        sectionKey = "Win Credits";
      }
    }
    
    if (!acc[sectionKey]) acc[sectionKey] = [];
    acc[sectionKey].push(round);
    return acc;
  }, {});
  
  // Get section names in a predictable order (paid sections first, then free)
  const sectionOrder = Object.keys(groupedRounds).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    
    // Paid sections come before free sections
    const aIsPaid = aLower.includes("paid") || aLower.includes("voucher");
    const bIsPaid = bLower.includes("paid") || bLower.includes("voucher");
    if (aIsPaid && !bIsPaid) return -1;
    if (!aIsPaid && bIsPaid) return 1;
    
    return a.localeCompare(b);
  });
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading rounds...</p>
      </div>
    );
  }
  return (
    <>
      <div className="mb-6" data-walkthrough="filters">
        <RoundFilters filters={filters} onFiltersChange={setFilters} resultCount={filteredRounds.length} hideStatusFilter />
      </div>
      <div className="space-y-8">
        {/* Dynamic sections based on section_name from database */}
        {sectionOrder.map((sectionName) => {
          const sectionRounds = groupedRounds[sectionName];
          // Sort: in_progress first, then by paid status, then by start_date
          const sortedRounds = [...sectionRounds].sort((a, b) => {
            // In-progress rounds come first
            const aInProgress = a.status === "in_progress" || (new Date() >= new Date(a.start_date) && new Date() <= new Date(a.end_date));
            const bInProgress = b.status === "in_progress" || (new Date() >= new Date(b.start_date) && new Date() <= new Date(b.end_date));
            if (aInProgress && !bInProgress) return -1;
            if (!aInProgress && bInProgress) return 1;
            // Then paid rounds
            if (a.is_paid && !b.is_paid) return -1;
            if (!a.is_paid && b.is_paid) return 1;
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          });
          
          // Find first free pro round for walkthrough targeting
          const firstFreeProRound = sortedRounds.find(r => !r.is_paid && r.team_type === 'pro');
          
          return (
            <section key={sectionName} data-walkthrough="round-section">
              <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border-white/10 overflow-hidden">
                <CardContent className="p-4 md:p-6">
                  <SectionHeading>{sectionName}</SectionHeading>
                  <div className="space-y-3">
                    {sortedRounds.map((round, idx) => {
                      const isFirstFreeProRound = round === firstFreeProRound;
                      return (
                        <div 
                          key={round.id}
                          data-walkthrough={isFirstFreeProRound ? "free-round" : idx === 0 ? "round-card" : undefined}
                        >
                          <RoundCard
                            round={round}
                            type={round.type}
                            onClick={() => handleJoinRound(round)}
                            onPaidEntry={round.is_paid ? () => handlePaidEntry(round) : undefined}
                            onSubmitPaidTeams={paidButEmptyPicks[round.id] ? () => handleSubmitPaidTeams(round) : undefined}
                            isPaidCheckoutLoading={checkoutLoading}
                            userEntryCount={userEntryCounts[round.id] || 0}
                            hasPaidButEmptyPicks={!!paidButEmptyPicks[round.id]}
                            pickCount={pickCounts[round.id] || 0}
                            hasFreeEntry={round.is_paid && effectivePromoBalance >= (round.entry_fee || 0)}
                            hasExistingPicks={round.is_paid && paidRoundsWithPicks.has(round.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </section>
          );
        })}
        
        {sectionOrder.length === 0 && (
          <p className="text-muted-foreground text-sm">No rounds available.</p>
        )}

        {/* Private Leagues Section */}
        <section>
          <Card className="bg-gradient-to-br from-[#1a1a2e] to-[#16162a] border-white/10 overflow-hidden">
            <CardContent className="p-4 md:p-6">
              <SectionHeading>Private Leagues</SectionHeading>
              <div className="space-y-3">
                <RoundCard type="private" onClick={handlePrivateRound} />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
 
     <PaymentMethodModal
       open={showPaymentModal}
       onOpenChange={(open) => {
         setShowPaymentModal(open);
         if (!open) setPendingPaidRound(null);
       }}
       onSelect={handlePaymentMethodSelect}
       loading={checkoutLoading}
       entryFee={pendingPaidRound?.entry_fee}
       roundName={pendingPaidRound?.round_name || (pendingPaidRound ? `${pendingPaidRound.type.charAt(0).toUpperCase() + pendingPaidRound.type.slice(1)} Round` : undefined)}
     />
    </>
  );
};
