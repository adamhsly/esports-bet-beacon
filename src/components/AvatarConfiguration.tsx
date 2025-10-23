// Unified avatar upload and frame configuration component
import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, Camera, User, Loader2, CheckCircle, Palette, Hexagon } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useLevelRewardsTrack } from '@/hooks/useLevelRewardsTrack';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
  const { profile, uploadAvatar, uploading, updateAvatarFrame, updateAvatarBorder } = useProfile();
  const { user } = useAuth();
  const [userLevel, setUserLevel] = useState(1);
  
  // Fetch user level from user_progress
  useEffect(() => {
    if (!user) return;
    
    supabase
      .from('user_progress')
      .select('level')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setUserLevel(data.level);
      });
  }, [user]);
  
  const { free, premium, loading } = useLevelRewardsTrack(userLevel, profile?.premium_pass || false);
  const [previewFrameId, setPreviewFrameId] = useState(currentFrameId || '');
  const [previewBorderId, setPreviewBorderId] = useState(currentBorderId || '');
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState(currentAvatarUrl);

  // Get all frame rewards from level rewards
  const frameRewards = useMemo(() => {
    const allFrames = [...free, ...premium].filter(item => 
      item.reward_type === 'item' && item.item_code?.startsWith('frame_')
    );
    return allFrames.sort((a, b) => a.level - b.level);
  }, [free, premium]);

  // Get all border rewards from level rewards
  const borderRewards = useMemo(() => {
    const allBorders = [...free, ...premium].filter(item => 
      item.reward_type === 'item' && item.item_code?.startsWith('border_')
    );
    return allBorders.sort((a, b) => a.level - b.level);
  }, [free, premium]);

  // Get unlocked frame rewards only
  const availableFrames = useMemo(() => {
    const unlockedFrames = frameRewards.filter(item => item.unlocked);
    
    // Add "no frame" option
    return [
      {
        id: 'none',
        level: 0,
        track: 'free' as const,
        reward_type: 'item' as const,
        item_code: 'none',
        amount: null,
        assetUrl: '',
        unlocked: true
      },
      ...unlockedFrames
    ];
  }, [frameRewards]);

  // Get unlocked border rewards only
  const availableBorders = useMemo(() => {
    const unlockedBorders = borderRewards.filter(item => item.unlocked);
    
    // Add "no border" option
    return [
      {
        id: 'none',
        level: 0,
        track: 'free' as const,
        reward_type: 'item' as const,
        item_code: 'none',
        amount: null,
        assetUrl: '',
        unlocked: true
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
            <TabsList className="flex bg-gradient-to-br from-[#1e1e2a] to-[#2a2a3a] rounded-[10px] p-1 sm:p-1.5 gap-1 sm:gap-1.5">
              <TabsTrigger 
                value="upload" 
                className="flex-1 text-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg font-medium text-xs sm:text-sm text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-1 sm:gap-2"
              >
                <Camera className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Avatar Photo</span>
              </TabsTrigger>
              <TabsTrigger 
                value="frame" 
                className="flex-1 text-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg font-medium text-xs sm:text-sm text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-1 sm:gap-2"
              >
                <Palette className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Frames</span>
              </TabsTrigger>
              <TabsTrigger 
                value="border" 
                className="flex-1 text-center py-2 sm:py-2.5 px-1 sm:px-2 rounded-lg font-medium text-xs sm:text-sm text-[#d1d1d9] bg-white/[0.04] backdrop-blur-lg border border-white/[0.05] cursor-pointer transition-all duration-250 ease data-[state=active]:bg-gradient-to-br data-[state=active]:from-[#7a5cff] data-[state=active]:to-[#8e6fff] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(122,92,255,0.4)] data-[state=active]:font-semibold hover:bg-[#7a5cff]/15 hover:text-white flex items-center justify-center gap-1 sm:gap-2"
              >
                <Hexagon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Borders</span>
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
                  Level {userLevel} • {frameRewards.filter(f => f.unlocked).length} frames unlocked
                </div>
                
                {frameRewards.length === 0 ? (
                  <div className="text-center text-white/80 py-8">
                    <p className="text-sm">Level up to unlock more rewards</p>
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
                                    alt={frame.item_code || 'Frame'}
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                  />
                                )}
                              </div>

                              {/* Frame Info */}
                              <div className="text-center">
                                 <p className="text-xs font-medium text-white mb-1">
                                   {frame.item_code === 'none' ? 'No Frame' : frame.item_code}
                                 </p>
                                 {frame.level > 0 && (
                                   <Badge variant="secondary" className="text-xs">
                                     L{frame.level}
                                   </Badge>
                                 )}
                                 {frame.track === 'premium' && (
                                   <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                                     Premium
                                   </Badge>
                                 )}
                              </div>

                              {/* Selected Indicator */}
                              {previewFrameId === frame.id && (
                                <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-green-500 fill-green-500" />
                              )}
                            </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}


                    {availableFrames.length === 1 && frameRewards.filter(f => !f.unlocked).length === 0 && (
                      <div className="text-center text-white/80 py-8">
                        <p className="text-sm">Level up to unlock more rewards</p>
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
                  Level {userLevel} • {borderRewards.filter(b => b.unlocked).length} borders unlocked
                </div>
                
                {borderRewards.length === 0 ? (
                  <div className="text-center text-white/80 py-8">
                    <p className="text-sm">Level up to unlock more rewards</p>
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
                                 {border.id !== 'none' && getBorderAssetUrl(border.item_code || '') && (
                                   <div 
                                     className="absolute inset-0 w-full h-full bg-center bg-contain bg-no-repeat"
                                     style={{ backgroundImage: `url(${getBorderAssetUrl(border.item_code || '')})` }}
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
                                   {border.item_code === 'none' ? 'No Border' : border.item_code}
                                 </p>
                                 {border.level > 0 && (
                                   <Badge variant="secondary" className="text-xs">
                                     L{border.level}
                                   </Badge>
                                 )}
                                 {border.track === 'premium' && (
                                   <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-400/30 text-xs ml-1">
                                     Premium
                                   </Badge>
                                 )}
                              </div>

                              {/* Selected Indicator */}
                              {previewBorderId === border.id && (
                                <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-green-500 fill-green-500" />
                              )}
                            </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}


                    {availableBorders.length === 1 && borderRewards.filter(b => !b.unlocked).length === 0 && (
                      <div className="text-center text-white/80 py-8">
                        <p className="text-sm">Level up to unlock more rewards</p>
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
