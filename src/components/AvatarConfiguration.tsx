// Unified avatar upload and frame configuration component
import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, User, Loader2, CheckCircle, Palette } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { cn } from '@/lib/utils';

interface AvatarConfigurationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string;
  currentFrameId?: string;
  avatarFrameUrl?: string;
}

export const AvatarConfiguration: React.FC<AvatarConfigurationProps> = ({
  isOpen,
  onOpenChange,
  currentAvatarUrl,
  currentFrameId,
  avatarFrameUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading, updateAvatarFrame } = useProfile();
  const { free, premium, currentLevel } = useRewardsTrack();
  const [previewFrameId, setPreviewFrameId] = useState(currentFrameId || '');
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(currentAvatarUrl);

  // Get all frame rewards (both unlocked and locked for preview)
  const frameRewards = useMemo(() => {
    const allFrames = [...free, ...premium].filter(item => item.type === 'frame');
    return allFrames.sort((a, b) => a.level - b.level);
  }, [free, premium]);

  // Get unlocked frame rewards only
  const availableFrames = useMemo(() => {
    const unlockedFrames = frameRewards.filter(item => item.state === 'unlocked');
    
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
      ...unlockedFrames
    ];
  }, [frameRewards]);

  // Get frame asset URL for preview
  const getFrameAssetUrl = (frameId: string) => {
    if (!frameId || frameId === 'none') return '';
    const frame = availableFrames.find(f => f.id === frameId);
    return frame?.assetUrl || '';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview URL for immediate feedback
    const previewUrl = URL.createObjectURL(file);
    setPreviewAvatarUrl(previewUrl);

    const success = await uploadAvatar(file);
    if (success) {
      // Keep the dialog open so users can also adjust frame if needed
      // onOpenChange(false);
    } else {
      // Reset preview on failure
      setPreviewAvatarUrl(currentAvatarUrl);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Clean up preview URL
    URL.revokeObjectURL(previewUrl);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFrameSelect = async (frameId: string) => {
    setPreviewFrameId(frameId);
    const success = await updateAvatarFrame(frameId === 'none' ? '' : frameId);
    if (!success) {
      // Reset preview on failure
      setPreviewFrameId(currentFrameId || '');
    }
  };

  const handleClose = () => {
    // Reset previews when closing
    setPreviewFrameId(currentFrameId || '');
    setPreviewAvatarUrl(currentAvatarUrl);
    onOpenChange(false);
  };

  const currentPreviewFrameUrl = getFrameAssetUrl(previewFrameId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-surface border border-border text-foreground max-w-2xl mx-auto rounded-xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-gaming text-foreground">
            Configure Avatar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4 overflow-auto">
          {/* Live Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center overflow-hidden",
                  "bg-gradient-to-br from-neon-blue to-neon-purple shadow-[0_0_30px_rgba(79,172,254,0.3)]"
                )}
              >
                {previewAvatarUrl ? (
                  <img 
                    src={previewAvatarUrl} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-foreground" />
                )}
              </div>
              
              {/* Frame Overlay */}
              {currentPreviewFrameUrl && (
                <img 
                  src={currentPreviewFrameUrl}
                  alt="Frame preview"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          </div>

          {/* Configuration Tabs */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Avatar Photo
              </TabsTrigger>
              <TabsTrigger value="frame" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Earned Frames
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4 mt-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-foreground">
                  Upload Your Profile Picture
                </h3>
                <p className="text-sm text-muted-foreground">
                  This is your personal avatar image that represents you. Upload an image file (JPG, PNG, GIF) up to 5MB.
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-gaming px-6 py-3 rounded-lg shadow-lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2 text-white" />
                      Choose Image
                    </>
                  )}
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="text-xs text-muted-foreground text-center space-y-1">
                <p>• Recommended size: 256x256 pixels</p>
                <p>• Supported formats: JPG, PNG, GIF</p>
                <p>• Maximum file size: 5MB</p>
              </div>
            </TabsContent>

            {/* Frame Tab */}
            <TabsContent value="frame" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-foreground">
                    Earned Avatar Frames
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    These decorative frames are unlocked by leveling up. Equip them to show off your progress!
                  </p>
                </div>

                {/* Debug info - temporarily show what's unlocked */}
                <div className="text-xs text-muted-foreground text-center p-2 bg-muted/50 rounded">
                  Level {currentLevel} • {frameRewards.filter(f => f.state === 'unlocked').length} frames unlocked
                </div>
                
                {frameRewards.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <p>No frame rewards available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Unlocked Frames */}
                    {availableFrames.length > 1 && (
                      <div>
                        <h4 className="text-sm font-medium text-foreground mb-3">Available to Use:</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {availableFrames.map((frame) => (
                            <div
                              key={frame.id}
                              className={cn(
                                "relative p-3 rounded-xl border cursor-pointer transition-all duration-300",
                                "bg-surface border-border hover:border-primary/50",
                                previewFrameId === frame.id && "border-primary shadow-[0_0_12px_rgba(79,172,254,0.3)]"
                              )}
                              onClick={() => handleFrameSelect(frame.id)}
                            >
                              {/* Frame Preview */}
                              <div className="relative mx-auto w-12 h-12 mb-2">
                                <div 
                                  className={cn(
                                    "w-full h-full rounded-full flex items-center justify-center overflow-hidden",
                                    "bg-gradient-to-br from-neon-blue to-neon-purple"
                                  )}
                                >
                                  {previewAvatarUrl ? (
                                    <img 
                                      src={previewAvatarUrl} 
                                      alt="Avatar preview" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-foreground" />
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
                                <p className="text-xs font-medium text-foreground mb-1">
                                  {frame.value}
                                </p>
                                {frame.level > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    L{frame.level}
                                  </Badge>
                                )}
                                {frame.tier === 'premium' && (
                                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                                    Premium
                                  </Badge>
                                )}
                              </div>

                              {/* Selected Indicator */}
                              {previewFrameId === frame.id && (
                                <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-primary" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Locked Frames Preview */}
                    {frameRewards.filter(f => f.state === 'locked').length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-3">Coming Soon:</h4>
                        <div className="grid grid-cols-3 gap-3">
                          {frameRewards.filter(f => f.state === 'locked').slice(0, 6).map((frame) => (
                            <div
                              key={frame.id}
                              className="relative p-3 rounded-xl border border-border bg-muted/30 opacity-60"
                            >
                              {/* Frame Preview */}
                              <div className="relative mx-auto w-12 h-12 mb-2">
                                <div 
                                  className={cn(
                                    "w-full h-full rounded-full flex items-center justify-center overflow-hidden",
                                    "bg-gradient-to-br from-muted to-muted-foreground/20"
                                  )}
                                >
                                  <User className="w-4 h-4 text-muted-foreground" />
                                </div>
                                
                                {/* Frame Overlay - greyed out */}
                                {frame.assetUrl && (
                                  <img 
                                    src={frame.assetUrl}
                                    alt={frame.value}
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none opacity-40 grayscale"
                                  />
                                )}
                              </div>

                              {/* Frame Info */}
                              <div className="text-center">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {frame.value}
                                </p>
                                <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                                  Level {frame.level}
                                </Badge>
                                {frame.tier === 'premium' && (
                                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs ml-1">
                                    Premium
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {availableFrames.length === 1 && frameRewards.filter(f => f.state === 'locked').length === 0 && (
                      <div className="text-center text-muted-foreground">
                        <p>No avatar frames available yet.</p>
                        <p className="text-sm mt-1">Keep leveling up to unlock decorative frames!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleClose}
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
