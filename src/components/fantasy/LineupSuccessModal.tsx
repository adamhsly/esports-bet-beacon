// src/components/fantasy/LineupSuccessModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Share2, TrendingUp, Download, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { renderShareCard } from '@/utils/shareCardRenderer';
import { useMobile } from '@/hooks/useMobile';

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
      const result = await renderShareCard(roundId, userId);
      setShareData(result);

      // Missions (non-blocking)
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onShareLineup(roundId);
        MissionBus.onShareThisWeek();
      } catch (e) {
        console.warn('Mission share tracking failed', e);
      }

      // Native Web Share with file support
      const file = new File([result.blob], 'lineup.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            title: 'My Fantasy Picks',
            text: `My ${roundName} picks${starTeamName ? ` — ⭐ ${starTeamName}` : ''}`,
            files: [file],
            url: result.publicUrl
          });
          toast.success('Shared!');
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') return; // user canceled
          // Fall through to custom sheet
          console.log('Native share failed, opening custom sheet:', shareErr);
        }
      }

      // Custom share sheet (fallback)
      setShowShareSheet(true);
    } catch (err: any) {
      console.error('Share card generation failed:', err);
      toast.error(`Failed to generate share card: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImage = () => {
    if (!shareData) return;
    ensureFocused();

    const url = URL.createObjectURL(shareData.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy-lineup-${roundName.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Image saved!');
  };

  const handleCopyImage = async () => {
    if (!shareData) return;
    ensureFocused();

    try {
      if (navigator.clipboard && 'ClipboardItem' in window) {
        const item = new (window as any).ClipboardItem({ 'image/png': shareData.blob });
        await navigator.clipboard.write([item]);
        toast.success('Image copied to clipboard!');
      } else {
        handleSaveImage();
        toast.success('Image saved (clipboard not supported)');
      }

      // Missions on successful copy
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onShareLineup(roundId);
        MissionBus.onShareThisWeek();
      } catch (e) {
        console.warn('Mission share tracking failed', e);
      }
    } catch (error) {
      console.error('Failed to copy image:', error);
      toast.error('Failed to copy image');
    }
  };

  const handleCopyLink = async () => {
    if (!shareData) return;
    ensureFocused();

    const shareUrl = `${window.location.origin}/lineup/${roundId}/${userId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
      try {
        const { MissionBus } = await import('@/lib/missionBus');
        MissionBus.onShareLineup(roundId);
        MissionBus.onShareThisWeek();
      } catch (e) {
        console.warn('Mission share tracking failed', e);
      }
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const openSocialShare = (platform: string) => {
    if (!shareData) return;
    ensureFocused();

    const shareUrl = `${window.location.origin}/lineup/${roundId}/${userId}`;
    const text = `My ${roundName} picks${starTeamName ? ` — ⭐ ${starTeamName}` : ''}`;

    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`;
        break;
      case 'discord':
        navigator.clipboard
          .writeText(`${text}\n${shareUrl}\n\nImage: ${shareData.publicUrl}`)
          .then(() => toast.success('Discord share info copied! Paste in Discord.'))
          .catch(() => toast.error('Failed to copy Discord share info'));
        return;
      case 'reddit':
        url = `https://reddit.com/submit?title=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
        break;
      default:
        return;
    }

    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const ModalContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-center text-white">Good luck! 🚀</DialogTitle>
      </DialogHeader>

      <div className="space-y-6 pt-4">
        <p className="text-center text-white">
          Your lineup is locked in. Share your picks or check your live progress.
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleSharePicks}
            disabled={isGenerating}
            className="w-full bg-theme-purple hover:bg-theme-purple/90 h-12"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {isGenerating ? 'Preparing your share card...' : 'Share your picks'}
          </Button>

          <Button
            onClick={onCheckProgress}
            variant="outline"
            className="w-full h-12 text-white border-white/20 hover:bg-white/10"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Check your progress
          </Button>
        </div>
      </div>
    </>
  );

  const ShareSheetContent = () => (
    <>
      <SheetHeader>
        <SheetTitle className="text-white">Share Your Picks</SheetTitle>
      </SheetHeader>

      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleSaveImage} variant="outline" className="h-12">
            <Download className="w-4 h-4 mr-2" />
            Save Image
          </Button>

          <Button onClick={handleCopyImage} variant="outline" className="h-12">
            <Copy className="w-4 h-4 mr-2" />
            Copy Image
          </Button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-white">Share to Platforms:</p>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => openSocialShare('discord')} variant="outline" size="sm" className="h-10">
              <MessageSquare className="w-3 h-3 mr-1" />
              Discord
            </Button>

            <Button onClick={() => openSocialShare('reddit')} variant="outline" size="sm" className="h-10">
              <ExternalLink className="w-3 h-3 mr-1" />
              Reddit
            </Button>

            <Button onClick={() => openSocialShare('telegram')} variant="outline" size="sm" className="h-10">
              <ExternalLink className="w-3 h-3 mr-1" />
              Telegram
            </Button>

            <Button onClick={handleCopyLink} variant="outline" size="sm" className="h-10">
              <Copy className="w-3 h-3 mr-1" />
              Copy Link
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button onClick={() => openSocialShare('twitter')} variant="outline" size="sm" className="h-9">
              <ExternalLink className="w-3 h-3 mr-1" />
              Twitter/X
            </Button>

            <Button onClick={() => openSocialShare('facebook')} variant="outline" size="sm" className="h-9">
              <ExternalLink className="w-3 h-3 mr-1" />
              Facebook
            </Button>

            <Button onClick={() => openSocialShare('whatsapp')} variant="outline" size="sm" className="h-9">
              <ExternalLink className="w-3 h-3 mr-1" />
              WhatsApp
            </Button>
          </div>

          <p className="text-xs text-white mt-2">
            <strong>Instagram:</strong> Save the image then post manually.
          </p>
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" className="h-auto">
            <ModalContent />
          </SheetContent>
        </Sheet>

        <Sheet open={showShareSheet} onOpenChange={setShowShareSheet}>
          <SheetContent side="bottom" className="h-auto">
            <ShareSheetContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <ModalContent />
        </DialogContent>
      </Dialog>

      <Dialog open={showShareSheet} onOpenChange={setShowShareSheet}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
            <DialogTitle className="text-white">Share Your Picks</DialogTitle>
          </DialogHeader>
          <ShareSheetContent />
        </DialogContent>
      </Dialog>
    </>
  );
};
