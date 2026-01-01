import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users, Share2, Trophy, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useMobile } from '@/hooks/useMobile';
import { ShareSheet } from './ShareSheet';

interface ReservationConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundName: string;
  roundId: string;
  reservationCount: number;
  minimumReservations: number;
  onPlayFreeRounds: () => void;
}

export const ReservationConfirmModal: React.FC<ReservationConfirmModalProps> = ({
  open,
  onOpenChange,
  roundName,
  roundId,
  reservationCount,
  minimumReservations,
  onPlayFreeRounds,
}) => {
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareData, setShareData] = useState<{ publicUrl: string; blob: Blob } | null>(null);
  const isMobile = useMobile();
  
  const spotsNeeded = Math.max(0, minimumReservations - reservationCount);
  const progressPercent = Math.min(100, (reservationCount / minimumReservations) * 100);

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/fantasy?round=${roundId}`;
    const text = `🎮 Join me in the ${roundName} fantasy round! Reserve your ticket now and compete for real cash prizes. Only ${spotsNeeded} more players needed!`;

    // Try native Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${roundName}`,
          text: text,
          url: shareUrl
        });
        toast.success('Shared!');
        return;
      } catch (shareErr: any) {
        if (shareErr?.name === 'AbortError') {
          return;
        }
        // Fall through to show custom sheet
      }
    }

    // Create share data for the ShareSheet (text-based, no image)
    setShareData({
      publicUrl: shareUrl,
      blob: new Blob([text], { type: 'text/plain' })
    });
    setShowShareSheet(true);
  };

  const ModalContent = () => (
    <>
      <DialogHeader>
        <div className="flex items-center justify-center mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>
        <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
          Ticket Reserved!
        </DialogTitle>
        <DialogDescription className="text-center text-gray-300 space-y-4">
          <p className="text-base">
            You've reserved your spot for <span className="font-semibold text-white">{roundName}</span>
          </p>
          
          {/* Progress toward threshold */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Reserved
              </span>
              <span className="font-bold text-white">
                {reservationCount} / {minimumReservations}
              </span>
            </div>
            
            <div className="w-full bg-slate-600 rounded-full h-3 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            
            {spotsNeeded > 0 ? (
              <p className="text-sm text-amber-300">
                {spotsNeeded} more reservations needed to open the round!
              </p>
            ) : (
              <p className="text-sm text-emerald-300 flex items-center justify-center gap-2">
                <Trophy className="w-4 h-4" />
                Round is open! Payment will be collected at team submission.
              </p>
            )}
          </div>

          <p className="text-sm text-gray-400">
            Share with friends to help reach the minimum threshold. Once reached, you'll be notified and can pay & submit your teams!
          </p>
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 mt-4">
        <Button
          onClick={handleShare}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Friends
        </Button>
        
        <Button
          onClick={onPlayFreeRounds}
          variant="outline"
          className="w-full border-slate-600 text-gray-300 hover:bg-slate-700"
        >
          Play Free Rounds in the Meantime
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-auto bg-slate-800 border-slate-700">
            <ModalContent />
          </SheetContent>
        </Sheet>

        <ShareSheet
          isOpen={showShareSheet}
          onOpenChange={setShowShareSheet}
          shareData={shareData}
          roundName={roundName}
          roundId={roundId}
          isMobile={true}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
          <ModalContent />
        </DialogContent>
      </Dialog>

      <ShareSheet
        isOpen={showShareSheet}
        onOpenChange={setShowShareSheet}
        shareData={shareData}
        roundName={roundName}
        roundId={roundId}
        isMobile={false}
      />
    </>
  );
};
