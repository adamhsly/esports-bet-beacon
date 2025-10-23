import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Lock, User } from 'lucide-react';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface AvatarFrameSelectorProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string;
  currentFrameId?: string;
}

export const AvatarFrameSelector: React.FC<AvatarFrameSelectorProps> = ({
  isOpen,
  onOpenChange,
  currentAvatarUrl,
  currentFrameId
}) => {
  const { free, premium } = useRewardsTrack();
  const { updateAvatarFrame } = useProfile();

  // Get all unlocked frame rewards
  const availableFrames = useMemo(() => {
    const allFrames = [...free, ...premium].filter(
      item => item.type === 'frame' && item.state === 'unlocked'
    );
    
    // Add "no frame" option
    return [
      {
        id: 'none',
        level: 0,
        tier: 'free' as const,
        type: 'frame' as const,
        value: 'No Frame',
        assetUrl: '',
        state: 'unlocked' as const
      },
      ...allFrames
    ];
  }, [free, premium]);

  const handleFrameSelect = async (frameId: string) => {
    const success = await updateAvatarFrame(frameId === 'none' ? '' : frameId);
    if (success) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border border-border text-foreground max-w-2xl mx-auto rounded-xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-gaming text-foreground">
            Choose Avatar Frame
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-auto">
          {/* Current Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center overflow-hidden",
                  "bg-gradient-to-br from-neon-blue to-neon-purple"
                )}
              >
                {currentAvatarUrl ? (
                  <img 
                    src={currentAvatarUrl} 
                    alt="Current avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-foreground" />
                )}
              </div>
              
              {/* Current Frame Overlay */}
              {currentFrameId && currentFrameId !== 'none' && (
                <div className="absolute inset-0">
                  {availableFrames.find(f => f.id === currentFrameId)?.assetUrl && (
                    <img 
                      src={availableFrames.find(f => f.id === currentFrameId)?.assetUrl}
                      alt="Current frame"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Available Frames Grid */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-foreground text-center">
              Available Frames
            </h3>
            
            {availableFrames.length === 1 ? (
              <div className="text-center text-muted-foreground">
                <p>No avatar frames unlocked yet.</p>
                <p className="text-sm mt-1">Level up to unlock avatar frames!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {availableFrames.map((frame) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "relative p-3 rounded-xl border cursor-pointer transition-all duration-300",
                      "bg-surface border-border hover:border-primary/50",
                      currentFrameId === frame.id && "border-primary shadow-[0_0_12px_rgba(79,172,254,0.3)]"
                    )}
                    onClick={() => handleFrameSelect(frame.id)}
                  >
                    {/* Frame Preview */}
                    <div className="relative mx-auto w-16 h-16 mb-2">
                      <div 
                        className={cn(
                          "w-full h-full rounded-full flex items-center justify-center overflow-hidden",
                          "bg-gradient-to-br from-neon-blue to-neon-purple"
                        )}
                      >
                        {currentAvatarUrl ? (
                          <img 
                            src={currentAvatarUrl} 
                            alt="Avatar preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-foreground" />
                        )}
                      </div>
                      
                      {/* Frame Overlay */}
                      {frame.id !== 'none' && frame.assetUrl && (
                        <img 
                          src={frame.assetUrl}
                          alt={frame.value}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        />
                      )}
                    </div>

                    {/* Frame Info */}
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {frame.value}
                      </p>
                      
                      {frame.tier === 'premium' && (
                        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 text-xs">
                          Premium
                        </Badge>
                      )}
                    </div>

                    {/* Selected Indicator */}
                    {currentFrameId === frame.id && (
                      <CheckCircle className="absolute top-1 right-1 w-5 h-5 text-green-500 fill-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="border-border text-foreground hover:bg-muted"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};