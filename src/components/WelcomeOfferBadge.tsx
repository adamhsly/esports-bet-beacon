import React, { useState } from 'react';
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
  const { status, loading, displayState, progressPercent, daysRemaining } = useWelcomeOffer();
  const [modalOpen, setModalOpen] = useState(false);

  if (loading || !status) {
    return null;
  }

  // Don't show if offer is completed (used up) and no active balance
  if (displayState === 'completed' || displayState === 'expired') {
    return null;
  }

  const formatPence = (pence: number) => `$${(pence / 100).toFixed(0)}`;

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

  // Progress state - working toward unlocking
  if (displayState === 'progress' && !status.offerClaimed) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-600/20 to-yellow-500/20 border border-purple-500/30 rounded-full cursor-pointer hover:border-purple-400/50 transition-colors">
                <Gift className="w-3.5 h-3.5 text-yellow-400" />
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-white">
                    {formatPence(status.totalSpentPence)}
                  </span>
                  <span className="text-xs text-gray-400">/</span>
                  <span className="text-xs text-gray-400">
                    {formatPence(status.thresholdPence)}
                  </span>
                </div>
                {/* Progress bar - hidden on mobile */}
                <div className="hidden sm:block w-8 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-yellow-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <InfoButton />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-theme-gray-dark border-purple-500/30 max-w-xs">
              <div className="flex flex-col gap-1 p-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold text-white">Welcome Offer</span>
                </div>
                <p className="text-sm text-gray-300">
                  Spend {formatPence(status.thresholdPence)} on paid entries to unlock {formatPence(status.rewardPence)} promo balance!
                </p>
                <p className="text-xs text-gray-400">
                  Progress: {formatPence(status.totalSpentPence)} / {formatPence(status.thresholdPence)} ({progressPercent}%)
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <WelcomeOfferModal open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // Active promo balance state
  if (displayState === 'active' && status.promoBalancePence > 0) {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-green-600/30 to-emerald-500/30 border border-green-500/50 rounded-full cursor-pointer hover:border-green-400/70 transition-colors animate-pulse">
                <Gift className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-bold text-green-300">
                  {formatPence(status.promoBalancePence)}
                </span>
                {daysRemaining !== null && (
                  <div className="flex items-center gap-0.5 text-yellow-400">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs font-medium">{daysRemaining}d</span>
                  </div>
                )}
                <InfoButton />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="bg-theme-gray-dark border-green-500/30 max-w-xs">
              <div className="flex flex-col gap-1 p-1">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-green-400" />
                  <span className="font-semibold text-white">Promo Balance Active!</span>
                </div>
                <p className="text-sm text-gray-300">
                  You have {formatPence(status.promoBalancePence)} promo balance to use on paid entries.
                </p>
                {daysRemaining !== null && (
                  <p className="text-xs text-yellow-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Will be automatically applied at checkout.
                </p>
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