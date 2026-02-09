// src/components/fantasy/ShareSheet.tsx
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Download, Copy, ExternalLink, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

export interface ShareSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  shareData: { publicUrl: string; blob: Blob } | null;
  roundName: string;
  starTeamName?: string;
  roundId: string;
  isMobile?: boolean;
}

export const ShareSheet: React.FC<ShareSheetProps> = ({
  isOpen,
  onOpenChange,
  shareData,
  roundName,
  starTeamName,
  roundId,
  isMobile = false,
}) => {
  // Small helper to avoid "Document is not focused" on some browsers
  const ensureFocused = () => {
    try {
      if (typeof document !== 'undefined' && typeof document.hasFocus === 'function') {
        if (!document.hasFocus() && typeof window.focus === 'function') window.focus();
      }
    } catch {}
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

    const shareUrl = shareData.publicUrl;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Image link copied!');
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

    const shareUrl = shareData.publicUrl;
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
          .writeText(`${text}\n${shareUrl}`)
          .then(() => toast.success('Image URL copied! Paste in Discord.'))
          .catch(() => toast.error('Failed to copy'));
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

  const ShareSheetContent = () => (
    <>
      {!isMobile && (
        <DialogHeader>
          <DialogTitle className="text-white">Share Your Picks</DialogTitle>
        </DialogHeader>
      )}
      {isMobile && (
        <SheetHeader>
          <SheetTitle className="text-white">Share Your Picks</SheetTitle>
        </SheetHeader>
      )}

      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Button onClick={handleSaveImage} className="w-full justify-start text-white" variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Save Image
          </Button>

          <Button onClick={handleCopyImage} className="w-full justify-start text-white" variant="outline">
            <Copy className="mr-2 h-4 w-4" />
            Copy Image
          </Button>

          <Button onClick={handleCopyLink} className="w-full justify-start text-white" variant="outline">
            <ExternalLink className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
        </div>

        <div className="border-t pt-4 space-y-2">
          <p className="text-sm font-semibold text-white mb-2">Share to:</p>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => openSocialShare('twitter')}
              className="w-full justify-start text-white"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Twitter
            </Button>

            <Button
              onClick={() => openSocialShare('facebook')}
              className="w-full justify-start text-white"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Facebook
            </Button>

            <Button
              onClick={() => openSocialShare('reddit')}
              className="w-full justify-start text-white"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Reddit
            </Button>

            <Button
              onClick={() => openSocialShare('discord')}
              className="w-full justify-start text-white"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Discord
            </Button>

            <Button
              onClick={() => openSocialShare('whatsapp')}
              className="w-full justify-start text-white"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>

            <Button
              onClick={() => openSocialShare('telegram')}
              className="w-full justify-start text-white"
              variant="outline"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Telegram
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
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto bg-[#1a2332] border-t border-[#2a3a4a] rounded-t-xl">
          <ShareSheetContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#1a2332] border border-[#2a3a4a] rounded-xl">
        <ShareSheetContent />
      </DialogContent>
    </Dialog>
  );
};
