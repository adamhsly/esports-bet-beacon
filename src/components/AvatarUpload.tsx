import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Camera, User, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface AvatarUploadProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl?: string;
  avatarFrameUrl?: string;
}

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  isOpen,
  onOpenChange,
  currentAvatarUrl,
  avatarFrameUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, uploading } = useProfile();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const success = await uploadAvatar(file);
    if (success) {
      onOpenChange(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border border-border text-foreground max-w-md mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-gaming text-foreground">
            Upload Avatar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Avatar Preview */}
          <div className="flex justify-center">
            <div className="relative">
              <div 
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center overflow-hidden",
                  "bg-gradient-to-br from-neon-blue to-neon-purple shadow-[0_0_30px_rgba(79,172,254,0.3)]"
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
              
              {/* Avatar Frame Overlay */}
              {avatarFrameUrl && (
                <img 
                  src={avatarFrameUrl}
                  alt="Avatar frame"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
              )}
            </div>
          </div>

          {/* Upload Instructions */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-medium text-foreground">
              Choose a new avatar
            </h3>
            <p className="text-sm text-muted-foreground">
              Upload an image file (JPG, PNG, GIF) up to 5MB
            </p>
          </div>

          {/* Upload Button */}
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

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Upload Guidelines */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>• Recommended size: 256x256 pixels</p>
            <p>• Supported formats: JPG, PNG, GIF</p>
            <p>• Maximum file size: 5MB</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};