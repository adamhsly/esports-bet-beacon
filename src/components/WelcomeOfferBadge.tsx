import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWelcomeOffer } from '@/hooks/useWelcomeOffer';
import { Gift, Clock, Sparkles, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import WelcomeOfferModal from './WelcomeOfferModal';

const WelcomeOfferBadge: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { status, loading, displayState, progressPercent, daysRemaining, refetch } = useWelcomeOffer();
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

  // Welcome bonus state - new users get free $10
  if (displayState === 'progress' && !status.offerClaimed) {
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
                  Claim {formatPence(status.rewardPence)} Free!
                </span>
                <InfoButton />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-theme-gray-dark border-green-500/30 max-w-xs">
              <div className="flex flex-col gap-1 p-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-white">Welcome Bonus!</span>
                </div>
                <p className="text-sm text-gray-300">
                  New users get {formatPence(status.rewardPence)} promo balance free! Click to claim.
                </p>
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
                  {formatPence(status.promoBalancePence)} Balance
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