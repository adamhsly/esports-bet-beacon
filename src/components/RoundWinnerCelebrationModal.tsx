import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Sparkles, Star } from "lucide-react";
import { RoundWinner } from "@/hooks/useRoundWinnerNotifications";

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

  return (
    <Dialog open={!!winner} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 text-white border-purple-500">
        <div className="text-center space-y-6 py-8">
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
          <div className={`text-9xl ${getMedalColor(winner.finish_position)} animate-bounce`}>
            {getMedalEmoji(winner.finish_position)}
          </div>

          {/* Congratulations Text */}
          <div className="space-y-2">
            <h2 className="text-4xl font-bold">Congratulations!</h2>
            <p className="text-2xl">
              You finished <span className="font-bold text-yellow-300">{getPositionText(winner.finish_position)}</span>
            </p>
            <p className="text-lg text-purple-200">
              in the {roundTypeTitle} Fantasy Round
            </p>
          </div>

          {/* Credits Awarded */}
          <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 rounded-xl p-8 mx-8 transform hover:scale-105 transition-transform">
            <div className="flex items-center justify-center gap-3 mb-2">
              <Star className="w-8 h-8" />
              <span className="text-xl">You've earned</span>
            </div>
            <div className="text-6xl font-bold my-4">{winner.credits_awarded}</div>
            <div className="text-xl">Bonus Credits!</div>
          </div>

          {/* Stats */}
          <div className="bg-black/30 rounded-lg p-6 mx-8 space-y-3">
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
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-12 py-6 text-xl mt-6"
          >
            <Trophy className="mr-2 w-6 h-6" />
            Claim Your Rewards!
          </Button>

          <p className="text-sm text-purple-300 mt-4">
            Use your bonus credits to enter more fantasy rounds!
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
