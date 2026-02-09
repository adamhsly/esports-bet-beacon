// src/components/fantasy/LineupSuccessModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Share2, TrendingUp, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { renderShareCard } from '@/utils/shareCardRenderer';
import { useMobile } from '@/hooks/useMobile';
import { ShareSheet } from './ShareSheet';

export interface LineupSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  roundName: string;
  userId: string;
  starTeamName?: string;
  onCheckProgress: () => void;
}

// ✅ Named export to match `import { LineupSuccessModal } from './LineupSuccessModal'`
export const LineupSuccessModal: React.FC<LineupSuccessModalProps> = ({
  open,
  onOpenChange,
  roundId,
  roundName,
  userId,
  starTeamName,
  onCheckProgress
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareData, setShareData] = useState<{ publicUrl: string; blob: Blob } | null>(null);
  const isMobile = useMobile();

  // Small helper to avoid "Document is not focused" on some browsers
  const ensureFocused = () => {
    try {
      if (typeof document !== 'undefined' && typeof document.hasFocus === 'function') {
        if (!document.hasFocus() && typeof window.focus === 'function') window.focus();
      }
    } catch {}
  };

  const handleSharePicks = async () => {
    ensureFocused();
    setIsGenerating(true);

    try {
      // Generate share card FIRST to get the direct image URL
      const result = await renderShareCard(roundId, userId);
      setShareData(result);

      const shareUrl = result.publicUrl; // Direct image URL
      const text = `My ${roundName} picks${starTeamName ? ` — ⭐ ${starTeamName}` : ''}`;

      // Track missions
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onShareLineup(roundId);
        MissionBus.onShareThisWeek();
        MissionBus.onM2_Share();
      } catch (e) {
        console.warn('Mission share tracking failed', e);
      }

      // Try native Web Share API with direct image URL
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'My Fantasy Picks',
            text: text,
            url: shareUrl
          });
          
          toast.success('Shared!');
          setIsGenerating(false);
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            setIsGenerating(false);
            return;
          }
          // Fall through to show custom sheet
        }
      }

      // Show custom share sheet
      setShowShareSheet(true);
    } catch (err: any) {
      console.error('Share card generation failed:', err);
      toast.error(`Failed to generate share card: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const ModalContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-white">Success! 🎉</DialogTitle>
      </DialogHeader>
      <div className="text-center space-y-4 py-6">
        <div className="flex justify-center">
          <Trophy className="h-16 w-16 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Your Lineup is Locked In!</h3>
          <p className="text-gray-400">Good luck and may the best teams win!</p>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleSharePicks} disabled={isGenerating} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)] transition-all">
            <Share2 className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generating...' : 'Share Your Picks'}
          </Button>
          <Button
            onClick={() => {
              onCheckProgress();
              onOpenChange(false);
            }}
            className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium rounded-lg"
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Check Progress
          </Button>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-auto bg-[#1a2332] border-t border-[#2a3a4a] rounded-t-xl">
            <ModalContent />
          </SheetContent>
        </Sheet>

        <ShareSheet
          isOpen={showShareSheet}
          onOpenChange={setShowShareSheet}
          shareData={shareData}
          roundName={roundName}
          starTeamName={starTeamName}
          roundId={roundId}
          isMobile={true}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-[#1a2332] border border-[#2a3a4a] rounded-xl">
          <ModalContent />
        </DialogContent>
      </Dialog>

      <ShareSheet
        isOpen={showShareSheet}
        onOpenChange={setShowShareSheet}
        shareData={shareData}
        roundName={roundName}
        starTeamName={starTeamName}
        roundId={roundId}
        isMobile={false}
      />
    </>
  );
};
