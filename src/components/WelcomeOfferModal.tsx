import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, CheckCircle, Sparkles, Loader2, TrendingUp, Mail, Play, Coins } from 'lucide-react';
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
import { formatCurrency } from '@/utils/currencyUtils';

interface WelcomeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoundOpened?: () => void;
}

interface PaidRound {
  id: string;
  status: string;
  start_date?: string;
  round_name?: string;
}

const WelcomeOfferModal: React.FC<WelcomeOfferModalProps> = ({ open, onOpenChange, onRoundOpened }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, daysRemaining, displayState, refetch, progressPercent, canClaimTier2 } = useWelcomeOffer();
  const [claiming, setClaiming] = useState(false);
  const [paidRound, setPaidRound] = useState<PaidRound | null>(null);
  const [paidRoundLoading, setPaidRoundLoading] = useState(false);
  
  // Fetch the next paid pro round
  useEffect(() => {
    let cancelled = false;

    const fetchPaidRound = async () => {
      setPaidRoundLoading(true);

      try {
        // Find any open paid pro round
        const { data: openRound } = await supabase
          .from('fantasy_rounds')
          .select('id, status, start_date, round_name')
          .eq('is_paid', true)
          .eq('is_private', false)
          .eq('team_type', 'pro')
          .eq('status', 'open')
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!cancelled && openRound) {
          setPaidRound(openRound);
        }
      } finally {
        if (!cancelled) setPaidRoundLoading(false);
      }
    };

    if (open) {
      fetchPaidRound();
    }

    return () => {
      cancelled = true;
    };
  }, [open, user?.id]);
  
  // Build the navigation link - go to paid pro round if available
  const paidRoundLink = paidRound 
    ? `/fantasy?roundId=${paidRound.id}` 
    : '/fantasy?tab=join';

  const rewardAmount = status?.rewardPence ? formatCurrency(status.rewardPence) : formatCurrency(1000);
  const thresholdAmount = status?.thresholdPence ? formatCurrency(status.thresholdPence) : formatCurrency(500);
  const spentAmount = status?.totalSpentPence ? formatCurrency(status.totalSpentPence) : formatCurrency(0);

  const handleClaimBonus = async () => {
    if (!user) {
      toast.error('Please sign in to claim your bonus');
      return;
    }

    setClaiming(true);
    try {
      // Claim bonus and navigate to team picker
      const { data, error } = await (supabase.rpc as any)('claim_welcome_bonus', { p_user_id: user.id });
      
      if (error) {
        console.error('Error claiming bonus:', error);
        toast.error(error.message || 'Failed to claim bonus');
        return;
      } else if (data?.success === false) {
        toast.error(data.error || 'Failed to claim bonus');
        return;
      }
      
      const tier = data?.tier ?? 1;
      const message = tier === 1 
        ? `${rewardAmount} claimed! Use your promo balance on paid rounds`
        : `${rewardAmount} bonus unlocked! You've earned it by spending ${thresholdAmount}`;
      toast.success(message);
      refetch();
      onOpenChange(false);
      navigate(paidRoundLink);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Something went wrong');
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
      <DialogContent className="bg-theme-gray-dark border-green-500/30 max-w-md z-[200]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            {status?.tier === 2 ? (
              <Coins className="w-5 h-5 text-purple-400" />
            ) : (
              <Gift className="w-5 h-5 text-green-400" />
            )}
            {hasActiveBalance ? 'Promo Balance' : status?.tier === 2 ? 'Spend & Earn Bonus' : 'Free Paid Entry'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Hero section - different based on state */}
          {hasActiveBalance ? (
            <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <h3 className="text-2xl font-bold text-white mb-1">
                Free Entry to Paid Round
              </h3>
              <p className="text-sm text-gray-300">
                Use your promo balance on paid fantasy entries
              </p>
              {daysRemaining !== null && (
                <div className="mt-2 space-y-1">
                  <p className={`text-sm font-bold flex items-center justify-center gap-1 ${daysRemaining <= 1 ? 'text-red-400' : 'text-yellow-400'}`}>
                    <Clock className="w-4 h-4" />
                    {daysRemaining === 0 ? 'EXPIRES TODAY!' : `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`}
                  </p>
                  <p className="text-xs text-red-400/80 font-medium">
                    ⚠️ Use it or lose it - don't miss out on prizes!
                  </p>
                </div>
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
                1 Free Paid Entry!
              </h3>
              <p className="text-sm text-gray-300">
                New users get a free entry to any paid fantasy round
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
                    <p className="text-sm text-white">Claim your free entry</p>
                    <p className="text-xs text-gray-400">Entry credit added to your promo balance</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-purple-300">2</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Enter a paid daily round</p>
                    <p className="text-xs text-gray-400">Your entry fee is covered automatically</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-yellow-300">3</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">Win prizes & unlock more!</p>
                    <p className="text-xs text-gray-400">Complete to unlock Spend $5 Get $10 offer</p>
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
          {paidRoundLoading ? (
            <Button
              disabled
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold w-full py-3 text-lg opacity-70"
            >
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </Button>
          ) : isTier1Unclaimed && paidRound ? (
            // Tier 1: go to team picker directly
            <Button
              onClick={handleClaimBonus}
              disabled={claiming}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold w-full py-3 text-lg"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Claim & Join Round
                </>
              )}
            </Button>
          ) : isTier2Ready ? (
            <Button
              onClick={handleClaimBonus}
              disabled={claiming}
              className="bg-gradient-to-r from-yellow-600 to-orange-500 hover:from-yellow-500 hover:to-orange-400 text-white font-bold w-full py-3 text-lg"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Coins className="w-4 h-4 mr-2" />
                  Claim {rewardAmount} Bonus
                </>
              )}
            </Button>
          ) : isTier2InProgress ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate(paidRoundLink);
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3 text-lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Enter Paid Round
            </Button>
          ) : hasActiveBalance && paidRound ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate(paidRoundLink);
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold w-full py-3 text-lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Use Free Entry Now
            </Button>
          ) : hasActiveBalance ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate('/fantasy?tab=join');
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold w-full py-3 text-lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Browse Paid Rounds
            </Button>
          ) : (
            <Button
              onClick={() => {
                onOpenChange(false);
                navigate('/fantasy?tab=join');
              }}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3 text-lg"
            >
              <Play className="w-4 h-4 mr-2" />
              Browse Rounds
            </Button>
          )}

          {/* Fine print */}
          <p className="text-xs text-gray-500 text-center">
            {status?.tier === 2 
              ? `Spend ${thresholdAmount} on paid entries to unlock ${rewardAmount} bonus. Valid for 30 days after claim.`
              : 'Promo balance valid for 30 days. Use on any paid fantasy round.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOfferModal;
