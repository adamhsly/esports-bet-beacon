import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift, Clock, CheckCircle, Sparkles, Loader2, TrendingUp, Ticket, Mail, Play, Coins } from 'lucide-react';
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
import { useRoundReservation } from '@/hooks/useRoundReservation';
import { formatCurrency } from '@/utils/currencyUtils';
interface WelcomeOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoundOpened?: () => void;
}

interface PaidRound {
  id: string;
  status: string;
  round_name?: string;
  minimum_reservations?: number;
}

const WelcomeOfferModal: React.FC<WelcomeOfferModalProps> = ({ open, onOpenChange, onRoundOpened }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { status, daysRemaining, displayState, refetch, progressPercent, canClaimTier2 } = useWelcomeOffer();
  const [claiming, setClaiming] = useState(false);
  const [paidRound, setPaidRound] = useState<PaidRound | null>(null);
  const [reservationCount, setReservationCount] = useState(0);
  const [showReservationConfirm, setShowReservationConfirm] = useState(false);
  const [roundNeedsReservation, setRoundNeedsReservation] = useState(false);
  const [userHasReservation, setUserHasReservation] = useState(false);
  const [roundIsOpen, setRoundIsOpen] = useState(false);
  const { reserveSlot, getReservationCount, checkReservation } = useRoundReservation();
  
  // Fetch the next paid pro round and check if it needs reservations
  useEffect(() => {
    const fetchPaidRound = async () => {
      // First try to find a scheduled paid round (these need reservations to open)
      const { data: scheduledRound } = await supabase
        .from('fantasy_rounds')
        .select('id, status, round_name, minimum_reservations')
        .eq('is_paid', true)
        .eq('is_private', false)
        .eq('team_type', 'pro')
        .eq('status', 'scheduled')
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (scheduledRound) {
        // Check if this round still needs reservations
        const countData = await getReservationCount(scheduledRound.id);
        const hasReservation = await checkReservation(scheduledRound.id);
        const needsReservations = !countData.isOpen && countData.count < (scheduledRound.minimum_reservations || 35);
        
        setPaidRound(scheduledRound);
        setReservationCount(countData.count);
        setUserHasReservation(hasReservation);
        setRoundIsOpen(countData.isOpen);
        setRoundNeedsReservation(needsReservations);
        
        if (needsReservations || !countData.isOpen) {
          return;
        }
      }
      
      // Fallback: find any open paid round
      const { data: openRound } = await supabase
        .from('fantasy_rounds')
        .select('id, status, round_name, minimum_reservations')
        .eq('is_paid', true)
        .eq('is_private', false)
        .eq('team_type', 'pro')
        .eq('status', 'open')
        .order('start_date', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (openRound) {
        setPaidRound(openRound);
        setRoundNeedsReservation(false);
        setRoundIsOpen(true);
      }
    };
    
    if (open) {
      fetchPaidRound();
    }
  }, [open, getReservationCount, checkReservation]);
  
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
      // Check if this scheduled round needs reservations before it opens
      if (paidRound && roundNeedsReservation) {
        // Only reserve a ticket - bonus will be claimed on actual entry
        const result = await reserveSlot(paidRound.id);
        if (result?.success) {
          toast.success('Ticket reserved! Your free entry is saved for when the round opens.');
          setReservationCount(result.reservationCount);
          setShowReservationConfirm(true);
          
          // If the round just opened (hit threshold), notify parent to refresh
          if (result.isOpen) {
            onRoundOpened?.();
          }
        }
      } else {
        // Round is open - claim bonus and navigate to team picker
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
      }
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
  
  // Check if user has reserved but offer not yet claimed (waiting state)
  const hasReservedButNotClaimed = isTier1Unclaimed && userHasReservation && roundNeedsReservation && !roundIsOpen;

  // Handle closing the modal after reservation confirmation
  const handleCloseReservation = () => {
    setShowReservationConfirm(false);
    onOpenChange(false);
    navigate('/fantasy?tab=join');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) {
        setShowReservationConfirm(false);
      }
      onOpenChange(open);
    }}>
      <DialogContent className="bg-theme-gray-dark border-green-500/30 max-w-md">
        {showReservationConfirm ? (
          // Reservation confirmation view
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <Ticket className="w-5 h-5 text-green-400" />
                Ticket Reserved!
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">
                  You're In! 🎉
                </h3>
                <p className="text-sm text-gray-300 mb-3">
                  Your ticket is reserved for the next paid round. Your free entry will be applied when you submit your team picks.
                </p>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Reservations:</span>
                    <span className="text-white font-bold">{reservationCount} / {paidRound?.minimum_reservations || 35}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (reservationCount / (paidRound?.minimum_reservations || 35)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Free entry saved indicator */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-md p-3 flex items-center gap-3">
                <Gift className="w-5 h-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-sm text-purple-300 font-medium">Free Entry Saved</p>
                  <p className="text-xs text-gray-400">Your free entry will be used when you pick your teams</p>
                </div>
              </div>
              
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-md p-3">
                <p className="text-sm text-yellow-400 font-medium text-center">
                  📣 Once {paidRound?.minimum_reservations || 35} players reserve, the round opens and you can pick your teams!
                </p>
              </div>

              {/* Email notification info */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-xs text-gray-400">
                  We'll email you when the round opens for team submission.
                </p>
              </div>
              
              <Button 
                onClick={() => {
                  onOpenChange(false);
                  navigate('/fantasy');
                }}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3"
              >
                <Play className="w-4 h-4 mr-2" />
                Join a Free Round in the Meantime
              </Button>
            </div>
          </>
        ) : (
          // Main content view
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                {hasReservedButNotClaimed ? (
                  <Ticket className="w-5 h-5 text-green-400" />
                ) : status?.tier === 2 ? (
                  <Coins className="w-5 h-5 text-purple-400" />
                ) : (
                  <Gift className="w-5 h-5 text-green-400" />
                )}
                {hasReservedButNotClaimed ? 'Ticket Reserved!' : hasActiveBalance ? 'Promo Balance' : status?.tier === 2 ? 'Spend & Earn Bonus' : 'Free Paid Entry'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Hero section - different based on state */}
              {hasReservedButNotClaimed ? (
                <div className="bg-gradient-to-r from-green-600/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4 text-center">
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <h3 className="text-2xl font-bold text-white mb-1">
                    Ticket Reserved! 🎉
                  </h3>
                  <p className="text-sm text-gray-300">
                    Your free entry is saved for when the round opens
                  </p>
                </div>
              ) : hasActiveBalance ? (
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
              {isTier1Unclaimed && !hasReservedButNotClaimed && (
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

              {/* Waiting for threshold message - show when user has reserved but round not open */}
              {(hasReservedButNotClaimed || (hasActiveBalance && userHasReservation && roundNeedsReservation && !roundIsOpen)) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-md p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-gray-300">
                      Waiting for {paidRound?.minimum_reservations || 35} players to reserve. We'll email you when team submission opens!
                    </p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400">Reservations:</span>
                      <span className="text-white font-bold">{reservationCount} / {paidRound?.minimum_reservations || 35}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (reservationCount / (paidRound?.minimum_reservations || 35)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Button */}
              {hasReservedButNotClaimed ? (
                // User has reserved but offer not claimed - show play free rounds CTA
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate('/fantasy');
                  }}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3 text-lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play Free Rounds in the Meantime
                </Button>
              ) : (isTier1Unclaimed || isTier2Ready) ? (
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
                      {roundNeedsReservation && !userHasReservation ? 'Reserving...' : 'Claiming...'}
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      {isTier2Ready ? `Claim ${rewardAmount} Now` : 'Claim Free Entry'}
                    </>
                  )}
                </Button>
              ) : hasActiveBalance ? (
                // User has active balance - different CTAs based on reservation state
                roundIsOpen ? (
                  <Button 
                    onClick={() => {
                      onOpenChange(false);
                      navigate(paidRoundLink);
                    }}
                    className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold w-full py-3 text-lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Join Round
                  </Button>
                ) : userHasReservation ? (
                  <Button 
                    onClick={() => {
                      onOpenChange(false);
                      navigate('/fantasy');
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold w-full py-3 text-lg"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play Free Rounds in the Meantime
                  </Button>
                ) : (
                  <Button 
                    onClick={handleClaimBonus}
                    disabled={claiming}
                    className="bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-bold w-full py-3 text-lg"
                  >
                    {claiming ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reserving...
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4 mr-2" />
                        Reserve Ticket
                      </>
                    )}
                  </Button>
                )
              ) : (
                <Button 
                  onClick={() => {
                    onOpenChange(false);
                    navigate(paidRoundLink);
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

              {/* Fine print with urgency */}
              <div className="border-t border-gray-700 pt-3 space-y-2">
                <div className="bg-red-500/10 border border-red-500/30 rounded-md p-2">
                  <p className="text-xs text-red-400 font-medium text-center">
                    ⏰ {status?.tier === 2 
                      ? 'Bonus expires 30 days after claiming - use it or lose it!'
                      : 'Free entry expires 30 days after claiming - claim now to win prizes!'
                    }
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  {status?.tier === 2 
                    ? `Spend ${thresholdAmount} on paid entries to unlock ${rewardAmount} bonus.`
                    : `Claim your free entry and enter a paid round to compete for real prizes!`
                  }
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeOfferModal;
