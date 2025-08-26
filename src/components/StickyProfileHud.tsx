import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, Zap } from 'lucide-react';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useProgress } from '@/hooks/useSupabaseData';
import { cn } from '@/lib/utils';

interface StickyProfileHudProps {
  onClick: () => void;
  className?: string;
}

export const StickyProfileHud: React.FC<StickyProfileHudProps> = ({ onClick, className }) => {
  const { user, isAuthenticated } = useAuthUser();
  const { xp, level, loading } = useProgress();

  if (!isAuthenticated || loading) {
    return null;
  }

  // Calculate XP progress
  const baseXPForLevel = 1000 + (level - 1) * 100;
  const currentLevelStart = level === 1 ? 0 : (level - 1) * 1000 + ((level - 1) * (level - 2) / 2) * 100;
  const currentLevelXP = xp - currentLevelStart;
  const xpProgress = Math.min((currentLevelXP / baseXPForLevel) * 100, 100);

  return (
    <Card 
      className={cn(
        "fixed bottom-4 right-4 z-40 bg-gradient-to-r from-[#1A1F26] to-[#252A32] border border-white/[0.08] cursor-pointer transition-all duration-300 hover:border-neon-blue/30 hover:shadow-[0_0_20px_rgba(79,172,254,0.2)] active:scale-95 hidden md:block",
        className
      )}
      onClick={onClick}
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
  );
};