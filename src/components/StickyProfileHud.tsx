import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { User, Zap, X } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProgress } from '@/hooks/useSupabaseData';
import { ProfilePage } from '@/components/GameProfileHud';
import { cn } from '@/lib/utils';

interface StickyProfileHudProps {
  className?: string;
}

export const StickyProfileHud: React.FC<StickyProfileHudProps> = ({ className }) => {
  const { user, isAuthenticated } = useAuthUser();
  const { xp, level, loading } = useProgress();
  const [isOpen, setIsOpen] = useState(false);

  // Handle URL-driven state
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const panel = params.get('panel');
    setIsOpen(panel === 'profile');
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const panel = params.get('panel');
      setIsOpen(panel === 'profile');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpen = () => {
    import('@/lib/missionBus').then(({ MissionBus }) => MissionBus.onOpenProfileSheet());
    
    const url = new URL(window.location.href);
    url.searchParams.set('panel', 'profile');
    window.history.pushState({}, '', url.toString());
    setIsOpen(true);
  };

  const handleClose = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('panel');
    const newUrl = url.toString();
    
    if (newUrl !== window.location.href) {
      window.history.pushState({}, '', newUrl);
    }
    setIsOpen(false);
  };

  if (!isAuthenticated || loading) {
    return null;
  }

  // Calculate XP progress
  const baseXPForLevel = 1000 + (level - 1) * 100;
  const currentLevelStart = level === 1 ? 0 : (level - 1) * 1000 + ((level - 1) * (level - 2) / 2) * 100;
  const currentLevelXP = xp - currentLevelStart;
  const xpProgress = Math.min((currentLevelXP / baseXPForLevel) * 100, 100);

  return (
    <>
      <Card 
        className={cn(
          "fixed bottom-4 right-4 z-40 bg-gradient-to-r from-[#1A1F26] to-[#252A32] border border-white/[0.08] cursor-pointer transition-all duration-300 hover:border-neon-blue/30 hover:shadow-[0_0_20px_rgba(79,172,254,0.2)] active:scale-95 hidden md:block",
          className
        )}
        onClick={handleOpen}
      >
        <div className="p-3 flex items-center gap-3">
          {/* Mini Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-full flex items-center justify-center text-sm font-gaming text-white shadow-[0_0_15px_rgba(79,172,254,0.3)]">
            {user?.email?.slice(0, 2).toUpperCase() || <User className="w-5 h-5" />}
          </div>

          {/* Level & XP */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-gaming text-white">Lv {level}</span>
              <Zap className="w-3 h-3 text-neon-blue" />
            </div>
            <Progress 
              value={xpProgress} 
              className="h-1.5 bg-[#0F1722] w-16"
            />
          </div>
        </div>
      </Card>

      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent 
          side="right" 
          className="w-full sm:max-w-lg bg-[#0B1220] border-[#223049] p-0 overflow-y-auto"
        >
          <SheetHeader className="sticky top-0 z-10 bg-[#0B1220] border-b border-[#223049] px-4 py-3">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-[#EAF2FF] font-gaming">Profile</SheetTitle>
              <button
                onClick={handleClose}
                className="text-[#CFE3FF] hover:text-[#EAF2FF] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </SheetHeader>
          
          <div className="flex-1">
            <ProfilePage variant="sheet" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};