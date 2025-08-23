import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ProfilePage } from '@/components/GameProfileHud';
import { useMobile } from '@/hooks/useMobile';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface ProfileSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ isOpen, onOpenChange }) => {
  const isMobile = useMobile();

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[90vh] bg-[#0F1420] border-t-[#223049] rounded-t-2xl">
          <div className="flex-1 overflow-auto">
            <ProfilePage 
              variant="sheet"
              onUnlockPremium={() => {
                console.log('Navigate to premium checkout');
              }}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[820px] max-h-[88vh] overflow-auto bg-[#0F1420] border-[#223049] rounded-xl p-0">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>Profile</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>
        <ProfilePage 
          variant="sheet"
          onUnlockPremium={() => {
            console.log('Navigate to premium checkout');
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

// Hook for managing profile panel URL state
export const useProfilePanel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasProfilePanel = searchParams.get('panel') === 'profile';
    setIsOpen(hasProfilePanel);
  }, [searchParams]);

  const openProfile = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('panel', 'profile');
    setSearchParams(newParams);
  };

  const closeProfile = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('panel');
    setSearchParams(newParams);
  };

  return {
    isOpen,
    openProfile,
    closeProfile
  };
};