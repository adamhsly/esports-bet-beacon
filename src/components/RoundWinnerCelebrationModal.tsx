import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, Star } from "lucide-react";
import { RoundWinner } from "@/hooks/useRoundWinnerNotifications";

// Monthly Steam voucher prizes
const MONTHLY_STEAM_PRIZES: Record<number, string> = {
  1: '£100',
  2: '£25',
  3: '£5',
};

interface RoundWinnerCelebrationModalProps {
  winner: RoundWinner | null;
  onClose: () => void;
}

export const RoundWinnerCelebrationModal = ({ 
  winner, 
  onClose 
}: RoundWinnerCelebrationModalProps) => {
  if (!winner) return null;

  const getMedalEmoji = (position: number) => {
    return position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
  };

  const getMedalColor = (position: number) => {
    return position === 1 ? 'text-yellow-500' : position === 2 ? 'text-gray-400' : 'text-orange-600';
  };

  const getPositionText = (position: number) => {
    return position === 1 ? '1st Place' : position === 2 ? '2nd Place' : '3rd Place';
  };

  const roundTypeTitle = winner.round_type 
    ? winner.round_type.charAt(0).toUpperCase() + winner.round_type.slice(1)
    : 'Fantasy';

  const isMonthlyRound = winner.round_type === 'monthly';
  const steamPrize = MONTHLY_STEAM_PRIZES[winner.finish_position];

  return (
    <Dialog open={!!winner} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-screen overflow-y-auto bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white border-purple-500">
        <div className="text-center space-y-3 sm:space-y-4 py-4 sm:py-6">
          {/* Confetti effect for 1st place */}
          {winner.finish_position === 1 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <Sparkles
                  key={i}
                  className="absolute animate-pulse text-yellow-400"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
          )}

          {/* Medal Icon */}
          <div className={`text-6xl sm:text-8xl md:text-9xl ${getMedalColor(winner.finish_position)} animate-bounce`}>
            {getMedalEmoji(winner.finish_position)}
          </div>

          {/* Congratulations Text */}
          <div className="space-y-1 sm:space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">Congratulations!</h2>
            <p className="text-lg sm:text-xl md:text-2xl">
              You finished <span className="font-bold text-yellow-300">{getPositionText(winner.finish_position)}</span>
            </p>
            <p className="text-sm sm:text-base md:text-lg text-purple-200">
              in the {roundTypeTitle} Fantasy Round
            </p>
          </div>

          {/* Prize Awarded */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-4 sm:p-6 mx-4 sm:mx-6 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <Star className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="text-base sm:text-lg md:text-xl">You've won</span>
            </div>
            {isMonthlyRound ? (
              <>
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold my-2 sm:my-4">{steamPrize}</div>
                <div className="text-base sm:text-lg md:text-xl">Steam Voucher!</div>
              </>
            ) : (
              <>
                <div className="text-4xl sm:text-5xl md:text-6xl font-bold my-2 sm:my-4">{winner.credits_awarded}</div>
                <div className="text-base sm:text-lg md:text-xl">Bonus Credits!</div>
              </>
            )}
          </div>
          
          {/* Contact notice for monthly rounds */}
          {isMonthlyRound && (
            <div className="bg-blue-500/20 border border-blue-400/50 rounded-lg p-3 sm:p-4 mx-4 sm:mx-6 text-sm sm:text-base">
              <p className="text-blue-100">
                🎮 We'll be in contact shortly to process your Steam voucher prize!
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="bg-black/30 rounded-lg p-4 sm:p-6 mx-4 sm:mx-6 space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-purple-200">Final Score:</span>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {winner.total_score} points
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-purple-200">Round Type:</span>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                {roundTypeTitle}
              </Badge>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={onClose}
            variant="default"
            size="lg"
            className="w-full sm:w-auto px-8 sm:px-12 text-base sm:text-lg"
          >
            <Trophy className="mr-2 w-5 h-5 sm:w-6 sm:h-6" />
            Claim Your Rewards!
          </Button>

          <p className="text-xs sm:text-sm text-purple-300">
            {isMonthlyRound 
              ? "Check your email for details about your Steam voucher prize!"
              : "Use your bonus credits to enter more fantasy rounds!"
            }
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
