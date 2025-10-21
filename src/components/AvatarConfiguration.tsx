// Unified avatar upload and frame configuration component
import React, { useRef, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, User, Loader2, CheckCircle, Palette, Hexagon } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useRewardsTrack } from '@/hooks/useRewardsTrack';
import { resolveAvatarFrameAsset } from "@/utils/avatarFrames";
import { resolveAvatarBorderAsset } from "@/utils/avatarBorders";
import { cn } from '@/lib/utils';

interface AvatarConfigurationProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string;
  currentFrameId?: string;
  currentBorderId?: string;
  avatarFrameUrl?: string;
  avatarBorderUrl?: string;
}

export const AvatarConfiguration: React.FC<AvatarConfigurationProps> = ({
  isOpen,
  onOpenChange,
  currentAvatarUrl,
  currentFrameId,
  currentBorderId,
  avatarFrameUrl,
  avatarBorderUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading, updateAvatarFrame, updateAvatarBorder } = useProfile();
  const { free, premium, currentLevel } = useRewardsTrack();
  const [previewFrameId, setPreviewFrameId] = useState(currentFrameId || '');
  const [previewBorderId, setPreviewBorderId] = useState(currentBorderId || '');
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(currentAvatarUrl);

  // Get all frame rewards (both unlocked and locked for preview)
  const frameRewards = useMemo(() => {
    const allFrames = [...free, ...premium].filter(item => item.type === 'frame');
    return allFrames.sort((a, b) => a.level - b.level);
  }, [free, premium]);

  // Get all border rewards (both unlocked and locked for preview)
  const borderRewards = useMemo(() => {
    const allBorders = [...free, ...premium].filter(item => 
      item.value && 
      (item.value.toLowerCase().includes('border') || 
       item.value.toLowerCase().includes('pulse'))
    );
    return allBorders.sort((a, b) => a.level - b.level);
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

  // Get unlocked border rewards only
  const availableBorders = useMemo(() => {
    const unlockedBorders = borderRewards.filter(item => item.state === 'unlocked');
    
    // Add "no border" option
    return [
      {
        id: 'none',
        level: 0,
        tier: 'free' as const,
        type: 'item' as const,
        value: 'No Border',
        assetUrl: '',
        state: 'unlocked' as const
      },
      ...unlockedBorders
    ];
  }, [borderRewards]);

  // Get frame asset URL for preview
  const getFrameAssetUrl = (frameId: string) => {
    if (!frameId || frameId === 'none') return '';
    return resolveAvatarFrameAsset(frameId) || '';
  };

  // Get border asset URL for preview
  const getBorderAssetUrl = (borderId: string) => {
    if (!borderId || borderId === 'none') return '';
    return resolveAvatarBorderAsset(borderId) || '';
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

  const handleBorderSelect = async (borderId: string) => {
    setPreviewBorderId(borderId);
    const success = await updateAvatarBorder(borderId === 'none' ? '' : borderId);
    if (!success) {
      // Reset preview on failure
      setPreviewBorderId(currentBorderId || '');
    }
  };

  const handleClose = () => {
    // Reset previews when closing
    setPreviewFrameId(currentFrameId || '');
    setPreviewBorderId(currentBorderId || '');
    setPreviewAvatarUrl(currentAvatarUrl);
    onOpenChange(false);
  };

  const currentPreviewFrameUrl = getFrameAssetUrl(previewFrameId);
  const currentPreviewBorderUrl = getBorderAssetUrl(previewBorderId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0F1420] border border-border text-white max-w-2xl mx-auto rounded-xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-gaming text-white">
            Configure Avatar
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[calc(85vh-6rem)]">
          <div className="space-y-6 py-4 px-1">
          {/* Live Preview */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Border container */}
              {currentPreviewBorderUrl && (
                <div 
                  className="absolute inset-0 w-28 h-28 -m-2 bg-center bg-contain bg-no-repeat"
                  style={{ backgroundImage: `url(${currentPreviewBorderUrl})`, zIndex: 0 }}
                />
              )}
              
              <div 
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center overflow-hidden relative",
                  "bg-gradient-to-br from-neon-blue to-neon-purple shadow-[0_0_30px_rgba(79,172,254,0.3)]"
                )}
                style={{ zIndex: 1 }}
              >
                {previewAvatarUrl ? (
                  <img 
                    src={previewAvatarUrl} 
                    alt="Avatar preview" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-white" />
                )}
              </div>
              
              {/* Frame Overlay */}
              {currentPreviewFrameUrl && (
                <img 
                  src={currentPreviewFrameUrl}
                  alt="Frame preview"
                  className="absolute inset-0 w-24 h-24 object-cover pointer-events-none"
                  style={{ zIndex: 2 }}
                />
              )}
            </div>
          </div>

          {/* Configuration Tabs */}
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-muted">
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Avatar Photo
              </TabsTrigger>
              <TabsTrigger value="frame" className="flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Earned Frames
              </TabsTrigger>
              <TabsTrigger value="border" className="flex items-center gap-2">
                <Hexagon className="w-4 h-4" />
                Avatar Borders
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value="upload" className="space-y-4 mt-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-white">
                  Upload Your Profile Picture
                </h3>
                <p className="text-sm text-white/80">
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

              <div className="text-xs text-white/80 text-center space-y-1">
                <p>• Recommended size: 256x256 pixels</p>
                <p>• Supported formats: JPG, PNG, GIF</p>
                <p>• Maximum file size: 5MB</p>
              </div>
            </TabsContent>

            {/* Frame Tab */}
            <TabsContent value="frame" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-white">
                    Earned Avatar Frames
                  </h3>
                  <p className="text-sm text-white/80">
                    These decorative frames overlay on your avatar. Unlock more by leveling up!
                  </p>
                </div>

                {/* Debug info - temporarily show what's unlocked */}
                <div className="text-xs text-white/80 text-center p-2 bg-muted/50 rounded">
                  Level {currentLevel} • {frameRewards.filter(f => f.state === 'unlocked').length} frames unlocked
                </div>
                
                {frameRewards.length === 0 ? (
                  <div className="text-center text-white/80">
                    <p>No frame rewards available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Unlocked Frames */}
                    {availableFrames.length > 1 && (
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Available to Use:</h4>
                        <ScrollArea className="max-h-64">
                          <div className="grid grid-cols-3 gap-3 pr-3">
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
                                    <User className="w-4 h-4 text-white" />
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
                                <p className="text-xs font-medium text-white mb-1">
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
                        </ScrollArea>
                      </div>
                    )}

                    {/* Locked Frames Preview */}
                    {frameRewards.filter(f => f.state === 'locked').length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-white/80 mb-3">Coming Soon:</h4>
                        <ScrollArea className="max-h-48">
                          <div className="grid grid-cols-3 gap-3 pr-3">
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
                                  <User className="w-4 h-4 text-white/60" />
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
                                <p className="text-xs font-medium text-white/60 mb-1">
                                  {frame.value}
                                </p>
                                <Badge variant="outline" className="text-xs border-white/30 text-white/60">
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
                        </ScrollArea>
                      </div>
                    )}

                    {availableFrames.length === 1 && frameRewards.filter(f => f.state === 'locked').length === 0 && (
                      <div className="text-center text-white/80">
                        <p>No avatar frames available yet.</p>
                        <p className="text-sm mt-1">Keep leveling up to unlock decorative frames!</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Border Tab */}
            <TabsContent value="border" className="space-y-4 mt-6">
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-white">
                    Avatar Borders
                  </h3>
                  <p className="text-sm text-white/80">
                    These decorative borders appear around your avatar. Unlock more by leveling up!
                  </p>
                </div>

                {/* Debug info - temporarily show what's unlocked */}
                <div className="text-xs text-white/80 text-center p-2 bg-muted/50 rounded">
                  Level {currentLevel} • {borderRewards.filter(b => b.state === 'unlocked').length} borders unlocked
                </div>
                
                {borderRewards.length === 0 ? (
                  <div className="text-center text-white/80">
                    <p>No border rewards available.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Unlocked Borders */}
                    {availableBorders.length > 1 && (
                      <div>
                        <h4 className="text-sm font-medium text-white mb-3">Available to Use:</h4>
                        <ScrollArea className="max-h-64">
                          <div className="grid grid-cols-3 gap-3 pr-3">
                            {availableBorders.map((border) => (
                            <div
                              key={border.id}
                              className={cn(
                                "relative p-3 rounded-xl border cursor-pointer transition-all duration-300",
                                "bg-surface border-border hover:border-primary/50",
                                previewBorderId === border.id && "border-primary shadow-[0_0_12px_rgba(79,172,254,0.3)]"
                              )}
                              onClick={() => handleBorderSelect(border.id)}
                            >
                              {/* Border Preview */}
                              <div className="relative mx-auto w-16 h-16 mb-2 flex items-center justify-center">
                                {border.id !== 'none' && getBorderAssetUrl(border.value || '') && (
                                  <div 
                                    className="absolute inset-0 w-full h-full bg-center bg-contain bg-no-repeat"
                                    style={{ backgroundImage: `url(${getBorderAssetUrl(border.value || '')})` }}
                                  />
                                )}
                                
                                <div 
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden",
                                    "bg-gradient-to-br from-neon-blue to-neon-purple relative"
                                  )}
                                  style={{ zIndex: 1 }}
                                >
                                  {previewAvatarUrl ? (
                                    <img 
                                      src={previewAvatarUrl} 
                                      alt="Avatar preview" 
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-4 h-4 text-white" />
                                  )}
                                </div>
                              </div>

                              {/* Border Info */}
                              <div className="text-center">
                                <p className="text-xs font-medium text-white mb-1">
                                  {border.value}
                                </p>
                                {border.level > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    L{border.level}
                                  </Badge>
                                )}
                                {border.tier === 'premium' && (
                                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                                    Premium
                                  </Badge>
                                )}
                              </div>

                              {/* Selected Indicator */}
                              {previewBorderId === border.id && (
                                <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-primary" />
                              )}
                            </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {/* Locked Borders Preview */}
                    {borderRewards.filter(b => b.state === 'locked').length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-white/80 mb-3">Coming Soon:</h4>
                        <ScrollArea className="max-h-48">
                          <div className="grid grid-cols-3 gap-3 pr-3">
                            {borderRewards.filter(b => b.state === 'locked').slice(0, 6).map((border) => (
                            <div
                              key={border.id}
                              className="relative p-3 rounded-xl border border-border bg-muted/30 opacity-60"
                            >
                              {/* Border Preview */}
                              <div className="relative mx-auto w-16 h-16 mb-2 flex items-center justify-center">
                                {getBorderAssetUrl(border.value || '') && (
                                  <div 
                                    className="absolute inset-0 w-full h-full bg-center bg-contain bg-no-repeat opacity-40 grayscale"
                                    style={{ backgroundImage: `url(${getBorderAssetUrl(border.value || '')})` }}
                                  />
                                )}
                                
                                <div 
                                  className={cn(
                                    "w-10 h-10 rounded-full flex items-center justify-center overflow-hidden",
                                    "bg-gradient-to-br from-muted to-muted-foreground/20 relative"
                                  )}
                                  style={{ zIndex: 1 }}
                                >
                                  <User className="w-4 h-4 text-white/60" />
                                </div>
                              </div>

                              {/* Border Info */}
                              <div className="text-center">
                                <p className="text-xs font-medium text-white/60 mb-1">
                                  {border.value}
                                </p>
                                <Badge variant="outline" className="text-xs border-white/30 text-white/60">
                                  Level {border.level}
                                </Badge>
                                {border.tier === 'premium' && (
                                  <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30 text-xs ml-1">
                                    Premium
                                  </Badge>
                                )}
                              </div>
                            </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}

                    {availableBorders.length === 1 && borderRewards.filter(b => b.state === 'locked').length === 0 && (
                      <div className="text-center text-white/80">
                        <p>No avatar borders available yet.</p>
                        <p className="text-sm mt-1">Keep leveling up to unlock decorative borders!</p>
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
              className="border-border text-white hover:bg-muted"
            >
              Done
            </Button>
          </div>
        </div>
      </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
