import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Ticket, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import AuthModal from "@/components/AuthModal";
import { usePaidRoundCheckout } from "@/hooks/usePaidRoundCheckout";

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
}

// Format prize amount based on type
const formatPrize = (amount: number, prizeType: "credits" | "vouchers" = "credits") => {
  if (prizeType === "vouchers") {
    return `£${(amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)}`;
  }
  return amount.toString();
};
const SectionHeading: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <h2 className="text-xl md:text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
    {children}
  </h2>
);

// Format entry fee from pence to pounds
const formatEntryFee = (feePence: number) => {
  return `£${(feePence / 100).toFixed(feePence % 100 === 0 ? 0 : 2)}`;
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
}> = ({ round, type, onClick, onPaidEntry, onSubmitPaidTeams, isPaidCheckoutLoading, userEntryCount = 0, hasPaidButEmptyPicks = false }) => {
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
  const isScheduled = round.status === "scheduled";
  const isInProgress = () => {
    const now = new Date();
    const start = new Date(round.start_date);
    const end = new Date(round.end_date);
    return now >= start && now <= end;
  };
  const handleClick = () => {
    // If user has paid but hasn't submitted teams, go to team picker
    if (hasPaidButEmptyPicks && onSubmitPaidTeams) {
      onSubmitPaidTeams();
    } else if (isPaid && onPaidEntry) {
      onPaidEntry();
    } else {
      onClick();
    }
  };

  const getButtonText = () => {
    if (isPaidCheckoutLoading) return "Loading...";
    if (hasPaidButEmptyPicks) return "Paid - Submit Teams";
    if (isPaid) {
      return userEntryCount > 0 ? "Enter Again" : `${formatEntryFee(round.entry_fee!)} To Join`;
    }
    return "Free To Join";
  };
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

  return (
    <Card
      className={`relative cursor-pointer transition-all duration-250 hover:scale-[1.01] hover:shadow-md overflow-hidden ${getNeonBorderClass()} ${isPaid ? "bg-gradient-to-br from-amber-900/30 to-slate-700" : "bg-slate-700"}`}
      onClick={handleClick}
    >
      {/* Status Pills */}
      <div className="absolute top-2 right-2 z-10 flex gap-2 flex-wrap justify-end">
        {isScheduled && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-600 text-white border border-blue-500 rounded-full flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Coming Soon
          </span>
        )}
        {!isScheduled && isInProgress() && (
          <span className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white border border-green-500 rounded-full">
            In Progress
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
        </div>

        <div className="p-4 flex flex-col items-center gap-3">
          <div className="text-center">
          <div className="flex items-center justify-center gap-4 text-2xl font-bold">
            <span className="flex items-center gap-1">
              <span className="text-yellow-400">🥇</span>
              <span className="text-gray-200">{prize1st}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-gray-400">🥈</span>
              <span className="text-gray-200">{prize2nd}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-orange-400">🥉</span>
              <span className="text-gray-200">{prize3rd}</span>
            </span>
          </div>
          <p className="text-sm text-purple-300 mt-2">Games: {round.game_type || "All Games"}</p>
          <p className="text-sm text-cyan-300">
            {round.team_type === "pro" ? "Pro Teams" : round.team_type === "amateur" ? "Amateur Teams" : "Pro & Amateur Teams"}
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Start: {new Date(round.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>End: {new Date(round.end_date).toLocaleDateString()}</span>
          </div>
        </div>

          <Button
            className={`w-full font-medium text-sm py-2 mt-1 ${hasPaidButEmptyPicks ? "bg-green-500 hover:bg-green-600 text-white" : isPaid ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"}`}
            disabled={isPaidCheckoutLoading}
          >
            {getButtonText()}
          </Button>
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
          <div className="flex items-center justify-center gap-4 mb-1">
            <div className="flex items-center gap-4 text-xl font-bold">
              <span className="flex items-center gap-1">
                <span className="text-yellow-400">🥇</span>
                <span className="text-gray-200">{prize1st}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-gray-400">🥈</span>
                <span className="text-gray-200">{prize2nd}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="text-orange-400">🥉</span>
                <span className="text-gray-200">{prize3rd}</span>
              </span>
            </div>
          </div>
          <p className="text-sm text-purple-300">Games: {round.game_type || "All Games"}</p>
          <p className="text-sm text-cyan-300 mb-1">
            {round.team_type === "pro" ? "Pro Teams" : round.team_type === "amateur" ? "Amateur Teams" : "Pro & Amateur Teams"}
          </p>

          <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Start: {new Date(round.start_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>End: {new Date(round.end_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="p-4 flex items-center">
          <Button
            className={`font-medium text-sm px-6 flex-shrink-0 ${hasPaidButEmptyPicks ? "bg-green-500 hover:bg-green-600 text-white" : isPaid ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"}`}
            disabled={isPaidCheckoutLoading}
          >
            {getButtonText()}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
export const RoundSelector: React.FC<{
  onNavigateToInProgress?: () => void;
  onJoinRound?: (round: Round) => void;
}> = ({ onNavigateToInProgress, onJoinRound }) => {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userEntryCounts, setUserEntryCounts] = useState<Record<string, number>>({});
  const [paidButEmptyPicks, setPaidButEmptyPicks] = useState<Record<string, string>>({});
  const { initiateCheckout, loading: checkoutLoading } = usePaidRoundCheckout();
  useEffect(() => {
    fetchOpenRounds();
  }, []);
  useEffect(() => {
    if (user && rounds.length > 0) {
      fetchUserEntryCounts();
      fetchPaidButEmptyPicks();
    }
  }, [user, rounds]);
  const fetchOpenRounds = async () => {
    try {
      // Calculate date 2 months from now
      const twoMonthsFromNow = new Date();
      twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2);
      
      const { data, error } = await supabase
        .from("fantasy_rounds")
        .select("*")
        .in("status", ["open", "scheduled", "in_progress"])
        .eq("is_private", false)
        .lte("start_date", twoMonthsFromNow.toISOString())
        .order("start_date", {
          ascending: true,
        });
      if (error) throw error;
      setRounds((data || []) as Round[]);
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
  
  // Fetch picks that are paid but have empty team_picks
  const fetchPaidButEmptyPicks = async () => {
    if (!user) return;
    const paidRoundIds = rounds.filter((r) => r.is_paid).map((r) => r.id);
    if (paidRoundIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from("fantasy_round_picks")
        .select("id, round_id, team_picks")
        .eq("user_id", user.id)
        .in("round_id", paidRoundIds);
      if (error) throw error;
      
      // Find picks with empty team_picks array (created by stripe webhook but not yet submitted)
      const emptyPicks: Record<string, string> = {};
      (data || []).forEach((pick) => {
        const teamPicks = pick.team_picks as unknown[];
        if (!teamPicks || !Array.isArray(teamPicks) || teamPicks.length === 0) {
          emptyPicks[pick.round_id] = pick.id;
        }
      });
      setPaidButEmptyPicks(emptyPicks);
    } catch (err) {
      console.error("Error fetching paid but empty picks:", err);
    }
  };
  
  const handleJoinRound = (round: Round) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    onJoinRound ? onJoinRound(round) : onNavigateToInProgress?.();
  };
  const handlePaidEntry = (round: Round) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    initiateCheckout(round.id);
  };
  
  const handleSubmitPaidTeams = (round: Round) => {
    const pickId = paidButEmptyPicks[round.id];
    if (pickId && onJoinRound) {
      // Pass the round to onJoinRound - FantasyPage will handle the pickId via URL params
      window.location.href = `/fantasy?roundId=${round.id}&pickId=${pickId}`;
    }
  };
  const handlePrivateRound = () => {
    window.location.href = "/fantasy/private";
  };

  // Group rounds by section_name, fallback to default sections
  const groupedRounds = rounds.reduce<Record<string, Round[]>>((acc, round) => {
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
  
  // Get section names in a predictable order (vouchers first, then credits)
  const sectionOrder = Object.keys(groupedRounds).sort((a, b) => {
    if (a.toLowerCase().includes("voucher")) return -1;
    if (b.toLowerCase().includes("voucher")) return 1;
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
      <div className="space-y-8">
        {/* Dynamic sections based on section_name from database */}
        {sectionOrder.map((sectionName) => {
          const sectionRounds = groupedRounds[sectionName];
          // Sort paid rounds first within section
          const sortedRounds = [...sectionRounds].sort((a, b) => {
            if (a.is_paid && !b.is_paid) return -1;
            if (!a.is_paid && b.is_paid) return 1;
            return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
          });
          
          return (
            <section key={sectionName}>
              <SectionHeading>{sectionName}</SectionHeading>
              <div className="space-y-3">
                {sortedRounds.map((round) => (
                  <RoundCard
                    key={round.id}
                    round={round}
                    type={round.type}
                    onClick={() => handleJoinRound(round)}
                    onPaidEntry={round.is_paid ? () => handlePaidEntry(round) : undefined}
                    onSubmitPaidTeams={paidButEmptyPicks[round.id] ? () => handleSubmitPaidTeams(round) : undefined}
                    isPaidCheckoutLoading={checkoutLoading}
                    userEntryCount={userEntryCounts[round.id] || 0}
                    hasPaidButEmptyPicks={!!paidButEmptyPicks[round.id]}
                  />
                ))}
              </div>
            </section>
          );
        })}
        
        {sectionOrder.length === 0 && (
          <p className="text-muted-foreground text-sm">No rounds available.</p>
        )}

        {/* Private Leagues Section */}
        <section>
          <SectionHeading>Private Leagues</SectionHeading>
          <div className="space-y-3">
            <RoundCard type="private" onClick={handlePrivateRound} />
          </div>
        </section>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  );
};
