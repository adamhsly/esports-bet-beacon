import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, CheckCircle, Sparkles, Loader2, DollarSign, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface WelcomeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WelcomeOfferModal: React.FC<WelcomeOfferModalProps> = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, daysRemaining, displayState, refetch, progressPercent, canClaimTier2 } = useWelcomeOffer();
  const [claiming, setClaiming] = useState(false);

  const formatPence = (pence: number) => {
    const dollars = pence / 100;
    return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
  };
  const rewardAmount = status?.rewardPence ? formatPence(status.rewardPence) : '$10';
  const thresholdAmount = status?.thresholdPence ? formatPence(status.thresholdPence) : '$5';
  const spentAmount = status?.totalSpentPence ? formatPence(status.totalSpentPence) : '$0';

  const handleClaimBonus = async () => {
    if (!user) {
      toast.error('Please sign in to claim your bonus');
      return;
    }

    setClaiming(true);
    try {
      const { data, error } = await (supabase.rpc as any)('claim_welcome_bonus', { p_user_id: user.id });
      
      if (error) {
        console.error('Error claiming bonus:', error);
        toast.error(error.message || 'Failed to claim bonus');
      } else if (data?.success === false) {
        toast.error(data.error || 'Failed to claim bonus');
      } else {
        const tier = data?.tier ?? 1;
        const message = tier === 1 
          ? `${rewardAmount} claimed! Use your promo balance on paid rounds`
          : `${rewardAmount} bonus unlocked! You've earned it by spending ${thresholdAmount}`;
        toast.success(message);
        refetch();
        onOpenChange(false);
        navigate('/fantasy?tab=join');
      }
    } catch (err) {
      console.error('Error claiming bonus:', err);
      toast.error('Failed to claim bonus');
    } finally {
      setClaiming(false);
    }
  };

  // Check if we're in the claimed/active state
  const hasActiveBalance = displayState === 'active' && status && status.promoBalancePence > 0;
  const isTier1Unclaimed = status?.tier === 1 && !status?.offerClaimed;
  const isTier2InProgress = status?.tier === 2 && !status?.offerClaimed && !canClaimTier2;
  const isTier2Ready = status?.tier === 2 && canClaimTier2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-theme-gray-dark border-green-500/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {status?.tier === 2 ? (
              <DollarSign className="w-5 h-5 text-purple-400" />
            ) : (
              <Gift className="w-5 h-5 text-green-400" />
            )}
            {hasActiveBalance ? 'Promo Balance' : status?.tier === 2 ? 'Spend & Earn Bonus' : 'Welcome Bonus'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hero section - different based on state */}
          {hasActiveBalance ? (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white mb-1">
                {formatPence(status.promoBalancePence)} Available
              </h3>
              <p className="text-sm text-gray-300">
                Use your promo balance on paid fantasy entries
              </p>
              {daysRemaining !== null && (
                <p className="text-xs text-yellow-400 flex items-center justify-center gap-1 mt-2">
                  <Clock className="w-3 h-3" />
                  Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          ) : isTier2Ready ? (
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-500/20 border border-yellow-500/50 rounded-lg p-4 text-center">
              <Sparkles className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white mb-1">
                Claim Your {rewardAmount} Bonus!
              </h3>
              <p className="text-sm text-gray-300">
                You've spent {thresholdAmount} on paid rounds - claim your reward!
              </p>
            </div>
          ) : isTier2InProgress ? (
            <div className="bg-gradient-to-r from-purple-600/20 to-blue-500/20 border border-purple-500/50 rounded-lg p-4 text-center">
              <TrendingUp className="w-10 h-10 text-purple-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white mb-1">
                Spend {thresholdAmount}, Get {rewardAmount}!
              </h3>
              <p className="text-sm text-gray-300">
                Enter paid rounds to unlock your bonus
              </p>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{spentAmount} / {thresholdAmount}</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
              <Sparkles className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white mb-1">
                Get {rewardAmount} Free!
              </h3>
              <p className="text-sm text-gray-300">
                New users receive {rewardAmount} promo balance to use on paid fantasy entries
              </p>
            </div>
          )}

          {/* How it works - for tier 1 unclaimed */}
          {isTier1Unclaimed && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">How It Works</h4>
              
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-green-300">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Claim your {rewardAmount} bonus</p>
                    <p className="text-xs text-gray-400">Instantly added to your promo balance</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-purple-300">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Enter paid fantasy rounds</p>
                    <p className="text-xs text-gray-400">Promo balance auto-applies at checkout</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-yellow-300">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Win prizes!</p>
                    <p className="text-xs text-gray-400">Compete for credits and rewards</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How it works - for tier 2 in progress */}
          {isTier2InProgress && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">How to Unlock</h4>
              
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-purple-300">1</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Enter paid fantasy rounds</p>
                    <p className="text-xs text-gray-400">Any paid round entry counts towards your {thresholdAmount} target</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-yellow-300">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Reach {thresholdAmount} spent</p>
                    <p className="text-xs text-gray-400">Your {rewardAmount} bonus will be ready to claim</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-green-300">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Claim your {rewardAmount}</p>
                    <p className="text-xs text-gray-400">Added to your promo balance for 30 days</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA Button */}
          {(isTier1Unclaimed || isTier2Ready) ? (
            <Button 
              onClick={handleClaimBonus}
              disabled={claiming}
              className={`${
                isTier2Ready 
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400'
                  : 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400'
              } text-white font-bold w-full py-3 text-lg`}
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4 mr-2" />
                  Claim {rewardAmount} Now
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={() => {
                onOpenChange(false);
                navigate('/fantasy?tab=join');
              }}
              className={`${
                isTier2InProgress
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500'
              } text-white font-bold w-full py-3 text-lg`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isTier2InProgress ? 'Enter a Paid Round' : 'Join a Round'}
            </Button>
          )}

          {/* Fine print */}
          <div className="border-t border-gray-700 pt-3">
            <p className="text-xs text-gray-500">
              {status?.tier === 2 
                ? `Spend ${thresholdAmount} on paid entries to unlock ${rewardAmount} bonus. Promo balance valid for 30 days after claiming.`
                : `Promo balance is valid for 30 days after claiming. Can only be used on paid fantasy round entries. One welcome bonus per account.`
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOfferModal;
