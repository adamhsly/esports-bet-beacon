import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';

interface WelcomeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WelcomeOfferModal: React.FC<WelcomeOfferModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { status, progressPercent, daysRemaining, displayState } = useWelcomeOffer();

  const formatPence = (pence: number) => {
    const dollars = pence / 100;
    return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
  };
  const thresholdAmount = status?.thresholdPence ? formatPence(status.thresholdPence) : '$5';
  const rewardAmount = status?.rewardPence ? formatPence(status.rewardPence) : '$10';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-theme-gray-dark border-purple-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Gift className="w-5 h-5 text-yellow-400" />
            Welcome Offer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hero banner */}
          <div className="rounded-lg overflow-hidden">
            <img 
              src="/lovable-uploads/Spend_5_Get_10.png" 
              alt={`Spend ${thresholdAmount}, Get ${rewardAmount} Free!`}
              className="w-full h-auto"
            />
          </div>

          {/* Current status */}
          {status && displayState === 'progress' && !status.offerClaimed && (
            <div className="bg-theme-gray-medium/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Your Progress</span>
                <span className="text-sm font-medium text-white">
                  {formatPence(status.totalSpentPence)} / {formatPence(status.thresholdPence)}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-yellow-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {formatPence(status.thresholdPence - status.totalSpentPence)} more to unlock your reward!
              </p>
            </div>
          )}

          {status && displayState === 'active' && status.promoBalancePence > 0 && (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="font-semibold text-green-300">Offer Unlocked!</span>
              </div>
              <p className="text-sm text-white">
                Balance: <span className="font-bold text-green-300">{formatPence(status.promoBalancePence)}</span>
              </p>
              {daysRemaining !== null && (
                <p className="text-xs text-yellow-400 flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* How it works */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white">How It Works</h4>
            
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-purple-300">1</span>
                </div>
                <div>
                  <p className="text-sm text-white">Enter paid fantasy rounds</p>
                  <p className="text-xs text-gray-400">Any entry fee counts toward your {thresholdAmount} goal</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-yellow-300">2</span>
                </div>
                <div>
                  <p className="text-sm text-white">Reach {thresholdAmount} in total spending</p>
                  <p className="text-xs text-gray-400">Track your progress in the header</p>
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="w-4 h-4 text-gray-500" />
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-green-300">3</span>
                </div>
                <div>
                  <p className="text-sm text-white">Get {rewardAmount} promo balance instantly!</p>
                  <p className="text-xs text-gray-400">Auto-applied to your next paid entries</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <Button 
            onClick={() => {
              onOpenChange(false);
              navigate('/fantasy');
            }}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3 text-lg"
          >
            Play Fantasy
          </Button>

          {/* Fine print */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-gray-500">
              Promo balance is valid for 30 days after activation. Can only be used on paid fantasy round entries. 
              One welcome offer per account.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOfferModal;
