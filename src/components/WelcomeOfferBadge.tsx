import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';
import { Gift, Clock, Sparkles, Info, DollarSign } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import WelcomeOfferModal from './WelcomeOfferModal';

const WelcomeOfferBadge: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { status, loading, displayState, progressPercent, daysRemaining, refetch, canClaimTier2 } = useWelcomeOffer();
  const [modalOpen, setModalOpen] = useState(false);

  // Refetch balance when payment success is detected
  useEffect(() => {
    if (searchParams.get('payment') === 'success') {
      refetch();
    }
  }, [searchParams, refetch]);

  if (loading || !status) {
    return null;
  }

  // Don't show if offer is completed (used up) and no active balance
  if (displayState === 'completed' || displayState === 'expired') {
    return null;
  }

  const formatPence = (pence: number) => {
    const dollars = pence / 100;
    return dollars % 1 === 0 ? `$${dollars.toFixed(0)}` : `$${dollars.toFixed(2)}`;
  };

  const InfoButton = () => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setModalOpen(true);
      }}
      className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
    >
      <Info className="w-2.5 h-2.5 text-white/70" />
    </button>
  );

  // Tier 1: Free welcome bonus (not claimed yet)
  if (displayState === 'progress' && status.tier === 1 && !status.offerClaimed) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-green-600/30 to-emerald-500/30 border border-green-500/50 rounded-full cursor-pointer hover:border-green-400/70 transition-colors animate-pulse"
                onClick={() => setModalOpen(true)}
              >
                <Gift className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-bold text-green-300">
                  Claim Free Entry
                </span>
                <InfoButton />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-theme-gray-dark border-green-500/30 max-w-xs">
              <div className="flex flex-col gap-1 p-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-white">Free Paid Entry!</span>
                </div>
                <p className="text-sm text-gray-300">
                  New users get 1 free paid round entry! Click to claim.
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <WelcomeOfferModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // Tier 2: Spend $5 get $10 offer (progress towards threshold or ready to claim)
  if (displayState === 'progress' && status.tier === 2 && !status.offerClaimed) {
    const spentAmount = formatPence(status.totalSpentPence);
    const thresholdAmount = formatPence(status.thresholdPence);
    
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className={`flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r ${
                  canClaimTier2 
                    ? 'from-yellow-600/30 to-orange-500/30 border-yellow-500/50 animate-pulse' 
                    : 'from-purple-600/30 to-blue-500/30 border-purple-500/50'
                } border rounded-full cursor-pointer hover:border-opacity-70 transition-colors`}
                onClick={() => setModalOpen(true)}
              >
                <DollarSign className={`w-3.5 h-3.5 ${canClaimTier2 ? 'text-yellow-400' : 'text-purple-400'}`} />
                <span className={`text-xs font-bold ${canClaimTier2 ? 'text-yellow-300' : 'text-purple-300'}`}>
                  {canClaimTier2 
                    ? `Claim ${formatPence(status.rewardPence)}!` 
                    : `Spend ${thresholdAmount} Get ${formatPence(status.rewardPence)}`
                  }
                </span>
                <InfoButton />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-theme-gray-dark border-purple-500/30 max-w-xs">
              <div className="flex flex-col gap-1 p-1">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-white">Spend {thresholdAmount} Get {formatPence(status.rewardPence)}!</span>
                </div>
                <p className="text-sm text-gray-300">
                  {canClaimTier2 
                    ? `You've spent ${thresholdAmount}! Click to claim your ${formatPence(status.rewardPence)} bonus.`
                    : `Spend ${thresholdAmount} on paid rounds to unlock ${formatPence(status.rewardPence)} bonus. Progress: ${spentAmount}/${thresholdAmount}`
                  }
                </p>
                {!canClaimTier2 && (
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <WelcomeOfferModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // Active promo balance state - show balance and link to join rounds
  if (displayState === 'active' && status.promoBalancePence > 0) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-green-600/30 to-emerald-500/30 border border-green-500/50 rounded-full cursor-pointer hover:border-green-400/70 transition-colors"
                onClick={() => setModalOpen(true)}
              >
                <Gift className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-bold text-green-300">
                  Free Entry
                </span>
                {daysRemaining !== null && (
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">{daysRemaining}d</span>
                  </div>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-theme-gray-dark border-green-500/30 max-w-xs">
              <div className="flex flex-col gap-1 p-1">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-400" />
                  <span className="font-semibold text-white">Promo Balance</span>
                </div>
                <p className="text-sm text-gray-300">
                  {formatPence(status.promoBalancePence)} available for paid entries. Click to join a round!
                </p>
                {daysRemaining !== null && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <WelcomeOfferModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  return null;
};

export default WelcomeOfferBadge;
