import React from "react";
import { Calendar, Trophy, Clock, Users, Gamepad2, Coins } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { formatCurrency, getCurrencySymbol } from "@/utils/currencyUtils";
import { useStripeFxRate } from "@/hooks/useStripeFxRate";

interface Round {
  id: string;
  type: "daily" | "weekly" | "monthly" | "private";
  start_date: string;
  end_date: string;
  status: string;
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
  is_private?: boolean;
}

interface RoundDetailsModalProps {
  round: Round;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RoundDetailsModal: React.FC<RoundDetailsModalProps> = ({ round, open, onOpenChange }) => {
  const prizeType = round.prize_type || "credits";
  const { convertEntryFee, isGBP, isLoading: fxLoading } = useStripeFxRate();
  
  const formatPrizeDisplay = (amount: number) => {
    if (prizeType === "vouchers") {
      return formatCurrency(amount);
    }
    return `${amount} Credits`;
  };

  // Format entry fee with Stripe FX rate
  const formatEntryFeeDisplay = (fee: number) => {
    if (fxLoading) {
      return "Loading...";
    }
    const converted = convertEntryFee(fee);
    // Add ~ prefix for non-GBP users to indicate approximate
    return isGBP ? converted : `~${converted}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="text-white text-lg">{round.round_name || `${round.type.charAt(0).toUpperCase() + round.type.slice(1)} Round`}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Prizes */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-semibold text-white">Prize Pool</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-yellow-500/20 rounded-lg p-2">
                <div className="text-xs text-yellow-300">1st</div>
                <div className="text-sm font-bold text-yellow-400">{formatPrizeDisplay(round.prize_1st ?? 0)}</div>
              </div>
              <div className="bg-gray-400/20 rounded-lg p-2">
                <div className="text-xs text-gray-300">2nd</div>
                <div className="text-sm font-bold text-gray-300">{formatPrizeDisplay(round.prize_2nd ?? 0)}</div>
              </div>
              <div className="bg-amber-600/20 rounded-lg p-2">
                <div className="text-xs text-amber-400">3rd</div>
                <div className="text-sm font-bold text-amber-500">{formatPrizeDisplay(round.prize_3rd ?? 0)}</div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Teams */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-gray-400">Teams</span>
              </div>
              <div className="text-sm font-medium text-white">
                {round.team_type === "pro" ? "Pro Only" : round.team_type === "amateur" ? "Amateur Only" : "Pro & Amateur"}
              </div>
            </div>

            {/* Games */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Gamepad2 className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-gray-400">Games</span>
              </div>
              <div className="text-sm font-medium text-white">{round.game_type || "All Games"}</div>
            </div>

            {/* Entry Fee */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Coins className="h-4 w-4 text-green-400" />
                <span className="text-xs text-gray-400">Entry</span>
              </div>
              <div className="text-sm font-medium text-white">
                {round.is_paid && round.entry_fee ? formatEntryFeeDisplay(round.entry_fee) : "Free"}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-slate-700/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-orange-400" />
                <span className="text-xs text-gray-400">Type</span>
              </div>
              <div className="text-sm font-medium text-white capitalize">{round.type}</div>
            </div>
          </div>

        {/* Dates */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-gray-400">Schedule</span>
            </div>
            <div className="flex justify-between text-sm">
              <div>
                <div className="text-xs text-gray-500">Starts</div>
                <div className="text-white font-medium">{format(new Date(round.start_date), "MMM d, h:mm a")}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Ends</div>
                <div className="text-white font-medium">{format(new Date(round.end_date), "MMM d, h:mm a")}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
