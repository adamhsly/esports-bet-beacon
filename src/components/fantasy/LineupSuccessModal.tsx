import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Share2, TrendingUp, Download, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { renderShareCard } from '@/utils/shareCardRenderer';
import { useMobile } from '@/hooks/useMobile';

interface LineupSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  roundName: string;
  userId: string;
  starTeamName?: string;
  onCheckProgress: () => void;
}

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

  const handleSharePicks = async () => {
    setIsGenerating(true);
    
    try {
      const result = await renderShareCard(roundId, userId);
      setShareData(result);
      
      // Check if Web Share API supports files
      if (navigator.canShare?.({ files: [new File([result.blob], 'lineup.png', { type: 'image/png' })] })) {
        try {
          await navigator.share({
            title: 'My Fantasy Picks',
            text: `My ${roundName} picks${starTeamName ? ` — ⭐ ${starTeamName}` : ''}`,
            files: [new File([result.blob], 'lineup.png', { type: 'image/png' })],
            url: result.publicUrl
          });
          toast.success('Share card ready!');
        } catch (shareError) {
          if ((shareError as Error).name !== 'AbortError') {
            // If native share fails, show our custom share sheet
            setShowShareSheet(true);
          }
        }
      } else {
        // Show custom share sheet for browsers without file sharing support
        setShowShareSheet(true);
      }
      
      toast.success('Share card ready!');
    } catch (error) {
      console.error('Share card generation failed:', error);
      toast.error("Couldn't generate card, please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImage = () => {
    if (!shareData) return;
    
    const url = URL.createObjectURL(shareData.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy-lineup-${roundName.toLowerCase().replace(' ', '-')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Image saved!');
  };

  const handleCopyLink = async () => {
    if (!shareData) return;
    
    const shareUrl = `${window.location.origin}/lineup/${roundId}/${userId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const openSocialShare = (platform: string) => {
    if (!shareData) return;
    
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
    }
    
    if (url) {
      window.open(url, '_blank', 'width=600,height=400');
    }
  };

  const ModalContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold text-center">Good luck! 🎉</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-6 pt-4">
        <p className="text-center text-muted-foreground">
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
            className="w-full h-12"
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
        <SheetTitle>Share Your Picks</SheetTitle>
      </SheetHeader>
      
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleSaveImage} variant="outline" className="h-12">
            <Download className="w-4 h-4 mr-2" />
            Save Image
          </Button>
          
          <Button onClick={handleCopyLink} variant="outline" className="h-12">
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Quick Share:</p>
          
          <div className="grid grid-cols-3 gap-2">
            <Button 
              onClick={() => openSocialShare('twitter')} 
              variant="outline" 
              size="sm"
              className="h-10"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Twitter/X
            </Button>
            
            <Button 
              onClick={() => openSocialShare('facebook')} 
              variant="outline" 
              size="sm"
              className="h-10"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Facebook
            </Button>
            
            <Button 
              onClick={() => openSocialShare('whatsapp')} 
              variant="outline" 
              size="sm"
              className="h-10"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              WhatsApp
            </Button>
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
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
            <DialogTitle>Share Your Picks</DialogTitle>
          </DialogHeader>
          <ShareSheetContent />
        </DialogContent>
      </Dialog>
    </>
  );
};